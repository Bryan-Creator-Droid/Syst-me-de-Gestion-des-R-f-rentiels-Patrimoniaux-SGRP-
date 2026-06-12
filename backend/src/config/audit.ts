import pool from './db.js';
import { v4 as uuidv4 } from 'uuid';

type AuditAction =
  | 'Création'
  | 'Modification'
  | 'Suppression'
  | 'Connexion'
  | 'Blocage'
  | 'Déplacement'
  | 'Archivage'
  | 'Désarchivage';

interface LogOptions {
  idUser: string;
  actionLog: AuditAction;
  details?: object;
}

export const logAction = async (options: LogOptions): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO logs (idLog, actionLog, idUser)
       VALUES (?, ?, ?)`,
      [uuidv4(), options.actionLog, options.idUser]
    );
  } catch (error) {
    console.error('Erreur log :', error);
  }
};