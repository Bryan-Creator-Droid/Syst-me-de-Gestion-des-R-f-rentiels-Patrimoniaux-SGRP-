import { type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { notFound, badRequest, unprocessable } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../middlewares/response.middleware.js';
import { logAction } from '../config/audit.js';

// Types de fiches valides
const TYPES_FICHES = ['Site', 'Objet', 'Pratique', 'Artisan', 'Événement'];

// -----------------------------------------------------------
// VALIDATION : champs obligatoires selon le type de fiche
// -----------------------------------------------------------
const validateFiche = (typeFiche: string, body: any): string | null => {
  // Champs communs à tous les types
  if (!body.designation) return 'designation est obligatoire';

  switch (typeFiche) {
    case 'Site':
      if (!body.latitude || !body.longitude)
        return 'latitude et longitude sont obligatoires pour un Site';
      if (isNaN(body.latitude) || body.latitude < -90 || body.latitude > 90)
        return 'latitude invalide';
      if (isNaN(body.longitude) || body.longitude < -180 || body.longitude > 180)
        return 'longitude invalide';
      break;

    case 'Objet':
      if (!body.matiere)
        return 'matiere est obligatoire pour un Objet';
      break;

    case 'Pratique':
      if (!body.communautePorteuse || !body.region)
        return 'communautePorteuse et region sont obligatoires pour une Pratique';
      break;

    case 'Artisan':
      if (!body.nomArtisan || !body.prenomArtisan)
        return 'nomArtisan et prenomArtisan sont obligatoires pour un Artisan';
      break;

    case 'Événement':
      if (!body.typeEvenement || !body.dateEvenement || !body.organisateur)
        return 'typeEvenement, dateEvenement et organisateur sont obligatoires pour un Événement';
      if (!body.accesEvenement)
        return 'accesEvenement (Gratuit/Payant) est obligatoire pour un Événement';
      break;
  }

  return null; // pas d'erreur
};

// -----------------------------------------------------------
// GET /api/v1/fiches
// Liste paginée avec filtres
// -----------------------------------------------------------
export const getFiches = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page       = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit      = Math.min(50, parseInt(req.query.limit as string) || 10);
    const offset     = (page - 1) * limit;
    const typeFiche  = req.query.typeFiche as string || '';
    const categorie  = req.query.categorie as string || '';

    // Construction dynamique du WHERE
    const conditions: string[] = [];
    const params: any[] = [];

    if (typeFiche && TYPES_FICHES.includes(typeFiche)) {
      conditions.push('typeFiche = ?');
      params.push(typeFiche);
    }

    if (categorie) {
      conditions.push('categorie = ?');
      params.push(categorie);
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Compter le total
    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) as total FROM fiches ${where}`,
      params
    );
    const total = countRows[0].total;

    // Récupérer les fiches
    const [rows]: any = await pool.query(
      `SELECT idFiche, designation, description, typeFiche,
              categorie, etatConservation, date_creation
       FROM fiches ${where}
       ORDER BY date_creation DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    sendSuccess(res, {
      fiches: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }, 'Fiches récupérées avec succès');

  } catch (error) { next(error); }
};

// -----------------------------------------------------------
// GET /api/v1/fiches/:id
// Détail d'une fiche + ses médias
// -----------------------------------------------------------
export const getFicheById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const [rows]: any = await pool.query(
      `SELECT f.*, u.nom AS createur_nom, u.prenom AS createur_prenom
       FROM fiches f
       JOIN utilisateurs u ON f.cree_par = u.idUser
       WHERE f.idFiche = ?`,
      [id]
    );

    if (rows.length === 0) return next(notFound('Fiche introuvable'));

    // Récupérer les médias associés
    const [medias]: any = await pool.query(
      `SELECT idMedias, urlChemin, typeFichier, date_upload
       FROM medias
       WHERE idFiche = ?
       ORDER BY date_upload DESC`,
      [id]
    );

    sendSuccess(res, { ...rows[0], medias }, 'Fiche récupérée avec succès');

  } catch (error) { next(error); }
};

