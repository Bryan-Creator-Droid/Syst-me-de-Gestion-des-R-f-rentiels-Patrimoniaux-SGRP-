import { type Request, type Response, type NextFunction } from 'express';

// -----------------------------------------------------------
// CLASSE : AppError
// Une erreur "métier" avec un code HTTP attaché
// -----------------------------------------------------------
export class AppError extends Error {
  public statusCode: number; // On ajoute statusCode pour savoir quel Code HTTP renvoyer
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);           // appelle le constructeur de Error
    this.statusCode = statusCode;
    this.isOperational = true; // erreur prévue (pas un bug)
    Error.captureStackTrace(this, this.constructor);
  }
}

// -----------------------------------------------------------
// HELPERS : raccourcis pour créer les erreurs courantes
// -----------------------------------------------------------
export const badRequest = (message: string) =>
  new AppError(message, 400);

export const unauthorized = (message: string) =>
  new AppError(message, 401);

export const forbidden = (message: string) =>
  new AppError(message, 403);

export const notFound = (message: string) =>
  new AppError(message, 404);

export const unprocessable = (message: string) =>
  new AppError(message, 422);

export const serverError = (message: string) =>
  new AppError(message, 500);

// -----------------------------------------------------------
// MIDDLEWARE : gestionnaire global des erreurs
// Express l'identifie grâce aux 4 paramètres (err, req, res, next)
// -----------------------------------------------------------
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {

  // Cas 1 : c'est une erreur AppError (erreur métier prévue)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      status: err.statusCode,
      message: err.message,
      errors: [],
    });
    return;
  }

  // Cas 2 : erreur MySQL — clé dupliquée (ex: email déjà existant)
  if ((err as any).code === 'ER_DUP_ENTRY') {
    res.status(400).json({
      success: false,
      status: 400,
      message: 'Une entrée avec ces données existe déjà',
      errors: [],
    });
    return;
  }

  // Cas 3 : erreur imprévue — on ne expose pas les détails en production
  console.error('Erreur non gérée :', err);
  res.status(500).json({
    success: false,
    status: 500,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Une erreur interne est survenue',
    errors: [],
  });
};