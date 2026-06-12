import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        idUser: string;        // UUID maintenant
        emailUser: string;
        role: 'Admin' | 'Visiteur';
      };
    }
  }
}