// -----------------------------------------------------------
// POST /api/v1/fiches
// Créer une fiche — Admin uniquement
// -----------------------------------------------------------
export const createFiche = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { typeFiche } = req.body;

    // Vérifier le type de fiche
    if (!typeFiche || !TYPES_FICHES.includes(typeFiche)) {
      return next(badRequest(`typeFiche invalide. Valeurs : ${TYPES_FICHES.join(', ')}`));
    }

    // Valider les champs selon le type
    const validationError = validateFiche(typeFiche, req.body);
    if (validationError) return next(unprocessable(validationError));

    const {
      designation, description,
      // Site
      latitude, longitude, dateClassement, categorie, etatConservation,
      // Objet
      matiere, epoque, provenance, hauteurObjet, largeurObjet,
      // Pratique
      communautePorteuse, region, frequence,
      // Artisan
      nomArtisan, prenomArtisan, specialite,
      // Événement
      typeEvenement, accesEvenement, dateEvenement, organisateur,
    } = req.body;

    const idFiche = uuidv4();

    await pool.query(
      `INSERT INTO fiches (
        idFiche, designation, description, typeFiche,
        latitude, longitude, dateClassement, categorie, etatConservation,
        matiere, epoque, provenance, hauteurObjet, largeurObjet,
        communautePorteuse, region, frequence,
        nomArtisan, prenomArtisan, specialite,
        typeEvenement, accesEvenement, dateEvenement, organisateur,
        cree_par
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?
      )`,
      [
        idFiche, designation, description || null, typeFiche,
        latitude || null, longitude || null, dateClassement || null,
        categorie || null, etatConservation || null,
        matiere || null, epoque || null, provenance || null,
        hauteurObjet || null, largeurObjet || null,
        communautePorteuse || null, region || null, frequence || null,
        nomArtisan || null, prenomArtisan || null, specialite || null,
        typeEvenement || null, accesEvenement || null,
        dateEvenement || null, organisateur || null,
        req.user!.idUser,
      ]
    );

    if (typeFiche === 'Événement' && accesEvenement === 'Payant') {
      const { prixStandard, prixVIP } = req.body;

      if (!prixStandard || !prixVIP) {
        // Supprimer la fiche créée si les prix sont manquants
        await pool.query('DELETE FROM fiches WHERE idFiche = ?', [idFiche]);
        return next(badRequest('prixStandard et prixVIP sont obligatoires pour un événement payant'));
      }

      // Créer ticket Standard
      await pool.query(
        'INSERT INTO tickets (idTicket, idFiche, codeType, prix) VALUES (?, ?, ?, ?)',
        [uuidv4(), idFiche, 'STD', prixStandard]
      );

      // Créer ticket VIP
      await pool.query(
        'INSERT INTO tickets (idTicket, idFiche, codeType, prix) VALUES (?, ?, ?, ?)',
        [uuidv4(), idFiche, 'VIP', prixVIP]
      );
    }

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Création',
      details: { idFiche, designation, typeFiche },
    });

    const [newFiche]: any = await pool.query(
      'SELECT * FROM fiches WHERE idFiche = ?', [idFiche]
    );

    sendSuccess(res, newFiche[0], 'Fiche créée avec succès', 201);

  } catch (error) { next(error); }
};

