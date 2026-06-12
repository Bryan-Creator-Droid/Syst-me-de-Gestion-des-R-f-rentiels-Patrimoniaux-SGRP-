-- ============================================================
-- SGRP — Système de Gestion des Référentiels Patrimoniaux
-- Ministère du Tourisme, de la Culture et des Arts — Bénin
-- Version 2.0 — Nouvelle architecture
-- ============================================================

CREATE DATABASE IF NOT EXISTS sgrp_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sgrp_db;

-- ------------------------------------------------------------
-- TABLE 1 : utilisateurs
-- Admin + Visiteur dans une seule table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS utilisateurs (
  idUser        VARCHAR(255)  PRIMARY KEY,
  emailUser     VARCHAR(150)  NOT NULL UNIQUE,
  mdpUser       VARCHAR(255)  NOT NULL,
  nom           VARCHAR(100),
  prenom        VARCHAR(100),
  sexe          ENUM('Masculin', 'Feminin'),
  pays          ENUM(
                  -- Afrique
                  'Bénin', 'Togo', 'Nigeria', 'Ghana', 'Côte d\'Ivoire',
                  'Sénégal', 'Mali', 'Burkina Faso', 'Niger', 'Cameroun',
                  -- Europe francophone
                  'France', 'Belgique', 'Suisse', 'Luxembourg', 'Monaco',
                  'Canada', 'Maroc', 'Tunisie', 'Algérie', 'Congo'
                ),
  role          ENUM('Admin', 'Visiteur') NOT NULL DEFAULT 'Visiteur',
  tentatives    TINYINT       NOT NULL DEFAULT 0,
  bloque        BOOLEAN       NOT NULL DEFAULT FALSE,
  date_creation TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- TABLE 2 : fiches
-- Tous les référentiels en une seule table
-- Les champs spécifiques sont NULL selon le type
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiches (
  idFiche           VARCHAR(255)  PRIMARY KEY,
  designation       VARCHAR(100)  NOT NULL,
  description       VARCHAR(255),

  -- Champs communs géolocalisation (sites, monuments)
  latitude          DECIMAL(10,8),
  longitude         DECIMAL(10,8),
  dateClassement    TIMESTAMP,
  categorie         ENUM('UNESCO', 'Nationale', 'Locale'),
  etatConservation  ENUM('Bon', 'Passable', 'Dégradé'),

  -- Champs spécifiques objets culturels
  matiere           VARCHAR(100),
  epoque            VARCHAR(100),
  provenance        VARCHAR(100),
  hauteurObjet      DECIMAL(6,3),
  largeurObjet      DECIMAL(6,3),

  -- Champs spécifiques pratiques immatérielles
  communautePorteuse VARCHAR(100),
  region            VARCHAR(100),
  frequence         ENUM('Faible', 'Moyenne', 'Elevée'),

  -- Champs spécifiques artisans
  nomArtisan        VARCHAR(50),
  prenomArtisan     VARCHAR(100),
  specialite        VARCHAR(200),

  -- Champs spécifiques événements
  typeEvenement     ENUM('Festival', 'Ceremonie', 'Exposition', 'Atelier',
                         'Concours', 'Parade', 'Rituel', 'Conférence'),
  accesEvenement    ENUM('Gratuit', 'Payant'),
  dateEvenement     TIMESTAMP,
  organisateur      VARCHAR(100),
  archive           BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Métadonnées
  typeFiche         ENUM('Site', 'Objet', 'Pratique', 'Artisan', 'Événement') NOT NULL,
  cree_par          VARCHAR(255)  NOT NULL,
  date_creation     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (cree_par) REFERENCES utilisateurs(idUser)
);

-- ------------------------------------------------------------
-- TABLE 3 : musees
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS musees (
  idMusee       VARCHAR(255)  PRIMARY KEY,
  nomMusee      VARCHAR(100)  NOT NULL,
  longitude     DECIMAL(10,8) NOT NULL,
  latitude      DECIMAL(10,8) NOT NULL,
  adresse       VARCHAR(255)  NOT NULL,
  date_creation TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- TABLE 4 : visites
-- Proposées par des structures tierces, gérées en CRUD
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visites (
  idVisite      VARCHAR(255)  PRIMARY KEY,
  guide         VARCHAR(100)  NOT NULL,
  dateVisite    TIMESTAMP     NOT NULL,
  heureDebut    TIMESTAMP     NOT NULL,
  date_creation TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- TABLE 5 : visite_fiches
-- Association entre une visite et les fiches qu'elle couvre
-- idVisite, idFiche → dateVisite, heureDebutVisite
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visite_fiches (
  idVisite      VARCHAR(255)  NOT NULL,
  idFiche       VARCHAR(255)  NOT NULL,
  PRIMARY KEY (idVisite, idFiche),
  FOREIGN KEY (idVisite) REFERENCES visites(idVisite),
  FOREIGN KEY (idFiche)  REFERENCES fiches(idFiche)
);

-- ------------------------------------------------------------
-- TABLE 6 : rdvs
-- Rendez-vous lié à une visite et un visiteur
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rdvs (
  idRdv         VARCHAR(255)  PRIMARY KEY,
  dateRdv       TIMESTAMP     NOT NULL,
  heureDebutRdv TIMESTAMP     NOT NULL,
  idVisiteur    VARCHAR(255)  NOT NULL,
  idVisite      VARCHAR(255)  NOT NULL,
  date_creation TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idVisiteur) REFERENCES utilisateurs(idUser),
  FOREIGN KEY (idVisite)   REFERENCES visites(idVisite)
);

-- ------------------------------------------------------------
-- TABLE 7 : commentaires
-- Laissés par un visiteur sur une visite
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commentaires (
  idCommentaire VARCHAR(255)  PRIMARY KEY,
  contenus      VARCHAR(255)  NOT NULL,
  dateCom       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  idVisiteur    VARCHAR(255)  NOT NULL,
  idVisite      VARCHAR(255)  NOT NULL,
  FOREIGN KEY (idVisiteur) REFERENCES utilisateurs(idUser),
  FOREIGN KEY (idVisite)   REFERENCES visites(idVisite)
);

-- ------------------------------------------------------------
-- TABLE 8 : type_tickets
-- Types de tickets disponibles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS type_tickets (
  codeType      VARCHAR(100)  PRIMARY KEY,
  nomType       ENUM('VIP', 'Standard', 'Gratuit') NOT NULL
);

-- ------------------------------------------------------------
-- TABLE 9 : tickets
-- Prix variable selon la fiche — codeType, idFiche → prix
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  idTicket      VARCHAR(255)  PRIMARY KEY,
  idFiche       VARCHAR(255)  NOT NULL,
  codeType      VARCHAR(100)  NOT NULL,
  prix          DECIMAL(6,3)  NOT NULL,
  date_creation TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idFiche)   REFERENCES fiches(idFiche),
  FOREIGN KEY (codeType)  REFERENCES type_tickets(codeType)
);

