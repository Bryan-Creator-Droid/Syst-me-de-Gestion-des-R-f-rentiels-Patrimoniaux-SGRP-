import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Middlewares
import { errorHandler } from './middlewares/error.middleware.js';

// Routes
import authRouter         from './routes/auth.routes.js';
import fichesRouter       from './routes/fiches.routes.js';
import museesRouter       from './routes/musees.routes.js';
import visitesRouter      from './routes/visites.routes.js';
import rdvsRouter         from './routes/rdvs.routes.js';
import commentairesRouter from './routes/commentaires.routes.js';
import ticketsRouter      from './routes/tickets.routes.js';
import achatsRouter       from './routes/achats.routes.js';
import mediasRouter       from './routes/medias.routes.js';
import searchRouter       from './routes/search.routes.js';
import exportRouter       from './routes/export.routes.js';

// ── Dirname pour ESModule ────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Initialisation ───────────────────────────────────────────
const app: Application = express();

// ════════════════════════════════════════════════════════════
// MIDDLEWARES GLOBAUX
// ════════════════════════════════════════════════════════════

// Lecture du JSON dans le body
app.use(express.json());

// URL-encoded pour les formulaires
app.use(express.urlencoded({ extended: true }));

// CORS — autorise le frontend React
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Servir les fichiers uploadés en statique
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ════════════════════════════════════════════════════════════
// ROUTE DE SANTÉ
// ════════════════════════════════════════════════════════════
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 200,
    message: 'Serveur SGRP opérationnel',
    version: '2.0',
    timestamp: new Date().toISOString(),
  });
});

// ════════════════════════════════════════════════════════════
// ROUTES MÉTIER
// ════════════════════════════════════════════════════════════

// Auth — login + register
app.use('/api/v1/auth', authRouter);

// Référentiels — fiches unifiées
app.use('/api/v1/fiches', fichesRouter);

// Musées
app.use('/api/v1/musees', museesRouter);

// Visites
app.use('/api/v1/visites', visitesRouter);

// Rendez-vous
app.use('/api/v1/rdvs', rdvsRouter);

// Commentaires
app.use('/api/v1/commentaires', commentairesRouter);

// Tickets
app.use('/api/v1/tickets', ticketsRouter);

// Achats + QR Code + PDF
app.use('/api/v1/achats', achatsRouter);

// Médias — upload + compression
app.use('/api/v1/medias', mediasRouter);

// Recherche full-text inter-référentiels
app.use('/api/v1/search', searchRouter);

// Export CSV + PDF
app.use('/api/v1/export', exportRouter);

// ════════════════════════════════════════════════════════════
// SWAGGER — Documentation interactive
// ════════════════════════════════════════════════════════════
// Import dynamique pour éviter les conflits ESModule
import('swagger-ui-express').then(swaggerUi => {
  import('./config/swagger.js').then(({ swaggerSpec }) => {
    app.use('/docs', swaggerUi.default.serve, swaggerUi.default.setup(swaggerSpec, {
      customSiteTitle: 'SGRP API Docs',
      customCss: `
        .topbar { background-color: #1F5C2E !important; }
        .topbar-wrapper img { display: none; }
        .topbar-wrapper::after {
          content: 'SGRP — API Documentation v2.0';
          color: white;
          font-size: 18px;
          font-weight: bold;
        }
      `,
    }));
  });
});

// ════════════════════════════════════════════════════════════
// ROUTE 404 — Route non trouvée
// ════════════════════════════════════════════════════════════
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: `Route ${req.method} ${req.originalUrl} introuvable`,
    errors: [],
  });
});

// ════════════════════════════════════════════════════════════
// GESTIONNAIRE D'ERREURS — Toujours en dernier
// ════════════════════════════════════════════════════════════
app.use(errorHandler);

export default app;