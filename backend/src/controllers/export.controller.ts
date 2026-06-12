import { type Request, type Response, type NextFunction } from 'express';
import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import { badRequest } from '../middlewares/error.middleware.js';
import { logAction } from '../config/audit.js';

// -----------------------------------------------------------
// CONFIG : colonnes par type de fiche
// -----------------------------------------------------------
const CONFIG_EXPORT: Record<string, {
  colonnes: string[];
  labels: string[];
}> = {
  Site: {
    colonnes: ['idFiche', 'designation', 'description', 'latitude', 'longitude', 'categorie', 'etatConservation', 'date_creation'],
    labels:   ['ID', 'Désignation', 'Description', 'Latitude', 'Longitude', 'Catégorie', 'État', 'Date création'],
  },
  Objet: {
    colonnes: ['idFiche', 'designation', 'matiere', 'epoque', 'provenance', 'hauteurObjet', 'largeurObjet', 'date_creation'],
    labels:   ['ID', 'Désignation', 'Matière', 'Époque', 'Provenance', 'Hauteur', 'Largeur', 'Date création'],
  },
  Pratique: {
    colonnes: ['idFiche', 'designation', 'communautePorteuse', 'region', 'frequence', 'date_creation'],
    labels:   ['ID', 'Désignation', 'Communauté', 'Région', 'Fréquence', 'Date création'],
  },
  Artisan: {
    colonnes: ['idFiche', 'designation', 'nomArtisan', 'prenomArtisan', 'specialite', 'date_creation'],
    labels:   ['ID', 'Désignation', 'Nom', 'Prénom', 'Spécialité', 'Date création'],
  },
  Événement: {
    colonnes: ['idFiche', 'designation', 'typeEvenement', 'accesEvenement', 'dateEvenement', 'organisateur', 'archive', 'date_creation'],
    labels:   ['ID', 'Désignation', 'Type', 'Accès', 'Date', 'Organisateur', 'Archivé', 'Date création'],
  },
  Tous: {
    colonnes: ['idFiche', 'designation', 'typeFiche', 'categorie', 'etatConservation', 'date_creation'],
    labels:   ['ID', 'Désignation', 'Type', 'Catégorie', 'État', 'Date création'],
  },
};

const TYPES_VALIDES = ['Site', 'Objet', 'Pratique', 'Artisan', 'Événement', 'Tous'];

// -----------------------------------------------------------
// GET /api/v1/export/:typeFiche/csv
// -----------------------------------------------------------
export const exportCSV = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const typeFiche = Array.isArray(req.params.typeFiche)
      ? req.params.typeFiche[0]
      : req.params.typeFiche;

    if (!typeFiche || !TYPES_VALIDES.includes(typeFiche)) {
      return next(badRequest(`typeFiche invalide. Valeurs : ${TYPES_VALIDES.join(', ')}`));
    }

    const config = CONFIG_EXPORT[typeFiche];
    if (!config) {
      return next(badRequest(`typeFiche invalide. Valeurs : ${TYPES_VALIDES.join(', ')}`));
    }

    // Construire le WHERE
    const where  = typeFiche !== 'Tous' ? `WHERE typeFiche = ?` : '';
    const params = typeFiche !== 'Tous' ? [typeFiche] : [];

    const [rows]: any = await pool.query(
      `SELECT ${config.colonnes.join(', ')}
       FROM fiches ${where}
       ORDER BY date_creation ASC`,
      params
    );

    // Construire le CSV
    const escape = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = config.labels.join(',');
    const lines  = rows.map((row: any) =>
      config.colonnes.map(col => escape(row[col])).join(',')
    );

    const csv = [header, ...lines].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',
      `attachment; filename="sgrp_${typeFiche}_${Date.now()}.csv"`);

    res.send('\uFEFF' + csv);

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Modification',
      details: { export: 'CSV', typeFiche, total: rows.length },
    });

  } catch (error) { next(error); }
};

// -----------------------------------------------------------
// GET /api/v1/export/:typeFiche/pdf
// -----------------------------------------------------------
export const exportPDF = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const typeFiche = Array.isArray(req.params.typeFiche)
      ? req.params.typeFiche[0]
      : req.params.typeFiche;

    if (!typeFiche || !TYPES_VALIDES.includes(typeFiche)) {
      return next(badRequest(`typeFiche invalide. Valeurs : ${TYPES_VALIDES.join(', ')}`));
    }

    const config = CONFIG_EXPORT[typeFiche];
    if (!config) {
      return next(badRequest(`typeFiche invalide. Valeurs : ${TYPES_VALIDES.join(', ')}`));
    }

    const where  = typeFiche !== 'Tous' ? `WHERE typeFiche = ?` : '';
    const params = typeFiche !== 'Tous' ? [typeFiche] : [];

    const [rows]: any = await pool.query(
      `SELECT ${config.colonnes.join(', ')}
       FROM fiches ${where}
       ORDER BY date_creation ASC`,
      params
    );

    const doc = new PDFDocument({
      margin: 40,
      layout: 'landscape',
      size: 'A4',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="sgrp_${typeFiche}_${Date.now()}.pdf"`);

    doc.pipe(res);

    // ── En-tête ──────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 100).fill('#1F5C2E');

    doc.fontSize(18).fillColor('#FFFFFF')
       .text('SGRP — Ministère du Tourisme, de la Culture et des Arts — Bénin',
         50, 25, { align: 'center' });

    doc.fontSize(13).fillColor('#CCFFCC')
       .text(`Export : ${typeFiche.toUpperCase()} — ${rows.length} enregistrement(s)`,
         50, 55, { align: 'center' });

    doc.fontSize(9).fillColor('#AADDAA')
       .text(
         `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
         50, 78, { align: 'center' }
       );

    // ── Tableau ──────────────────────────────────────────
    const pageWidth = doc.page.width - 80;
    const colWidth  = pageWidth / config.labels.length;
    const rowHeight = 22;
    let y = 120;

    const drawRow = (values: string[], isHeader = false) => {
      doc.rect(40, y, pageWidth, rowHeight)
         .fill(isHeader ? '#1F5C2E' : '#FFFFFF');

      values.forEach((val, i) => {
        doc.fontSize(isHeader ? 9 : 8)
           .fillColor(isHeader ? '#FFFFFF' : '#333333')
           .text(
             val,
             40 + i * colWidth + 4,
             y + 6,
             { width: colWidth - 8, ellipsis: true, lineBreak: false }
           );
      });

      doc.rect(40, y, pageWidth, rowHeight).stroke('#CCCCCC');
      y += rowHeight;

      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
        drawRow(config.labels, true);
      }
    };

    // En-tête tableau
    drawRow(config.labels, true);

    // Données
    rows.forEach((row: any) => {
      const values = config.colonnes.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '—';
        if (col.startsWith('date') && val instanceof Date) {
          return val.toLocaleDateString('fr-FR');
        }
        if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
        return String(val);
      });
      drawRow(values);
    });

    // ── Pied de page ─────────────────────────────────────
    doc.fontSize(8).fillColor('#999999')
       .text(
         'SECBEDXI Oswald (Front-end)  ·  SOGOE Bryan (Back-end)  ·  DSI — MTCA Bénin 2025-2026',
         50, doc.page.height - 40,
         { align: 'center' }
       );

    doc.end();

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Modification',
      details: { export: 'PDF', typeFiche, total: rows.length },
    });

  } catch (error) { next(error); }
};