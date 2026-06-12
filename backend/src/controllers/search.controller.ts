import { type Request, type Response, type NextFunction } from 'express';
import pool from '../config/db.js';
import { sendSuccess } from '../middlewares/response.middleware.js';

export const search = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // ── Paramètres ───────────────────────────────────────
    const q         = (req.query.q as string)?.trim()        || '';
    const typeFiche = (req.query.typeFiche as string)?.trim() || '';
    const categorie = (req.query.categorie as string)?.trim() || '';
    const region    = (req.query.region as string)?.trim()    || '';
    const periode   = (req.query.periode as string)?.trim()   || '';
    const page      = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit     = Math.min(50, parseInt(req.query.limit as string) || 10);
    const offset    = (page - 1) * limit;

    const keyword = q ? `%${q}%` : '%';

    // ── Construction dynamique du WHERE ──────────────────
    const conditions: string[] = [];
    const params: any[]        = [];

    // Filtre mot-clé — cherche dans tous les champs texte
    if (q) {
      conditions.push(`(
        designation        LIKE ? OR
        description        LIKE ? OR
        nomArtisan         LIKE ? OR
        prenomArtisan      LIKE ? OR
        specialite         LIKE ? OR
        communautePorteuse LIKE ? OR
        region             LIKE ? OR
        organisateur       LIKE ? OR
        provenance         LIKE ? OR
        epoque             LIKE ?
      )`);
      // 10 champs → 10 fois le keyword
      params.push(...Array(10).fill(keyword));
    }

    // Filtre type de fiche
    if (typeFiche) {
      conditions.push('typeFiche = ?');
      params.push(typeFiche);
    }

    // Filtre catégorie (UNESCO, Nationale, Locale)
    if (categorie) {
      conditions.push('categorie = ?');
      params.push(categorie);
    }

    // Filtre région — cherche dans region ET provenance
    if (region) {
      conditions.push('(region LIKE ? OR provenance LIKE ?)');
      params.push(`%${region}%`, `%${region}%`);
    }

    // Filtre période — uniquement pour les objets
    if (periode) {
      conditions.push('epoque LIKE ?');
      params.push(`%${periode}%`);
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // ── Compter le total ─────────────────────────────────
    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) as total FROM fiches ${where}`,
      params
    );
    const total = countRows[0].total;

    // ── Récupérer les résultats paginés ──────────────────
    const [rows]: any = await pool.query(
      `SELECT
        idFiche, designation, description, typeFiche,
        categorie, etatConservation,
        latitude, longitude,
        region, communautePorteuse,
        epoque, provenance,
        nomArtisan, prenomArtisan, specialite,
        typeEvenement, accesEvenement, dateEvenement,
        date_creation
       FROM fiches ${where}
       ORDER BY date_creation DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // ── Enrichir chaque résultat avec sa première photo ──
    const enriched = await Promise.all(rows.map(async (fiche: any) => {
      const [media]: any = await pool.query(
        `SELECT urlChemin FROM medias
         WHERE idFiche = ? AND typeFichier = 'Photo'
         ORDER BY date_upload ASC LIMIT 1`,
        [fiche.idFiche]
      );
      return {
        ...fiche,
        photo: media.length > 0 ? media[0].urlChemin : null,
      };
    }));

    // ── Réponse ──────────────────────────────────────────
    sendSuccess(res, {
      resultats: enriched,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filtres: { q, typeFiche, categorie, region, periode },
    }, `${total} résultat(s) trouvé(s)`);

  } catch (error) { next(error); }
};