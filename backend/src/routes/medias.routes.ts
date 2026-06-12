import { Router } from 'express';
import { uploadMedia, getMediasByFiche, deleteMedia } from '../controllers/medias.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { upload } from '../config/multer.js';

const router = Router();

// Upload — Admin uniquement
router.post(
  '/upload',
  authenticate,
  authorize('Admin'),
  upload.single('fichier'), // nom du champ dans form-data
  uploadMedia
);

// Lecture publique — médias d'une fiche
// GET /api/v1/medias/:idFiche
// GET /api/v1/medias/:idFiche?typeFichier=Photo
router.get('/:idFiche', getMediasByFiche);

// Suppression — Admin uniquement
router.delete('/:idMedias', authenticate, authorize('Admin'), deleteMedia);

export default router;