import { type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { notFound, badRequest } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../middlewares/response.middleware.js';
import { logAction } from '../config/audit.js';

export const getTypeTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM type_tickets');
    sendSuccess(res, { types: rows }, 'Types de tickets récupérés');
  } catch (error) { next(error); }
};

export const createTypeTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { codeType, nomType } = req.body;

    if (!codeType || !nomType) {
      return next(badRequest('codeType et nomType sont obligatoires'));
    }

    await pool.query(
      'INSERT INTO type_tickets (codeType, nomType) VALUES (?, ?)',
      [codeType, nomType]
    );

    sendSuccess(res, { codeType, nomType }, 'Type de ticket créé avec succès', 201);
  } catch (error) { next(error); }
};

export const getTicketsByFiche = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { idFiche } = req.params;

    const [rows]: any = await pool.query(
      `SELECT t.idTicket, t.prix, t.date_creation,
              tt.codeType, tt.nomType,
              f.designation
       FROM tickets t
       JOIN type_tickets tt ON t.codeType = tt.codeType
       JOIN fiches f ON t.idFiche = f.idFiche
       WHERE t.idFiche = ?`,
      [idFiche]
    );

    sendSuccess(res, { tickets: rows, total: rows.length },
      'Tickets récupérés avec succès');
  } catch (error) { next(error); }
};

export const createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { idFiche, codeType, prix } = req.body;

    if (!idFiche || !codeType || prix === undefined) {
      return next(badRequest('idFiche, codeType et prix sont obligatoires'));
    }

    // Vérifier que la fiche existe
    const [fiche]: any = await pool.query('SELECT idFiche FROM fiches WHERE idFiche = ?', [idFiche]);
    if (fiche.length === 0) return next(notFound('Fiche introuvable'));

    // Vérifier que le type de ticket existe
    const [type]: any = await pool.query('SELECT codeType FROM type_tickets WHERE codeType = ?', [codeType]);
    if (type.length === 0) return next(notFound('Type de ticket introuvable'));

    // Vérifier qu'un ticket de ce type n'existe pas déjà pour cette fiche
    const [existing]: any = await pool.query(
      'SELECT idTicket FROM tickets WHERE idFiche = ? AND codeType = ?',
      [idFiche, codeType]
    );
    if (existing.length > 0) {
      return next(badRequest('Un ticket de ce type existe déjà pour cette fiche'));
    }

    const idTicket = uuidv4();

    await pool.query(
      'INSERT INTO tickets (idTicket, idFiche, codeType, prix) VALUES (?, ?, ?, ?)',
      [idTicket, idFiche, codeType, prix]
    );

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Création',
      details: { idTicket, idFiche, codeType, prix },
    });

    const [newTicket]: any = await pool.query('SELECT * FROM tickets WHERE idTicket = ?', [idTicket]);
    sendSuccess(res, newTicket[0], 'Ticket créé avec succès', 201);
  } catch (error) { next(error); }
};

export const updateTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const [existing]: any = await pool.query('SELECT * FROM tickets WHERE idTicket = ?', [id]);
    if (existing.length === 0) return next(notFound('Ticket introuvable'));

    const { prix } = req.body;
    if (prix === undefined) return next(badRequest('prix est obligatoire'));

    await pool.query('UPDATE tickets SET prix = ? WHERE idTicket = ?', [prix, id]);

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Modification',
      details: { idTicket: id, prix },
    });

    const [updated]: any = await pool.query('SELECT * FROM tickets WHERE idTicket = ?', [id]);
    sendSuccess(res, updated[0], 'Ticket mis à jour avec succès');
  } catch (error) { next(error); }
};

export const deleteTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const [existing]: any = await pool.query('SELECT * FROM tickets WHERE idTicket = ?', [id]);
    if (existing.length === 0) return next(notFound('Ticket introuvable'));

    await pool.query('DELETE FROM tickets WHERE idTicket = ?', [id]);

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Suppression',
      details: existing[0],
    });

    sendSuccess(res, null, 'Ticket supprimé avec succès');
  } catch (error) { next(error); }
};