// -----------------------------------------------------------
// PUT /api/v1/fiches/:id
// Modifier une fiche — Admin uniquement
// -----------------------------------------------------------
export const updateFiche = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const [existing]: any = await pool.query(
      'SELECT * FROM fiches WHERE idFiche = ?', [id]
    );
    if (existing.length === 0) return next(notFound('Fiche introuvable'));

    const fiche = existing[0];

    // RG12 équivalent — événement archivé non modifiable
    if (fiche.typeFiche === 'Événement' && fiche.archive) {
      return next(badRequest('Événement archivé — modification non autorisée'));
    }

    const {
      designation, description,
      latitude, longitude, dateClassement, categorie, etatConservation,
      matiere, epoque, provenance, hauteurObjet, largeurObjet,
      communautePorteuse, region, frequence,
      nomArtisan, prenomArtisan, specialite,
      typeEvenement, accesEvenement, dateEvenement, organisateur,
    } = req.body;

    await pool.query(
      `UPDATE fiches SET
        designation       = COALESCE(?, designation),
        description       = COALESCE(?, description),
        latitude          = COALESCE(?, latitude),
        longitude         = COALESCE(?, longitude),
        dateClassement    = COALESCE(?, dateClassement),
        categorie         = COALESCE(?, categorie),
        etatConservation  = COALESCE(?, etatConservation),
        matiere           = COALESCE(?, matiere),
        epoque            = COALESCE(?, epoque),
        provenance        = COALESCE(?, provenance),
        hauteurObjet      = COALESCE(?, hauteurObjet),
        largeurObjet      = COALESCE(?, largeurObjet),
        communautePorteuse = COALESCE(?, communautePorteuse),
        region            = COALESCE(?, region),
        frequence         = COALESCE(?, frequence),
        nomArtisan        = COALESCE(?, nomArtisan),
        prenomArtisan     = COALESCE(?, prenomArtisan),
        specialite        = COALESCE(?, specialite),
        typeEvenement     = COALESCE(?, typeEvenement),
        accesEvenement    = COALESCE(?, accesEvenement),
        dateEvenement     = COALESCE(?, dateEvenement),
        organisateur      = COALESCE(?, organisateur)
       WHERE idFiche = ?`,
      [
        designation, description,
        latitude, longitude, dateClassement, categorie, etatConservation,
        matiere, epoque, provenance, hauteurObjet, largeurObjet,
        communautePorteuse, region, frequence,
        nomArtisan, prenomArtisan, specialite,
        typeEvenement, accesEvenement, dateEvenement, organisateur,
        id,
      ]
    );

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Modification',
      details: { idFiche: id, designation: designation || fiche.designation },
    });

    const [updated]: any = await pool.query(
      'SELECT * FROM fiches WHERE idFiche = ?', [id]
    );

    sendSuccess(res, updated[0], 'Fiche mise à jour avec succès');

  } catch (error) { next(error); }
};

// -----------------------------------------------------------
// DELETE /api/v1/fiches/:id
// Supprimer une fiche — Admin uniquement
// -----------------------------------------------------------
export const deleteFiche = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const [existing]: any = await pool.query(
      'SELECT * FROM fiches WHERE idFiche = ?', [id]
    );
    if (existing.length === 0) return next(notFound('Fiche introuvable'));

    // Supprimer les médias liés d'abord
    await pool.query('DELETE FROM medias WHERE idFiche = ?', [id]);

    // Supprimer les tickets liés
    await pool.query('DELETE FROM tickets WHERE idFiche = ?', [id]);

    // Supprimer la fiche
    await pool.query('DELETE FROM fiches WHERE idFiche = ?', [id]);

    await logAction({
      idUser: req.user!.idUser,
      actionLog: 'Suppression',
      details: existing[0],
    });

    sendSuccess(res, null, 'Fiche supprimée avec succès');

  } catch (error) { next(error); }
};

// -----------------------------------------------------------
// PUT /api/v1/fiches/:id/archiver
// Archiver un événement — Admin uniquement
// -----------------------------------------------------------
export const archiverFiche = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const [existing]: any = await pool.query(
      'SELECT * FROM fiches WHERE idFiche = ?', [id]
    );
    if (existing.length === 0) return next(notFound('Fiche introuvable'));

    const fiche = existing[0];

    if (fiche.typeFiche !== 'Événement') {
      return next(badRequest('Seuls les événements peuvent être archivés'));
    }

    const newArchive = !fiche.archive;

    await pool.query(
      'UPDATE fiches SET archive = ? WHERE idFiche = ?',
      [newArchive, id]
    );

    await logAction({
      idUser: req.user!.idUser,
      actionLog: newArchive ? 'Archivage' : 'Désarchivage',
      details: { idFiche: id, designation: fiche.designation },
    });

    sendSuccess(res, null,
      newArchive ? 'Événement archivé avec succès' : 'Événement désarchivé avec succès'
    );

  } catch (error) { next(error); }
};