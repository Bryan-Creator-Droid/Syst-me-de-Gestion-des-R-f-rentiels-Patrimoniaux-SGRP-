import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { unauthorized, forbidden } from './error.middleware.js';

interface JwtPayload {
  idUser: string;
  emailUser: string;
  role: 'Admin' | 'Visiteur';
}

// -----------------------------------------------------------
// MIDDLEWARE 1 : authenticate
// Vérifie que le token JWT est présent et valide
// -----------------------------------------------------------
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(unauthorized('Token d\'authentification manquant'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(unauthorized('Token d\'authentification manquant'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as unknown as JwtPayload;

    req.user = decoded;
    next();

  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(unauthorized('Token expiré, veuillez vous reconnecter'));
    }
    return next(unauthorized('Token invalide'));
  }
};

// -----------------------------------------------------------
// MIDDLEWARE 2 : authorize
// Vérifie que l'utilisateur a le bon rôle
// -----------------------------------------------------------
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(unauthorized('Non authentifié'));
    }
    if (!roles.includes(req.user.role)) {
      return next(forbidden('Accès refusé : permissions insuffisantes'));
    }
    next();
  };
};