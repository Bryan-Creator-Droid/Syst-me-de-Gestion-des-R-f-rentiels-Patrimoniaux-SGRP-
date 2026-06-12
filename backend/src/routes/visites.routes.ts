import { Router } from 'express';
import { getVisites, getVisiteById, createVisite, updateVisite, deleteVisite, addFicheToVisite, getFichesVisite } from '../controllers/visites.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Publiques
router.get('/', getVisites);
router.get('/:id', getVisiteById);
router.get('/:id/fiches', getFichesVisite);

// Admin
router.post('/', authenticate, authorize('Admin'), createVisite);
router.put('/:id', authenticate, authorize('Admin'), updateVisite);
router.delete('/:id', authenticate, authorize('Admin'), deleteVisite);
router.post('/:id/fiches', authenticate, authorize('Admin'), addFicheToVisite);

export default router;