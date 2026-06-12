import { type Response } from 'express';

export const sendSuccess = (
  res: Response,
  data: any,
  message: string = 'Opération réussie',
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    success: true,
    status: statusCode,
    message,
    data,
  });
};