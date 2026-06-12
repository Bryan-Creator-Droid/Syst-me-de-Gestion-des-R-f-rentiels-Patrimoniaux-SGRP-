# SGRP — Système de Gestion des Référentiels Patrimoniaux
Ministère du Tourisme, de la Culture et des Arts — Bénin

## Installation

### 1. Cloner le projet
git clone <url_du_depot>
cd sgrp

### 2. Configurer les variables d'environnement
cp backend/.env.example backend/.env
# Remplir les valeurs dans backend/.env

### 3. Créer la base de données
mysql -u root -p < database/init/schema.sql

### 4. Installer les dépendances
cd backend && npm install
cd ../frontend && npm install

### 5. Lancer le projet
cd backend && npm run dev
cd ../frontend && npm run dev