import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { badRequest, unauthorized } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../middlewares/response.middleware.js';
import { logAction } from '../config/audit.js';

// -----------------------------------------------------------
// POST /api/v1/auth/login
// -----------------------------------------------------------
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailUser, mdpUser } = req.body;

    if (!emailUser || !mdpUser) {
      return next(badRequest('Email et mot de passe requis'));
    }

    const [rows]: any = await pool.query(
      'SELECT * FROM utilisateurs WHERE emailUser = ?',
      [emailUser]
    );

    const user = rows[0];

    if (!user) {
      return next(unauthorized('Email ou mot de passe incorrect'));
    }

    // Compte bloqué
    if (user.bloque) {
      return next(unauthorized('Compte bloqué. Contactez un administrateur'));
    }

    // Vérifier le mot de passe
    const passwordValid = await bcrypt.compare(mdpUser, user.mdpUser);

    if (!passwordValid) {
      const newTentatives = user.tentatives + 1;
      const bloque = newTentatives >= 3;

      await pool.query(
        'UPDATE utilisateurs SET tentatives = ?, bloque = ? WHERE idUser = ?',
        [newTentatives, bloque, user.idUser]
      );

      if (bloque) {
        await logAction({
          idUser: user.idUser,
          actionLog: 'Blocage',
          details: { emailUser: user.emailUser },
        });
        return next(unauthorized('Compte bloqué après 3 tentatives échouées'));
      }

      return next(unauthorized(
        `Email ou mot de passe incorrect. Tentatives restantes : ${3 - newTentatives}`
      ));
    }

    // Réinitialiser le compteur
    await pool.query(
      'UPDATE utilisateurs SET tentatives = 0, bloque = FALSE WHERE idUser = ?',
      [user.idUser]
    );

    // Générer le token
    const token = jwt.sign(
      { idUser: user.idUser, emailUser: user.emailUser, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' } as any
    );

    await logAction({
      idUser: user.idUser,
      actionLog: 'Connexion',
      details: { emailUser: user.emailUser },
    });

    sendSuccess(res, {
      token,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    }, 'Connexion réussie');

  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// POST /api/v1/auth/register
// Inscription visiteur uniquement
// -----------------------------------------------------------
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailUser, mdpUser, nom, prenom, sexe, pays } = req.body;

    if (!emailUser || !mdpUser || !nom || !prenom) {
      return next(badRequest('emailUser, mdpUser, nom et prenom sont obligatoires'));
    }

    // Vérifier que l'email n'existe pas déjà
    const [existing]: any = await pool.query(
      'SELECT idUser FROM utilisateurs WHERE emailUser = ?',
      [emailUser]
    );

    if (existing.length > 0) {
      return next(badRequest('Cet email est déjà utilisé'));
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(mdpUser, 10);

    // Générer UUID
    const idUser = uuidv4();

    await pool.query(
      `INSERT INTO utilisateurs
        (idUser, emailUser, mdpUser, nom, prenom, sexe, pays, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Visiteur')`,
      [idUser, emailUser, hashedPassword, nom, prenom, sexe || null, pays || null]
    );

    await logAction({
      idUser,
      actionLog: 'Création',
      details: { emailUser, role: 'Visiteur' },
    });

    sendSuccess(res, { idUser, emailUser, role: 'Visiteur' },
      'Inscription réussie', 201);

  } catch (error) {
    next(error);
  }
};