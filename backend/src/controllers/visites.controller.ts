import { type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { notFound, badRequest } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../middlewares/response.middleware.js';
import { logAction } from '../config/audit.js';

export const getVisites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(50, parseInt(req.query.limit as string) || 10);
    const offset = (page - 1) * limit;

    const [countRows]: any = await pool.query('SELECT COUNT(*) as total FROM visites');
    const total = countRows[0].total;

    const [rows]: any = await pool.query(
      `SELECT idVisite, guide, dateVisite, heureDebut, date_creation
       FROM visites ORDER BY dateVisite ASC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    sendSuccess(res, {
      visites: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }, 'Visites récupérées avec succès');
  } catch (error) { next(error); }
};

export const getVisiteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM visites WHERE idVisite = ?', [req.params.id]);
    if (rows.length === 0) return next(notFound('Visite introuvable'));

    // Récupérer les fiches liées
    const [fiches]: any = await pool.query(
      `SELECT f.idFiche, f.designation, f.typeFiche
       FROM visite_fiches vf
       JOIN fiches f ON vf.idFiche = f.idFiche
       WHERE vf.idVisite = ?`,
      [req.params.id]
    );

    sendSuccess(res, { ...rows[0], fiches }, 'Visite récupérée avec succès');
  } catch (error) { next(error); }
};

export const createVisite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { guide, dateVisite, heureDebut } = req.body;

    if (!guide || !dateVisite || !heureDebut) {
      return next(badRequest('guide, dateVisite et heureDebut sont obligatoires'));
    }

    const idVisite = uuidv4();

    await pool.query(
      `INSERT INTO visites (idVisite, guide, dateVisite, heureDebut)
       VALUES (?, ?, ?, ?)`,
      [idVisite, guide, dateVisite, heureDebut]
    );

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Création',
      details: { idVisite, guide, dateVisite },
    });

    const [newVisite]: any = await pool.query('SELECT * FROM visites WHERE idVisite = ?', [idVisite]);
    sendSuccess(res, newVisite[0], 'Visite créée avec succès', 201);
  } catch (error) { next(error); }
};

export const updateVisite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const [existing]: any = await pool.query('SELECT * FROM visites WHERE idVisite = ?', [id]);
    if (existing.length === 0) return next(notFound('Visite introuvable'));

    const { guide, dateVisite, heureDebut } = req.body;

    await pool.query(
      `UPDATE visites SET
        guide      = COALESCE(?, guide),
        dateVisite = COALESCE(?, dateVisite),
        heureDebut = COALESCE(?, heureDebut)
       WHERE idVisite = ?`,
      [guide, dateVisite, heureDebut, id]
    );

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Modification',
      details: { idVisite: id },
    });

    const [updated]: any = await pool.query('SELECT * FROM visites WHERE idVisite = ?', [id]);
    sendSuccess(res, updated[0], 'Visite mise à jour avec succès');
  } catch (error) { next(error); }
};

export const deleteVisite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const [existing]: any = await pool.query('SELECT * FROM visites WHERE idVisite = ?', [id]);
    if (existing.length === 0) return next(notFound('Visite introuvable'));

    // Supprimer les dépendances d'abord
    await pool.query('DELETE FROM visite_fiches WHERE idVisite = ?', [id]);
    await pool.query('DELETE FROM rdvs WHERE idVisite = ?', [id]);
    await pool.query('DELETE FROM commentaires WHERE idVisite = ?', [id]);
    await pool.query('DELETE FROM visites WHERE idVisite = ?', [id]);

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Suppression',
      details: existing[0],
    });

    sendSuccess(res, null, 'Visite supprimée avec succès');
  } catch (error) { next(error); }
};

// Associer une fiche à une visite
export const addFicheToVisite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { idFiche } = req.body;

    if (!idFiche) return next(badRequest('idFiche est obligatoire'));

    // Vérifier que la visite et la fiche existent
    const [visite]: any = await pool.query('SELECT idVisite FROM visites WHERE idVisite = ?', [id]);
    if (visite.length === 0) return next(notFound('Visite introuvable'));

    const [fiche]: any = await pool.query('SELECT idFiche FROM fiches WHERE idFiche = ?', [idFiche]);
    if (fiche.length === 0) return next(notFound('Fiche introuvable'));

    // Vérifier que l'association n'existe pas déjà
    const [existing]: any = await pool.query(
      'SELECT * FROM visite_fiches WHERE idVisite = ? AND idFiche = ?', [id, idFiche]
    );
    if (existing.length > 0) return next(badRequest('Cette fiche est déjà associée à cette visite'));

    await pool.query(
      'INSERT INTO visite_fiches (idVisite, idFiche) VALUES (?, ?)',
      [id, idFiche]
    );

    sendSuccess(res, null, 'Fiche associée à la visite avec succès', 201);
  } catch (error) { next(error); }
};

// Récupérer les fiches d'une visite
export const getFichesVisite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [rows]: any = await pool.query(
      `SELECT f.idFiche, f.designation, f.typeFiche, f.description
       FROM visite_fiches vf
       JOIN fiches f ON vf.idFiche = f.idFiche
       WHERE vf.idVisite = ?`,
      [req.params.id]
    );
    sendSuccess(res, { fiches: rows, total: rows.length }, 'Fiches de la visite récupérées');
  } catch (error) { next(error); }
};