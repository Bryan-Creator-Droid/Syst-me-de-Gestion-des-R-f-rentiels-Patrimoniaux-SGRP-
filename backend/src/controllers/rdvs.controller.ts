import {type  Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { notFound, badRequest, forbidden } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../middlewares/response.middleware.js';
import { logAction } from '../config/audit.js';

export const getRdvs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(50, parseInt(req.query.limit as string) || 10);
    const offset = (page - 1) * limit;

    const [countRows]: any = await pool.query('SELECT COUNT(*) as total FROM rdvs');
    const total = countRows[0].total;

    const [rows]: any = await pool.query(
      `SELECT r.*, u.nom, u.prenom, v.guide, v.dateVisite
       FROM rdvs r
       JOIN utilisateurs u ON r.idVisiteur = u.idUser
       JOIN visites v ON r.idVisite = v.idVisite
       ORDER BY r.dateRdv DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    sendSuccess(res, {
      rdvs: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }, 'Rendez-vous récupérés avec succès');
  } catch (error) { next(error); }
};

export const getRdvById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [rows]: any = await pool.query(
      `SELECT r.*, u.nom, u.prenom, v.guide, v.dateVisite
       FROM rdvs r
       JOIN utilisateurs u ON r.idVisiteur = u.idUser
       JOIN visites v ON r.idVisite = v.idVisite
       WHERE r.idRdv = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return next(notFound('Rendez-vous introuvable'));

    // Un visiteur ne peut voir que ses propres rdvs
    if (req.user!.role === 'Visiteur' && rows[0].idVisiteur !== req.user!.idUser) {
      return next(forbidden('Accès refusé'));
    }

    sendSuccess(res, rows[0], 'Rendez-vous récupéré avec succès');
  } catch (error) { next(error); }
};

export const createRdv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateRdv, heureDebutRdv, idVisite } = req.body;

    if (!dateRdv || !heureDebutRdv || !idVisite) {
      return next(badRequest('dateRdv, heureDebutRdv et idVisite sont obligatoires'));
    }

    // Vérifier que la visite existe
    const [visite]: any = await pool.query('SELECT idVisite FROM visites WHERE idVisite = ?', [idVisite]);
    if (visite.length === 0) return next(notFound('Visite introuvable'));

    const idRdv = uuidv4();
    // Le visiteur crée son propre rdv
    const idVisiteur = req.user!.idUser;

    await pool.query(
      `INSERT INTO rdvs (idRdv, dateRdv, heureDebutRdv, idVisiteur, idVisite)
       VALUES (?, ?, ?, ?, ?)`,
      [idRdv, dateRdv, heureDebutRdv, idVisiteur, idVisite]
    );

    await logAction({
      idUser: idVisiteur,
      actionLog: 'Création',
      details: { idRdv, idVisite, dateRdv },
    });

    const [newRdv]: any = await pool.query('SELECT * FROM rdvs WHERE idRdv = ?', [idRdv]);
    sendSuccess(res, newRdv[0], 'Rendez-vous créé avec succès', 201);
  } catch (error) { next(error); }
};

export const updateRdv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const [existing]: any = await pool.query('SELECT * FROM rdvs WHERE idRdv = ?', [id]);
    if (existing.length === 0) return next(notFound('Rendez-vous introuvable'));

    const { dateRdv, heureDebutRdv } = req.body;

    await pool.query(
      `UPDATE rdvs SET
        dateRdv      = COALESCE(?, dateRdv),
        heureDebutRdv = COALESCE(?, heureDebutRdv)
       WHERE idRdv = ?`,
      [dateRdv, heureDebutRdv, id]
    );

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Modification',
      details: { idRdv: id },
    });

    const [updated]: any = await pool.query('SELECT * FROM rdvs WHERE idRdv = ?', [id]);
    sendSuccess(res, updated[0], 'Rendez-vous mis à jour avec succès');
  } catch (error) { next(error); }
};

export const deleteRdv = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const [existing]: any = await pool.query('SELECT * FROM rdvs WHERE idRdv = ?', [id]);
    if (existing.length === 0) return next(notFound('Rendez-vous introuvable'));

    // Visiteur peut annuler uniquement son propre rdv
    if (req.user!.role === 'Visiteur' && existing[0].idVisiteur !== req.user!.idUser) {
      return next(forbidden('Vous ne pouvez annuler que vos propres rendez-vous'));
    }

    await pool.query('DELETE FROM rdvs WHERE idRdv = ?', [id]);

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Suppression',
      details: { idRdv: id, annulePar: req.user!.role },
    });

    sendSuccess(res, null, 'Rendez-vous annulé avec succès');
  } catch (error) { next(error); }
};