import { Router } from 'express';
import {
  getFiches,
  getFicheById,
  createFiche,
  updateFiche,
  deleteFiche,
} from '../controllers/fiches.controller.js';
import { archiverFiche } from '../controllers/fiches.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Routes publiques
router.get('/', getFiches);
router.get('/:id', getFicheById);

// Routes protégées — Admin uniquement
router.post('/', authenticate, authorize('Admin'), createFiche);
router.put('/:id', authenticate, authorize('Admin'), updateFiche);
router.delete('/:id', authenticate, authorize('Admin'), deleteFiche);
router.put('/:id/archiver', authenticate, authorize('Admin'), archiverFiche);

export default router;