import { Router } from 'express';
import { exportCSV, exportPDF } from '../controllers/export.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/v1/export/{typeFiche}/csv:
 *   get:
 *     tags: [Export]
 *     summary: Export CSV d'un type de fiche
 *     parameters:
 *       - in: path
 *         name: typeFiche
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Site, Objet, Pratique, Artisan, Événement, Tous]
 *     responses:
 *       200:
 *         description: Fichier CSV téléchargeable
 *
 * /api/v1/export/{typeFiche}/pdf:
 *   get:
 *     tags: [Export]
 *     summary: Export PDF d'un type de fiche
 *     parameters:
 *       - in: path
 *         name: typeFiche
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Site, Objet, Pratique, Artisan, Événement, Tous]
 *     responses:
 *       200:
 *         description: Fichier PDF téléchargeable
 */

router.get('/:typeFiche/csv', authenticate, authorize('Admin'), exportCSV);
router.get('/:typeFiche/pdf', authenticate, authorize('Admin'), exportPDF);

export default router;