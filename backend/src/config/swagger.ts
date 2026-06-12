import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SGRP API',
      version: '1.0.0',
      description: `
        **Système de Gestion des Référentiels Patrimoniaux**
        Ministère du Tourisme, de la Culture et des Arts — Bénin

        Cette API permet de gérer les 5 référentiels du patrimoine culturel béninois :
        Sites & Monuments, Objets Culturels, Pratiques Immatérielles, Artisans, Événements.

        **Authentification** : JWT Bearer Token — obtenir via POST /api/v1/auth/login
      `,
      contact: {
        name: 'DSI — MTCA Bénin',
        email: 'dsi@mtca.bj',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Serveur de développement' },
    ],
    // Définition du schéma de sécurité JWT
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenu via POST /api/v1/auth/login',
        },
      },
      // Schémas réutilisables
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success:  { type: 'boolean', example: true },
            status:   { type: 'integer', example: 200 },
            message:  { type: 'string',  example: 'Opération réussie' },
            data:     { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success:  { type: 'boolean', example: false },
            status:   { type: 'integer', example: 400 },
            message:  { type: 'string',  example: 'Données invalides' },
            errors:   { type: 'array',   items: { type: 'string' } },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total:      { type: 'integer', example: 42 },
            page:       { type: 'integer', example: 1 },
            limit:      { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
        StatutWorkflow: {
          type: 'string',
          enum: ['Brouillon', 'Soumis', 'Validé', 'Publié'],
          example: 'Brouillon',
        },
        Site: {
          type: 'object',
          properties: {
            id:               { type: 'integer', example: 1 },
            denomination:     { type: 'string',  example: 'Palais Royal d\'Abomey' },
            description:      { type: 'string',  example: 'Ancienne capitale du Dahomey' },
            latitude:         { type: 'number',  example: 7.1833 },
            longitude:        { type: 'number',  example: 1.9833 },
            departement:      { type: 'string',  example: 'Zou' },
            etat_conservation:{ type: 'string',  enum: ['Bon', 'Passable', 'Dégradé'] },
            statut_workflow:  { $ref: '#/components/schemas/StatutWorkflow' },
            date_creation:    { type: 'string',  format: 'date-time' },
          },
        },
        Objet: {
          type: 'object',
          properties: {
            id:             { type: 'integer', example: 1 },
            num_inventaire: { type: 'string',  example: 'INV-2026-0001' },
            nom_objet:      { type: 'string',  example: 'Trône Royal de Béhanzin' },
            description:    { type: 'string' },
            matiere:        { type: 'string',  example: 'Bois et tissu' },
            epoque_origine: { type: 'string',  example: 'XIXe siècle' },
            musee_actuel:   { type: 'string',  example: 'Musée Historique d\'Abomey' },
            statut_workflow:{ $ref: '#/components/schemas/StatutWorkflow' },
          },
        },
        Pratique: {
          type: 'object',
          properties: {
            id:                  { type: 'integer', example: 1 },
            intitule:            { type: 'string',  example: 'Danse Gèlèdé' },
            description:         { type: 'string' },
            communaute_porteuse: { type: 'string',  example: 'Yoruba' },
            region_origine:      { type: 'string',  example: 'Mono' },
            statut_workflow:     { $ref: '#/components/schemas/StatutWorkflow' },
          },
        },
        Artisan: {
          type: 'object',
          properties: {
            id:          { type: 'integer', example: 1 },
            nom_complet: { type: 'string',  example: 'Didier Ahouansou' },
            specialite:  { type: 'string',  example: 'Sculpture sur bois' },
            localite:    { type: 'string',  example: 'Abomey-Calavi' },
            statut_workflow: { $ref: '#/components/schemas/StatutWorkflow' },
          },
        },
        Evenement: {
          type: 'object',
          properties: {
            id:          { type: 'integer', example: 1 },
            titre:       { type: 'string',  example: 'Festival de Ouidah' },
            theme:       { type: 'string',  example: 'Vodoun et Patrimoine' },
            description: { type: 'string' },
            date_debut:  { type: 'string',  format: 'date', example: '2026-01-10' },
            date_fin:    { type: 'string',  format: 'date', example: '2026-01-12' },
            lieu:        { type: 'string',  example: 'Ouidah' },
            statut_workflow: { $ref: '#/components/schemas/StatutWorkflow' },
          },
        },
      },
    },
    // Sécurité globale — toutes les routes nécessitent JWT sauf indication contraire
    security: [{ BearerAuth: [] }],
  },
  // Swagger scanne ces fichiers pour les annotations JSDoc
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);