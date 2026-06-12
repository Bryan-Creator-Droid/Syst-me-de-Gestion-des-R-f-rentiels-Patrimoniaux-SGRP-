import { Router } from 'express';
import { search } from '../controllers/search.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Recherche
 *   description: Moteur de recherche full-text inter-référentiels
 *
 * /api/v1/search:
 *   get:
 *     tags: [Recherche]
 *     summary: Recherche full-text sur les 5 référentiels
 *     security: []
 *     parameters:
 *       - in: query
 *         name: q
 *         description: Mot-clé de recherche
 *         schema: { type: string, example: vodoun }
 *       - in: query
 *         name: categorie
 *         description: Filtrer par référentiel
 *         schema:
 *           type: string
 *           enum: [sites, objets, pratiques, artisans, evenements]
 *       - in: query
 *         name: region
 *         schema: { type: string, example: Zou }
 *       - in: query
 *         name: periode
 *         description: Filtre époque — objets uniquement
 *         schema: { type: string, example: XIXe }
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [Brouillon, Soumis, Validé, Publié]
 *           default: Publié
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Résultats unifiés paginés
 */

// GET /api/v1/search
router.get('/', search);

export default router;