import { type Request, type Response, type NextFunction } from 'express';
import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import { badRequest } from '../middlewares/error.middleware.js';
import { logAction } from '../config/audit.js';

// -----------------------------------------------------------
// CONFIG : mapping référentiel → table + colonnes
// -----------------------------------------------------------
const REFERENTIELS: Record<string, {
  table: string;
  colonnes: string[];
  labels: string[];
}> = {
  sites: {
    table: 'sites_monuments',
    colonnes: ['id', 'denomination', 'departement', 'etat_conservation', 'statut_workflow', 'date_creation'],
    labels:   ['ID', 'Dénomination', 'Département', 'État', 'Statut', 'Date création'],
  },
  objets: {
    table: 'objets_culturels',
    colonnes: ['id', 'num_inventaire', 'nom_objet', 'matiere', 'epoque_origine', 'musee_actuel', 'statut_workflow'],
    labels:   ['ID', 'N° Inventaire', 'Nom', 'Matière', 'Époque', 'Musée actuel', 'Statut'],
  },
  pratiques: {
    table: 'pratiques_immaterielles',
    colonnes: ['id', 'intitule', 'communaute_porteuse', 'region_origine', 'statut_workflow', 'date_creation'],
    labels:   ['ID', 'Intitulé', 'Communauté', 'Région', 'Statut', 'Date création'],
  },
  artisans: {
    table: 'artisans_acteurs',
    colonnes: ['id', 'nom_complet', 'specialite', 'localite', 'statut_workflow', 'date_creation'],
    labels:   ['ID', 'Nom complet', 'Spécialité', 'Localité', 'Statut', 'Date création'],
  },
  evenements: {
    table: 'evenements_culturels',
    colonnes: ['id', 'titre', 'theme', 'lieu', 'date_debut', 'date_fin', 'statut_workflow'],
    labels:   ['ID', 'Titre', 'Thème', 'Lieu', 'Date début', 'Date fin', 'Statut'],
  },
};

// -----------------------------------------------------------
// GET /api/v1/export/:referentiel/csv
// -----------------------------------------------------------
export const exportCSV = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { referentiel } = req.params as { referentiel: string };
    const config = REFERENTIELS[referentiel];

    if (!config) {
      return next(badRequest(`Référentiel invalide. Valeurs : ${Object.keys(REFERENTIELS).join(', ')}`));
    }

    // Récupérer toutes les données sans filtre de statut — export admin complet
    const [rows]: any = await pool.query(
      `SELECT ${config.colonnes.join(', ')} FROM ${config.table} ORDER BY id ASC`
    );

    // Construire le CSV manuellement — pas de dépendance externe nécessaire
    const escape = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Si la valeur contient une virgule, un guillemet ou un saut de ligne → entourer de guillemets
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Ligne d'en-tête
    const header = config.labels.join(',');

    // Lignes de données
    const lines = rows.map((row: any) =>
      config.colonnes.map(col => escape(row[col])).join(',')
    );

    const csv = [header, ...lines].join('\n');

    // En-têtes HTTP pour déclencher le téléchargement
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sgrp_${referentiel}_${Date.now()}.csv"`);

    // BOM UTF-8 pour que Excel ouvre correctement les caractères accentués
    res.send('\uFEFF' + csv);

    await logAction({
      utilisateur_id: req.user!.id,
      action: 'MODIFICATION',
      table_cible: config.table as any,
      details: { export: 'CSV', referentiel, total: rows.length },
    });

  } catch (error) { next(error); }
};

// -----------------------------------------------------------
// GET /api/v1/export/:referentiel/pdf
// -----------------------------------------------------------
export const exportPDF = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    type ReferentielKey = keyof typeof REFERENTIELS;
    const { referentiel } = req.params as { referentiel: ReferentielKey };
    const config = REFERENTIELS[referentiel];

    if (!config) {
      return next(badRequest(`Référentiel invalide. Valeurs : ${Object.keys(REFERENTIELS).join(', ')}`));
    }

    const [rows]: any = await pool.query(
      `SELECT ${config.colonnes.join(', ')} FROM ${config.table} ORDER BY id ASC`
    );

    // Créer le document PDF en mode paysage pour avoir plus de colonnes
    const doc = new PDFDocument({
      margin: 40,
      layout: 'landscape',
      size: 'A4',
    });

    // En-têtes HTTP pour téléchargement
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sgrp_${referentiel}_${Date.now()}.pdf"`);

    // Pipe le PDF directement dans la réponse HTTP
    doc.pipe(res);

    // ── En-tête du document ──────────────────────────────
    doc
      .fontSize(18)
      .fillColor('#1F5C2E')
      .text('SGRP — Ministère du Tourisme, de la Culture et des Arts', { align: 'center' })
      .moveDown(0.3);

    doc
      .fontSize(13)
      .fillColor('#333333')
      .text(`Export : ${referentiel.toUpperCase()} — ${rows.length} enregistrement(s)`, { align: 'center' })
      .moveDown(0.3);

    doc
      .fontSize(9)
      .fillColor('#999999')
      .text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, { align: 'center' })
      .moveDown(1);

    // ── Tableau ──────────────────────────────────────────
    const pageWidth  = doc.page.width  - 80; // marges
    const colWidth   = pageWidth / config.labels.length;
    const rowHeight  = 22;
    let y = doc.y;

    // Fonction pour dessiner une ligne de tableau
    const drawRow = (values: string[], isHeader = false) => {
      // Fond de la ligne
      doc.rect(40, y, pageWidth, rowHeight)
         .fill(isHeader ? '#1F5C2E' : (values[0] === '' ? '#F9F9F9' : '#FFFFFF'));

      // Texte de chaque cellule
      values.forEach((val, i) => {
        doc
          .fontSize(isHeader ? 9 : 8)
          .fillColor(isHeader ? '#FFFFFF' : '#333333')
          .text(
            val,
            40 + i * colWidth + 4,
            y + 6,
            { width: colWidth - 8, ellipsis: true, lineBreak: false }
          );
      });

      // Bordures
      doc.rect(40, y, pageWidth, rowHeight).stroke('#CCCCCC');

      y += rowHeight;

      // Nouvelle page si on dépasse le bas
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
        drawRow(config.labels, true); // répéter l'en-tête sur la nouvelle page
      }
    };

    // En-tête du tableau
    drawRow(config.labels, true);

    // Données
    rows.forEach((row: any, index: number) => {
      const values = config.colonnes.map(col => {
        const val = (row as Record<string, any>)[col];
        if (val === null || val === undefined) return '—';
        // Formater les dates
        if (col.startsWith('date_') && val instanceof Date) {
          return val.toLocaleDateString('fr-FR');
        }
        return String(val);
      });
      drawRow(values);
    });

    // Pied de page
    doc.moveDown(1)
       .fontSize(8)
       .fillColor('#999999')
       .text(
         'SECBEDXI Oswald (Front-end)  ·  SOGOE Bryan (Back-end)  ·  DSI — MTCA Bénin 2025-2026',
         { align: 'center' }
       );

    doc.end();

    await logAction({
      utilisateur_id: req.user!.id,
      action: 'MODIFICATION',
      table_cible: config.table as any,
      details: { export: 'PDF', referentiel, total: rows.length },
    });

  } catch (error) { next(error); }
};