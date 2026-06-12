import multer, { type FileFilterCallback } from 'multer';
import path from 'path';
import { type Request } from 'express';
import { badRequest } from '../middlewares/error.middleware.js';

// Extensions autorisées
const ALLOWED_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/webp',
  // Vidéos
  'video/mp4', 'video/mpeg',
  // Documents
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg',
];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB pour vidéos et documents

// Stockage temporaire — on compresse avant de déplacer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/uploads/originals/');
  },
  filename: (req, file, cb) => {
    // Nom unique : timestamp + random + extension originale
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Filtre — on rejette tout ce qui n'est pas image
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format non autorisé. Formats acceptés : JPEG, PNG, WebP'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});