-- ------------------------------------------------------------
-- TABLE 10 : logs
-- Journal de traçabilité — remplace audit_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
  idLog         VARCHAR(255)  PRIMARY KEY,
  actionLog     ENUM('Création', 'Modification', 'Suppression',
                     'Connexion', 'Blocage', 'Déplacement',
                     'Archivage', 'Désarchivage') NOT NULL,
  dateLog       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  idUser        VARCHAR(255)  NOT NULL,
  FOREIGN KEY (idUser) REFERENCES utilisateurs(idUser)
);

-- ------------------------------------------------------------
-- TABLE 11 : medias
-- Photos, vidéos, documents, audios liés à une fiche
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medias (
  idMedias      VARCHAR(255)  PRIMARY KEY,
  urlChemin     VARCHAR(255)  NOT NULL,
  typeFiche     ENUM('Site', 'Objet', 'Pratique', 'Artisan', 'Événement') NOT NULL,
  typeFichier   ENUM('Photo', 'Video', 'Document', 'Audio') NOT NULL,
  idFiche       VARCHAR(255)  NOT NULL,
  idUser        VARCHAR(255)  NOT NULL,
  date_upload   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idFiche) REFERENCES fiches(idFiche),
  FOREIGN KEY (idUser)  REFERENCES utilisateurs(idUser)
);

-- Pré-insertion des types de tickets
INSERT INTO type_tickets (codeType, nomType) VALUES 
  ('STD', 'Standard'),
  ('VIP', 'VIP');

-- Table achats
CREATE TABLE IF NOT EXISTS achats (
  idAchat        VARCHAR(255)  PRIMARY KEY,
  idTicket       VARCHAR(255)  NOT NULL,
  idVisiteur     VARCHAR(255)  NOT NULL,
  montant        DECIMAL(6,3)  NOT NULL,
  statutPaiement ENUM('En attente', 'Payé', 'Échoué') NOT NULL DEFAULT 'En attente',
  referenceMomo  VARCHAR(255),
  codeQR         TEXT,
  date_achat     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idTicket)   REFERENCES tickets(idTicket),
  FOREIGN KEY (idVisiteur) REFERENCES utilisateurs(idUser)
);

-- Capacité max dans visites
ALTER TABLE visites ADD COLUMN capaciteMax    INT NOT NULL DEFAULT 20;
ALTER TABLE visites ADD COLUMN nbParticipants INT NOT NULL DEFAULT 0;