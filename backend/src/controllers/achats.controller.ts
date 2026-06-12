import { type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import pool from '../config/db.js';
import { notFound, badRequest, forbidden } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../middlewares/response.middleware.js';
import { logAction } from '../config/audit.js';

// -----------------------------------------------------------
// SIMULATION MOMO
// En production, remplacer par l'appel à l'API MTN MoMo
// -----------------------------------------------------------
const simulerPaiementMomo = async (montant: number, telephone: string): Promise<{
  success: boolean;
  reference: string;
}> => {
  // Simulation — en production c'est un appel HTTP vers l'API MoMo
  await new Promise(resolve => setTimeout(resolve, 1000)); // simule latence réseau
  return {
    success: true,
    reference: `MOMO-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  };
};

// -----------------------------------------------------------
// POST /api/v1/achats
// Acheter un ticket pour un événement
// -----------------------------------------------------------
export const acheterTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { idTicket, telephone } = req.body;

    if (!idTicket || !telephone) {
      return next(badRequest('idTicket et telephone sont obligatoires'));
    }

    // Récupérer le ticket + infos événement
    const [ticketRows]: any = await pool.query(
      `SELECT t.*, tt.nomType, f.designation, f.dateEvenement,
              f.typeEvenement, f.typeFiche
       FROM tickets t
       JOIN type_tickets tt ON t.codeType = tt.codeType
       JOIN fiches f ON t.idFiche = f.idFiche
       WHERE t.idTicket = ?`,
      [idTicket]
    );

    if (ticketRows.length === 0) return next(notFound('Ticket introuvable'));

    const ticket = ticketRows[0];

    // Vérifier que c'est bien un événement
    if (ticket.typeFiche !== 'Événement') {
      return next(badRequest('Les tickets sont uniquement disponibles pour les événements'));
    }

    // Récupérer les infos du visiteur
    const [visiteurRows]: any = await pool.query(
      'SELECT nom, prenom, emailUser FROM utilisateurs WHERE idUser = ?',
      [req.user!.idUser]
    );
    const visiteur = visiteurRows[0];

    // Simuler le paiement MoMo
    const paiement = await simulerPaiementMomo(ticket.prix, telephone);

    if (!paiement.success) {
      return next(badRequest('Paiement échoué. Veuillez réessayer'));
    }

    // Générer le contenu du QR Code
    const qrData = JSON.stringify({
      idAchat:       '', // sera rempli après insertion
      visiteur:      `${visiteur.prenom} ${visiteur.nom}`,
      evenement:     ticket.designation,
      dateEvenement: ticket.dateEvenement,
      typeTicket:    ticket.nomType,
      montant:       ticket.prix,
      reference:     paiement.reference,
    });

    // Générer le QR Code en base64
    const qrCodeBase64 = await QRCode.toDataURL(qrData);

    const idAchat = uuidv4();

    // Sauvegarder l'achat
    await pool.query(
      `INSERT INTO achats
        (idAchat, idTicket, idVisiteur, montant, statutPaiement, referenceMomo, codeQR)
       VALUES (?, ?, ?, ?, 'Payé', ?, ?)`,
      [idAchat, idTicket, req.user!.idUser, ticket.prix, paiement.reference, qrCodeBase64]
    );

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Création',
      details: {
        idAchat,
        evenement: ticket.designation,
        montant: ticket.prix,
        reference: paiement.reference,
      },
    });

    sendSuccess(res, {
      idAchat,
      evenement:     ticket.designation,
      dateEvenement: ticket.dateEvenement,
      typeTicket:    ticket.nomType,
      montant:       ticket.prix,
      referenceMomo: paiement.reference,
      statutPaiement: 'Payé',
      qrCode:        qrCodeBase64, // frontend affiche le QR Code depuis ce base64
    }, 'Ticket acheté avec succès', 201);

  } catch (error) { next(error); }
};

// -----------------------------------------------------------
// GET /api/v1/achats/:idAchat/pdf
// Télécharger le PDF du ticket avec QR Code
// -----------------------------------------------------------
export const telechargerTicketPDF = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { idAchat } = req.params;

    const [rows]: any = await pool.query(
      `SELECT a.*, tt.nomType, f.designation, f.dateEvenement,
              f.organisateur, u.nom, u.prenom, u.emailUser
       FROM achats a
       JOIN tickets t   ON a.idTicket   = t.idTicket
       JOIN type_tickets tt ON t.codeType = tt.codeType
       JOIN fiches f    ON t.idFiche    = f.idFiche
       JOIN utilisateurs u ON a.idVisiteur = u.idUser
       WHERE a.idAchat = ?`,
      [idAchat]
    );

    if (rows.length === 0) return next(notFound('Achat introuvable'));

    const achat = rows[0];

    // Vérifier que c'est bien le bon visiteur
    if (req.user!.role === 'Visiteur' && achat.idVisiteur !== req.user!.idUser) {
      return next(forbidden('Accès refusé'));
    }

    // Générer le PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="ticket_${idAchat}.pdf"`);

    doc.pipe(res);

    // ── En-tête ──────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 120).fill('#1F5C2E');

    doc.fontSize(22).fillColor('#FFFFFF')
       .text('SGRP — Ticket d\'Entrée', 50, 35, { align: 'center' });

    doc.fontSize(12).fillColor('#CCFFCC')
       .text('Ministère du Tourisme, de la Culture et des Arts — Bénin', 50, 65, { align: 'center' });

    // ── Infos événement ──────────────────────────────────
    doc.moveDown(3).fontSize(18).fillColor('#1F5C2E')
       .text(achat.designation, { align: 'center' });

    doc.moveDown(0.5).fontSize(11).fillColor('#333333');

    const infoY = doc.y;

    // Colonne gauche
    doc.text(`Type de ticket : ${achat.nomType}`, 50, infoY)
       .text(`Montant payé : ${achat.montant} FCFA`, 50)
       .text(`Référence MoMo : ${achat.referenceMomo}`, 50)
       .text(`Date d'achat : ${new Date(achat.date_achat).toLocaleDateString('fr-FR')}`, 50);

    // Colonne droite
    doc.text(`Visiteur : ${achat.prenom} ${achat.nom}`, 320, infoY)
       .text(`Email : ${achat.emailUser}`, 320)
       .text(`Organisateur : ${achat.organisateur || '—'}`, 320)
       .text(`Date événement : ${achat.dateEvenement
         ? new Date(achat.dateEvenement).toLocaleDateString('fr-FR')
         : '—'}`, 320);

    // ── QR Code ──────────────────────────────────────────
    doc.moveDown(2);

    // Convertir base64 en buffer pour PDFKit
    const qrBase64 = achat.codeQR.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(qrBase64, 'base64');

    doc.image(qrBuffer, (doc.page.width / 2) - 75, doc.y, {
      width: 150,
      height: 150,
    });

    doc.moveDown(8).fontSize(9).fillColor('#999999')
       .text('Ce QR Code sera scanné à l\'entrée de l\'événement.', { align: 'center' })
       .text(`ID Achat : ${idAchat}`, { align: 'center' });

    // ── Pied de page ─────────────────────────────────────
    doc.fontSize(8).fillColor('#CCCCCC')
       .text(
         'SECBEDXI Oswald · SOGOE Bryan · DSI — MTCA Bénin 2025-2026',
         50, doc.page.height - 50,
         { align: 'center' }
       );

    doc.end();

  } catch (error) { next(error); }
};

// -----------------------------------------------------------
// GET /api/v1/achats/mes-achats
// Historique des achats du visiteur connecté
// -----------------------------------------------------------
export const getMesAchats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [rows]: any = await pool.query(
      `SELECT a.idAchat, a.montant, a.statutPaiement, a.referenceMomo,
              a.date_achat, tt.nomType, f.designation, f.dateEvenement
       FROM achats a
       JOIN tickets t      ON a.idTicket   = t.idTicket
       JOIN type_tickets tt ON t.codeType  = tt.codeType
       JOIN fiches f        ON t.idFiche   = f.idFiche
       WHERE a.idVisiteur = ?
       ORDER BY a.date_achat DESC`,
      [req.user!.idUser]
    );

    sendSuccess(res, { achats: rows, total: rows.length },
      'Historique des achats récupéré avec succès');
  } catch (error) { next(error); }
};