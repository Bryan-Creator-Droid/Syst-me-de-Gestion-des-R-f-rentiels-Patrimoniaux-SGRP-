import { type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { notFound, badRequest } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../middlewares/response.middleware.js';
import { logAction } from '../config/audit.js';

export const getCommentaires = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { idVisite } = req.params;

    const [rows]: any = await pool.query(
      `SELECT c.idCommentaire, c.contenus, c.dateCom,
              u.nom, u.prenom
       FROM commentaires c
       JOIN utilisateurs u ON c.idVisiteur = u.idUser
       WHERE c.idVisite = ?
       ORDER BY c.dateCom DESC`,
      [idVisite]
    );

    sendSuccess(res, { commentaires: rows, total: rows.length },
      'Commentaires récupérés avec succès');
  } catch (error) { next(error); }
};

export const createCommentaire = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { contenus, idVisite } = req.body;

    if (!contenus || !idVisite) {
      return next(badRequest('contenus et idVisite sont obligatoires'));
    }

    // Vérifier que la visite existe
    const [visite]: any = await pool.query('SELECT idVisite FROM visites WHERE idVisite = ?', [idVisite]);
    if (visite.length === 0) return next(notFound('Visite introuvable'));

    const idCommentaire = uuidv4();

    await pool.query(
      `INSERT INTO commentaires (idCommentaire, contenus, idVisiteur, idVisite)
       VALUES (?, ?, ?, ?)`,
      [idCommentaire, contenus, req.user!.idUser, idVisite]
    );

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Création',
      details: { idCommentaire, idVisite },
    });

    const [newCom]: any = await pool.query(
      'SELECT * FROM commentaires WHERE idCommentaire = ?', [idCommentaire]
    );
    sendSuccess(res, newCom[0], 'Commentaire ajouté avec succès', 201);
  } catch (error) { next(error); }
};

export const deleteCommentaire = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const [existing]: any = await pool.query(
      'SELECT * FROM commentaires WHERE idCommentaire = ?', [id]
    );
    if (existing.length === 0) return next(notFound('Commentaire introuvable'));

    await pool.query('DELETE FROM commentaires WHERE idCommentaire = ?', [id]);

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Suppression',
      details: existing[0],
    });

    sendSuccess(res, null, 'Commentaire supprimé avec succès');
  } catch (error) { next(error); }
};