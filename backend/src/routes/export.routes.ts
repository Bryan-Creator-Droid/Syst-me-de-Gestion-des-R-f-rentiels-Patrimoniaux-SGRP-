import { Router } from 'express';
import { exportCSV, exportPDF } from '../controllers/export.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Export
 *   description: Export CSV et PDF des référentiels (Admin uniquement)
 *
 * /api/v1/export/{referentiel}/csv:
 *   get:
 *     tags: [Export]
 *     summary: Export CSV d'un référentiel
 *     parameters:
 *       - in: path
 *         name: referentiel
 *         required: true
 *         schema:
 *           type: string
 *           enum: [sites, objets, pratiques, artisans, evenements]
 *     responses:
 *       200:
 *         description: Fichier CSV téléchargeable
 *         content:
 *           text/csv:
 *             schema: { type: string }
 *
 * /api/v1/export/{referentiel}/pdf:
 *   get:
 *     tags: [Export]
 *     summary: Export PDF d'un référentiel
 *     parameters:
 *       - in: path
 *         name: referentiel
 *         required: true
 *         schema:
 *           type: string
 *           enum: [sites, objets, pratiques, artisans, evenements]
 *     responses:
 *       200:
 *         description: Fichier PDF téléchargeable
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

// Export réservé aux admins uniquement
router.get(
  '/:referentiel/csv',
  authenticate,
  authorize('Administrateur', 'Super_Admin'),
  exportCSV
);

router.get(
  '/:referentiel/pdf',
  authenticate,
  authorize('Administrateur', 'Super_Admin'),
  exportPDF
);

export default router;