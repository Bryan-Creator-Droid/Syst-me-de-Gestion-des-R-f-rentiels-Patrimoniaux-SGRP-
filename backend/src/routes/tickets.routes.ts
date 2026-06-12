import { Router } from 'express';
import { getTicketsByFiche, createTicket, updateTicket, deleteTicket, getTypeTickets, createTypeTicket } from '../controllers/tickets.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Types de tickets
router.get('/types', getTypeTickets);
router.post('/types', authenticate, authorize('Admin'), createTypeTicket);

// Tickets par fiche
router.get('/fiche/:idFiche', getTicketsByFiche);
router.post('/', authenticate, authorize('Admin'), createTicket);
router.put('/:id', authenticate, authorize('Admin'), updateTicket);
router.delete('/:id', authenticate, authorize('Admin'), deleteTicket);

export default router;