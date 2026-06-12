import { Router } from 'express';
import { acheterTicket, telechargerTicketPDF, getMesAchats } from '../controllers/achats.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Visiteur connecté uniquement
router.post('/', authenticate, authorize('Visiteur', 'Admin'), acheterTicket);
router.get('/mes-achats', authenticate, getMesAchats);
router.get('/:idAchat/pdf', authenticate, telechargerTicketPDF);

export default router;