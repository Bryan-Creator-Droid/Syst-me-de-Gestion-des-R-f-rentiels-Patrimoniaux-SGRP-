import { type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { notFound, badRequest } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../middlewares/response.middleware.js';
import { logAction } from '../config/audit.js';

export const getMusees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(50, parseInt(req.query.limit as string) || 10);
    const offset = (page - 1) * limit;

    const [countRows]: any = await pool.query('SELECT COUNT(*) as total FROM musees');
    const total = countRows[0].total;

    const [rows]: any = await pool.query(
      `SELECT idMusee, nomMusee, adresse, latitude, longitude, date_creation
       FROM musees ORDER BY date_creation DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    sendSuccess(res, {
      musees: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }, 'Musées récupérés avec succès');
  } catch (error) { next(error); }
};

export const getMuseeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM musees WHERE idMusee = ?', [req.params.id]
    );
    if (rows.length === 0) return next(notFound('Musée introuvable'));
    sendSuccess(res, rows[0], 'Musée récupéré avec succès');
  } catch (error) { next(error); }
};

export const createMusee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nomMusee, longitude, latitude, adresse } = req.body;

    if (!nomMusee || !longitude || !latitude || !adresse) {
      return next(badRequest('nomMusee, longitude, latitude et adresse sont obligatoires'));
    }

    const idMusee = uuidv4();

    await pool.query(
      `INSERT INTO musees (idMusee, nomMusee, longitude, latitude, adresse)
       VALUES (?, ?, ?, ?, ?)`,
      [idMusee, nomMusee, longitude, latitude, adresse]
    );

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Création',
      details: { idMusee, nomMusee },
    });

    const [newMusee]: any = await pool.query('SELECT * FROM musees WHERE idMusee = ?', [idMusee]);
    sendSuccess(res, newMusee[0], 'Musée créé avec succès', 201);
  } catch (error) { next(error); }
};

export const updateMusee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const [existing]: any = await pool.query('SELECT * FROM musees WHERE idMusee = ?', [id]);
    if (existing.length === 0) return next(notFound('Musée introuvable'));

    const { nomMusee, longitude, latitude, adresse } = req.body;

    await pool.query(
      `UPDATE musees SET
        nomMusee  = COALESCE(?, nomMusee),
        longitude = COALESCE(?, longitude),
        latitude  = COALESCE(?, latitude),
        adresse   = COALESCE(?, adresse)
       WHERE idMusee = ?`,
      [nomMusee, longitude, latitude, adresse, id]
    );

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Modification',
      details: { idMusee: id },
    });

    const [updated]: any = await pool.query('SELECT * FROM musees WHERE idMusee = ?', [id]);
    sendSuccess(res, updated[0], 'Musée mis à jour avec succès');
  } catch (error) { next(error); }
};

export const deleteMusee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const [existing]: any = await pool.query('SELECT * FROM musees WHERE idMusee = ?', [id]);
    if (existing.length === 0) return next(notFound('Musée introuvable'));

    await pool.query('DELETE FROM musees WHERE idMusee = ?', [id]);

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Suppression',
      details: existing[0],
    });

    sendSuccess(res, null, 'Musée supprimé avec succès');
  } catch (error) { next(error); }
};