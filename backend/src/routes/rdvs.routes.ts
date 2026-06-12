import { Router } from 'express';
import { getRdvs, getRdvById, createRdv, updateRdv, deleteRdv } from '../controllers/rdvs.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Visiteur connecté peut créer et voir ses rdvs
router.get('/', authenticate, authorize('Admin'), getRdvs);
router.get('/:id', authenticate, getRdvById);
router.post('/', authenticate, authorize('Visiteur', 'Admin'), createRdv);
router.put('/:id', authenticate, authorize('Admin'), updateRdv);
router.delete('/:id', authenticate, authorize('Visiteur', 'Admin'), deleteRdv);

export default router;