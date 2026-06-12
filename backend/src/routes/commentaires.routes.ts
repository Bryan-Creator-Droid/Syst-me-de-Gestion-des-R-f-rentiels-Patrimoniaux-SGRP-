import { Router } from 'express';
import { getCommentaires, createCommentaire, deleteCommentaire } from '../controllers/commentaires.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Publique — lire les commentaires d'une visite
router.get('/:idVisite', getCommentaires);

// Visiteur connecté peut commenter
router.post('/', authenticate, authorize('Visiteur', 'Admin'), createCommentaire);

// Admin peut supprimer
router.delete('/:id', authenticate, authorize('Admin'), deleteCommentaire);

export default router;