import { Router } from 'express';
import { login, register } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/v1/auth/login    → Admin + Visiteur
// POST /api/v1/auth/register → Visiteur uniquement
router.post('/login', login);
router.post('/register', register);

export default router;