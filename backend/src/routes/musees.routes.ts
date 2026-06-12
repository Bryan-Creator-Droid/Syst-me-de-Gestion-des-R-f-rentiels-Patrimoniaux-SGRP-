import { Router } from 'express';
import { getMusees, getMuseeById, createMusee, updateMusee, deleteMusee } from '../controllers/musees.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', getMusees);
router.get('/:id', getMuseeById);
router.post('/', authenticate, authorize('Admin'), createMusee);
router.put('/:id', authenticate, authorize('Admin'), updateMusee);
router.delete('/:id', authenticate, authorize('Admin'), deleteMusee);

export default router;