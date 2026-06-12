import { type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { compressImage } from '../config/compress.js';
import { notFound, badRequest, unprocessable } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../middlewares/response.middleware.js';
import { logAction } from '../config/audit.js';
import fs from 'fs';

const TYPES_FICHIER = ['Photo', 'Video', 'Document', 'Audio'];

// -----------------------------------------------------------
// POST /api/v1/medias/upload
// -----------------------------------------------------------
export const uploadMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      return next(badRequest('Aucun fichier reçu'));
    }

    const { idFiche, typeFichier } = req.body;

    // Validation
    if (!idFiche || !typeFichier) {
      fs.unlinkSync(req.file.path);
      return next(badRequest('idFiche et typeFichier sont obligatoires'));
    }

    if (!TYPES_FICHIER.includes(typeFichier)) {
      fs.unlinkSync(req.file.path);
      return next(unprocessable(`typeFichier invalide. Valeurs : ${TYPES_FICHIER.join(', ')}`));
    }

    // Vérifier que la fiche existe
    const [fiche]: any = await pool.query(
      'SELECT idFiche, typeFiche FROM fiches WHERE idFiche = ?', [idFiche]
    );
    if (fiche.length === 0) {
      fs.unlinkSync(req.file.path);
      return next(notFound('Fiche introuvable'));
    }

    let urlChemin: string;
    let nomFichier: string;

    // Compression uniquement pour les photos
    if (typeFichier === 'Photo') {
      const compressed = await compressImage(req.file.path, req.file.filename);
      urlChemin  = `/uploads/compressed/${compressed.filename}`;
      nomFichier = compressed.filename;
    } else {
      // Autres types — on garde le fichier original
      urlChemin  = `/uploads/originals/${req.file.filename}`;
      nomFichier = req.file.filename;
    }

    const idMedias = uuidv4();

    await pool.query(
      `INSERT INTO medias (idMedias, urlChemin, typeFichier, typeFiche, idFiche, idUser)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        idMedias,
        urlChemin,
        typeFichier,
        fiche[0].typeFiche,  // récupéré depuis la fiche
        idFiche,
        req.user!.idUser,
      ]
    );

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Création',
      details: { idMedias, idFiche, typeFichier, urlChemin },
    });

    const [newMedia]: any = await pool.query(
      'SELECT * FROM medias WHERE idMedias = ?', [idMedias]
    );

    sendSuccess(res, newMedia[0], 'Média uploadé avec succès', 201);

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// -----------------------------------------------------------
// GET /api/v1/medias/:idFiche
// Récupérer tous les médias d'une fiche
// -----------------------------------------------------------
export const getMediasByFiche = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { idFiche } = req.params;
    const { typeFichier } = req.query;

    // Filtre optionnel par type de fichier
    let query = `
      SELECT idMedias, urlChemin, typeFichier, typeFiche, date_upload
      FROM medias
      WHERE idFiche = ?
    `;
    const params: any[] = [idFiche];

    if (typeFichier && TYPES_FICHIER.includes(typeFichier as string)) {
      query += ' AND typeFichier = ?';
      params.push(typeFichier);
    }

    query += ' ORDER BY date_upload DESC';

    const [medias]: any = await pool.query(query, params);

    sendSuccess(res, { medias, total: medias.length },
      'Médias récupérés avec succès');
  } catch (error) { next(error); }
};

// -----------------------------------------------------------
// DELETE /api/v1/medias/:idMedias
// -----------------------------------------------------------
export const deleteMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { idMedias } = req.params;

    const [existing]: any = await pool.query(
      'SELECT * FROM medias WHERE idMedias = ?', [idMedias]
    );
    if (existing.length === 0) return next(notFound('Média introuvable'));

    const media = existing[0];

    // Supprimer le fichier physique
    const filePath = media.urlChemin.startsWith('/uploads/compressed/')
      ? `src${media.urlChemin}`
      : `src${media.urlChemin}`;

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM medias WHERE idMedias = ?', [idMedias]);

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Suppression',
      details: { idMedias, idFiche: media.idFiche, typeFichier: media.typeFichier },
    });

    sendSuccess(res, null, 'Média supprimé avec succès');
  } catch (error) { next(error); }
};