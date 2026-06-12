# 📚 Guide Complet des APIs SGRP — Intégration Frontend

**Version:** 2.0  
**Dernière mise à jour:** Juin 2024  
**Audience:** Développeurs Frontend  

---

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Structure de base des APIs](#structure-de-base-des-apis)
3. [Gestion de la base de données côté Frontend](#gestion-de-la-base-de-données-côté-frontend)
4. [Configuration et initialisation](#configuration-et-initialisation)
5. [Authentification JWT](#authentification-jwt)
6. [Endpoints complets](#endpoints-complets)
7. [Exemples pratiques](#exemples-pratiques)
8. [Gestion des erreurs](#gestion-des-erreurs)
9. [Best practices](#best-practices)

---

## 1. Introduction

SGRP est un système de gestion des référentiels patrimoniaux. L'API backend fournit tous les services nécessaires pour gérer les sites, les objets culturels, les pratiques immatérielles, etc.

### Informations de connexion API

- **Base URL (Développement):** `http://localhost:3000`
- **Base URL (Production):** À définir
- **Version API:** `/api/v1`
- **Documentation interactive:** `http://localhost:3000/docs` (Swagger)

### Vérifier la santé du serveur

```bash
curl http://localhost:3000/health
```

**Réponse attendue:**
```json
{
  "success": true,
  "status": 200,
  "message": "Serveur SGRP opérationnel",
  "version": "2.0",
  "timestamp": "2024-06-12T10:30:00Z"
}
```

---

## 2. Structure de base des APIs

### 2.1 Format de réponse standard

Toutes les réponses suivent ce format unifié :

#### ✅ Réponse réussie

```json
{
  "success": true,
  "status": 200,
  "message": "Description de ce qui s'est passé",
  "data": {
    // Les données retournées
  }
}
```

#### ❌ Réponse avec erreur

```json
{
  "success": false,
  "status": 400,
  "message": "Description de l'erreur",
  "errors": [
    {
      "field": "emailUser",
      "message": "Email invalide"
    }
  ]
}
```

### 2.2 Structure HTTP

| Aspect | Détail |
|--------|--------|
| **Content-Type** | `application/json` |
| **Authentification** | Bearer Token (JWT) |
| **Codes HTTP** | 200, 201, 400, 401, 403, 404, 422, 500 |

### 2.3 Headers obligatoires

```javascript
// En-têtes standard
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"  // Pour les routes protégées
}
```

---

## 3. Gestion de la base de données côté Frontend

### 3.1 Qu'est-ce que vous devez savoir

Le backend gère **directement** la base de données MySQL. Le frontend ne doit **jamais** accéder directement à la base de données. Toutes les données passent par l'API.

### 3.2 Schéma de données à mémoriser (côté Frontend)

Avant d'intégrer les APIs, familiarisez-vous avec la structure des principales entités :

#### **Utilisateurs (utilisateurs)**
```typescript
interface Utilisateur {
  idUser: string;              // UUID généré par le backend
  emailUser: string;           // Unique, sensible à la casse
  mdpUser: string;             // Jamais exposé via API
  nom: string;
  prenom: string;
  sexe: 'Masculin' | 'Feminin';
  pays: string;
  role: 'Admin' | 'Visiteur';
  tentatives: number;          // Compteur d'échecs de login
  bloque: boolean;             // Compte bloqué après 3 tentatives
  date_creation: Date;
}
```

#### **Fiches (référentiels patrimoniaux)**
```typescript
interface Fiche {
  idFiche: string;             // UUID
  designation: string;         // Nom/titre
  description: string;
  typeFiche: 'Site' | 'Objet' | 'Pratique' | 'Artisan' | 'Événement';
  
  // Pour Sites (monuments, sites archéologiques)
  latitude?: number;
  longitude?: number;
  dateClassement?: Date;
  categorie?: 'UNESCO' | 'Nationale' | 'Locale';
  etatConservation?: 'Bon' | 'Passable' | 'Dégradé';
  
  // Pour Objets culturels
  matiere?: string;
  epoque?: string;
  provenance?: string;
  hauteurObjet?: number;
  largeurObjet?: number;
  
  // Pour Pratiques immatérielles
  communautePorteuse?: string;
  region?: string;
  frequence?: 'Faible' | 'Moyenne' | 'Elevée';
  
  // Pour Artisans
  nomArtisan?: string;
  prenomArtisan?: string;
  specialite?: string;
  
  // Pour Événements
  typeEvenement?: 'Festival' | 'Ceremonie' | 'Exposition' | 'Atelier' | 'Concours' | 'Parade' | 'Rituel' | 'Conférence';
  dateEvenement?: Date;
  accesEvenement?: 'Gratuit' | 'Payant';
  organisateur?: string;
  
  archive: boolean;
  cree_par: string;            // idUser de l'admin créateur
  date_creation: Date;
  date_modification: Date;
}
```

#### **Visites (proposées par des structures)**
```typescript
interface Visite {
  idVisite: string;
  guide: string;               // Nom du guide
  dateVisite: Date;
  heureDebut: Date;            // Heure de début
  capaciteMax: number;         // Max participants
  nbParticipants: number;      // Actuellement inscrits
  date_creation: Date;
}
```

#### **Tickets et Achats**
```typescript
interface Ticket {
  idTicket: string;
  idFiche: string;
  codeType: 'STD' | 'VIP';
  prix: number;                // en devise locale
  date_creation: Date;
}

interface Achat {
  idAchat: string;
  idTicket: string;
  idVisiteur: string;
  montant: number;
  statutPaiement: 'En attente' | 'Payé' | 'Échoué';
  referenceMomo?: string;      // Référence Moov Money/Mobile Money
  codeQR?: string;             // Code QR encodé en base64
  date_achat: Date;
}
```

### 3.3 Comment mémoriser les données côté Frontend

**Option 1: avec React Context API** (recommandé pour petit/moyen projet)
```javascript
// store/FichesContext.ts
import React, { createContext, useState, useCallback } from 'react';

export const FichesContext = createContext();

export function FichesProvider({ children }) {
  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFiches = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(
        `http://localhost:3000/api/v1/fiches?${params}`
      );
      const json = await response.json();
      
      if (json.success) {
        setFiches(json.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <FichesContext.Provider value={{ fiches, loading, error, fetchFiches }}>
      {children}
    </FichesContext.Provider>
  );
}
```

**Option 2: avec TanStack Query (pour gestion avancée)**
```javascript
import { useQuery, useMutation } from '@tanstack/react-query';

// Hook personnalisé
export function useFiches(filters = {}) {
  return useQuery({
    queryKey: ['fiches', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await fetch(
        `http://localhost:3000/api/v1/fiches?${params}`
      );
      const json = await response.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    },
    staleTime: 1000 * 60 * 5,  // Cache 5 minutes
  });
}

// Utilisation dans un composant
export function FichesList() {
  const { data: fiches, isLoading, error } = useFiches({ typeFiche: 'Site' });
  
  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;
  
  return fiches.map(fiche => <FicheCard key={fiche.idFiche} fiche={fiche} />);
}
```

**Option 3: avec LocalStorage + API (simple cache local)**
```javascript
// utils/cache.ts
export const cacheManager = {
  set: (key, data, ttl = 5 * 60 * 1000) => {
    const item = {
      data,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(key, JSON.stringify(item));
  },
  
  get: (key) => {
    const item = JSON.parse(localStorage.getItem(key) || '{}');
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.data;
  }
};

// Utilisation
async function getFiches() {
  const cached = cacheManager.get('fiches');
  if (cached) return cached;
  
  const response = await fetch('http://localhost:3000/api/v1/fiches');
  const json = await response.json();
  
  if (json.success) {
    cacheManager.set('fiches', json.data);
    return json.data;
  }
}
```

---

## 4. Configuration et initialisation

### 4.1 Configuration du client API

Créez un fichier utilitaire pour centraliser toutes les requêtes API :

```javascript
// services/api.ts
class APIClient {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  // Définir le token après connexion
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  // Nettoyer le token à la déconnexion
  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // Requête générique
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Vérifier si token expiré (401)
      if (response.status === 401 && this.token) {
        this.clearToken();
        window.location.href = '/login';
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Erreur inconnue');
      }

      return data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Méthodes raccourcis
  get(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body, options) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new APIClient();
```

### 4.2 Initialiser l'application

```javascript
// main.tsx ou App.tsx
import { api } from './services/api';

// Au démarrage de l'app, vérifier si un token existe
useEffect(() => {
  const token = localStorage.getItem('authToken');
  if (token) {
    api.setToken(token);
    // Optionnel: vérifier si le token est toujours valide
    checkTokenValidity();
  }
}, []);
```

---

## 5. Authentification JWT

### 5.1 Flux d'authentification

```
Utilisateur se connecte
        ↓
POST /api/v1/auth/login (email + mdp)
        ↓
Backend vérifie le mot de passe
        ↓
Backend génère JWT token
        ↓
Frontend reçoit le token
        ↓
Frontend stocke le token en localStorage/sessionStorage
        ↓
Frontend ajoute le token à tous les headers Authorization
```

### 5.2 Contenu du token JWT

Le token contient (payload):
```json
{
  "idUser": "uuid-12345",
  "emailUser": "user@example.com",
  "role": "Admin|Visiteur",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### 5.3 Durée de validité

- **Durée:** 8 heures (par défaut)
- **Après expiration:** L'API retourne 401 Unauthorized
- **Solution:** Rediriger vers login ou implémenter un refresh token

---

## 6. Endpoints complets

### 🔐 AUTHENTIFICATION

#### POST /api/v1/auth/login
Connexion utilisateur

**Request:**
```json
{
  "emailUser": "admin@sgrp.bj",
  "mdpUser": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "status": 200,
  "message": "Connexion réussie",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "role": "Admin",
    "nom": "Doe",
    "prenom": "John"
  }
}
```

**Erreurs possibles:**
- `400` - Email ou mot de passe manquant
- `401` - Identifiants incorrects
- `401` - Compte bloqué après 3 tentatives

---

#### POST /api/v1/auth/register
Inscription (Visiteur uniquement)

**Request:**
```json
{
  "emailUser": "visitor@example.com",
  "mdpUser": "securePassword123",
  "nom": "Dupont",
  "prenom": "Marie",
  "sexe": "Feminin",
  "pays": "Bénin"
}
```

**Response (201):**
```json
{
  "success": true,
  "status": 201,
  "message": "Inscription réussie",
  "data": {
    "idUser": "550e8400-e29b-41d4-a716-446655440000",
    "emailUser": "visitor@example.com",
    "role": "Visiteur"
  }
}
```

**Erreurs possibles:**
- `400` - Champs manquants
- `400` - Email déjà utilisé

---

### 📁 FICHES (Référentiels patrimoniaux)

#### GET /api/v1/fiches
Lister toutes les fiches avec pagination et filtres

**Query Parameters:**
```
page=1&limit=10&typeFiche=Site&categorie=UNESCO
```

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | number | 1 | Numéro de page |
| `limit` | number | 10 | Items par page (max 50) |
| `typeFiche` | string | - | Filtrer par type |
| `categorie` | string | - | Filtrer par catégorie |

**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Fiches récupérées",
  "data": {
    "fiches": [
      {
        "idFiche": "550e8400-e29b-41d4-a716-446655440000",
        "designation": "Palais d'Abomey",
        "description": "Ancien palais royal du Royaume d'Abomey",
        "typeFiche": "Site",
        "categorie": "UNESCO",
        "etatConservation": "Bon",
        "date_creation": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

---

#### GET /api/v1/fiches/:id
Récupérer les détails complets d'une fiche

**Response:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "idFiche": "550e8400-e29b-41d4-a716-446655440000",
    "designation": "Palais d'Abomey",
    "description": "Ancien palais royal du Royaume d'Abomey",
    "typeFiche": "Site",
    "latitude": 9.3069,
    "longitude": 1.9913,
    "dateClassement": "1985-12-10T00:00:00Z",
    "categorie": "UNESCO",
    "etatConservation": "Bon",
    "archive": false,
    "cree_par": "550e8400-e29b-41d4-a716-446655440000",
    "date_creation": "2024-01-15T10:30:00Z",
    "date_modification": "2024-01-20T14:45:00Z"
  }
}
```

---

#### POST /api/v1/fiches
Créer une nouvelle fiche (Admin uniquement) ⚠️ Authentification requise

**Request (Site):**
```json
{
  "designation": "Palais d'Abomey",
  "description": "Ancien palais royal",
  "typeFiche": "Site",
  "latitude": 9.3069,
  "longitude": 1.9913,
  "dateClassement": "1985-12-10T00:00:00Z",
  "categorie": "UNESCO",
  "etatConservation": "Bon"
}
```

**Request (Objet):**
```json
{
  "designation": "Masque Gélédé",
  "description": "Masque rituel yoruba",
  "typeFiche": "Objet",
  "matiere": "Bois sculptéé",
  "epoque": "19ème siècle",
  "provenance": "Nigéria",
  "hauteurObjet": 0.45,
  "largeurObjet": 0.30
}
```

**Response (201):**
```json
{
  "success": true,
  "status": 201,
  "message": "Fiche créée avec succès",
  "data": {
    "idFiche": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

#### PUT /api/v1/fiches/:id
Modifier une fiche (Admin uniquement) ⚠️ Authentification requise

**Request:**
```json
{
  "designation": "Palais d'Abomey - Musée",
  "etatConservation": "Passable"
}
```

**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Fiche mise à jour avec succès"
}
```

---

#### DELETE /api/v1/fiches/:id
Supprimer une fiche (Admin uniquement) ⚠️ Authentification requise

**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Fiche supprimée avec succès"
}
```

---

#### PUT /api/v1/fiches/:id/archiver
Archiver une fiche (Admin uniquement) ⚠️ Authentification requise

**Request:**
```json
{
  "archive": true
}
```

**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Fiche archivée avec succès"
}
```

---

### 🏛️ MUSÉES

#### GET /api/v1/musees
Lister tous les musées

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "idMusee": "550e8400-e29b-41d4-a716-446655440000",
      "nomMusee": "Musée du Quai Branly",
      "longitude": 2.2945,
      "latitude": 48.8611,
      "adresse": "37 Quai Branly, 75015 Paris",
      "date_creation": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

#### POST /api/v1/musees
Créer un musée (Admin uniquement) ⚠️

**Request:**
```json
{
  "nomMusee": "Musée National de Cotonou",
  "longitude": 2.0443,
  "latitude": 6.4969,
  "adresse": "rue Pythagore, Cotonou"
}
```

---

### 🚶 VISITES

#### GET /api/v1/visites
Lister toutes les visites disponibles

**Query Parameters:**
```
page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "visites": [
      {
        "idVisite": "550e8400-e29b-41d4-a716-446655440000",
        "guide": "Jean Dupont",
        "dateVisite": "2024-06-20T09:00:00Z",
        "heureDebut": "2024-06-20T09:00:00Z",
        "capaciteMax": 20,
        "nbParticipants": 5,
        "date_creation": "2024-06-01T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 12
    }
  }
}
```

---

#### POST /api/v1/visites
Créer une visite (Admin uniquement) ⚠️

**Request:**
```json
{
  "guide": "Jean Dupont",
  "dateVisite": "2024-06-20T09:00:00Z",
  "heureDebut": "2024-06-20T09:00:00Z",
  "capaciteMax": 20
}
```

---

### 📅 RENDEZ-VOUS

#### POST /api/v1/rdvs
Réserver un rendez-vous (Authentification requise) ⚠️

**Request:**
```json
{
  "dateRdv": "2024-06-20T09:00:00Z",
  "heureDebutRdv": "2024-06-20T09:00:00Z",
  "idVisite": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (201):**
```json
{
  "success": true,
  "status": 201,
  "message": "Rendez-vous créé",
  "data": {
    "idRdv": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### 💬 COMMENTAIRES

#### POST /api/v1/commentaires
Laisser un commentaire (Authentification requise) ⚠️

**Request:**
```json
{
  "contenus": "Visite magnifique, très instructive!",
  "idVisite": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

#### GET /api/v1/commentaires?idVisite=...
Récupérer les commentaires d'une visite

---

### 🎫 TICKETS

#### GET /api/v1/tickets
Lister les types de tickets

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "idTicket": "550e8400-e29b-41d4-a716-446655440000",
      "idFiche": "550e8400-e29b-41d4-a716-446655440001",
      "codeType": "STD",
      "prix": 5000,
      "date_creation": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 🛍️ ACHATS & PAIEMENT

#### POST /api/v1/achats
Créer un achat/commande de ticket (Authentification requise) ⚠️

**Request:**
```json
{
  "idTicket": "550e8400-e29b-41d4-a716-446655440000",
  "montant": 5000
}
```

**Response (201):**
```json
{
  "success": true,
  "status": 201,
  "data": {
    "idAchat": "550e8400-e29b-41d4-a716-446655440000",
    "codeQR": "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw...",
    "referenceMomo": "TRX123456789",
    "statutPaiement": "En attente"
  }
}
```

---

#### GET /api/v1/achats/:idAchat
Récupérer les détails d'un achat

---

### 📸 MÉDIAS (Photos, vidéos, documents)

#### GET /api/v1/medias?idFiche=...
Lister les médias d'une fiche

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "idMedias": "550e8400-e29b-41d4-a716-446655440000",
      "urlChemin": "/uploads/photos/palais-abomey-01.jpg",
      "typeFiche": "Site",
      "typeFichier": "Photo",
      "idFiche": "550e8400-e29b-41d4-a716-446655440001",
      "date_upload": "2024-06-12T10:30:00Z"
    }
  ]
}
```

---

#### POST /api/v1/medias/upload
Uploader un média (Authentification requise) ⚠️

**Attention:** Cette requête utilise `multipart/form-data`, pas JSON

```javascript
const formData = new FormData();
formData.append('file', fichier);  // HTMLInputElement.files[0]
formData.append('idFiche', 'uuid-fiche');
formData.append('typeFichier', 'Photo');  // Photo, Video, Document, Audio

const response = await fetch(
  'http://localhost:3000/api/v1/medias/upload',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  }
);
```

---

### 🔍 RECHERCHE

#### GET /api/v1/search?q=...
Recherche full-text dans tous les référentiels

**Query Parameters:**
```
q=palais&typeFiche=Site&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "resultats": [
      {
        "idFiche": "550e8400-e29b-41d4-a716-446655440000",
        "designation": "Palais d'Abomey",
        "typeFiche": "Site",
        "relevance": 0.95
      }
    ],
    "total": 15
  }
}
```

---

### 📊 EXPORT

#### GET /api/v1/export/csv?typeFiche=Site
Exporter les fiches en CSV

**Headers attendus:**
```
Authorization: Bearer <token>  (Admin uniquement)
```

**Response:** Fichier CSV binaire

---

#### GET /api/v1/export/pdf?idFiche=...
Exporter une fiche en PDF

**Response:** Fichier PDF binaire

---

## 7. Exemples pratiques

### 7.1 Exemple complet: Connexion et récupération de fiches

```javascript
// 1. Connexion
async function login() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailUser: 'admin@sgrp.bj',
        mdpUser: 'password123'
      })
    });

    const json = await response.json();
    
    if (!json.success) {
      console.error('Erreur de connexion:', json.message);
      return;
    }

    // Stocker le token
    const { token } = json.data;
    localStorage.setItem('authToken', token);
    console.log('Connecté avec succès!');
    
    // Récupérer les fiches
    await getFiches();

  } catch (error) {
    console.error('Erreur:', error);
  }
}

// 2. Récupérer les fiches
async function getFiches() {
  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch(
      'http://localhost:3000/api/v1/fiches?page=1&limit=10&typeFiche=Site',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const json = await response.json();

    if (json.success) {
      console.log('Fiches récupérées:', json.data.fiches);
      afficherFiches(json.data.fiches);
    }

  } catch (error) {
    console.error('Erreur:', error);
  }
}

// 3. Afficher les fiches dans le DOM
function afficherFiches(fiches) {
  const container = document.getElementById('fiches-list');
  
  fiches.forEach(fiche => {
    const div = document.createElement('div');
    div.innerHTML = `
      <h3>${fiche.designation}</h3>
      <p>${fiche.description}</p>
      <span>Type: ${fiche.typeFiche}</span>
    `;
    container.appendChild(div);
  });
}

// Lancer la connexion
login();
```

---

### 7.2 Exemple: Créer une fiche (Admin uniquement)

```javascript
async function createFiche() {
  const token = localStorage.getItem('authToken');

  const newFiche = {
    designation: "Nouvelles Ruines",
    description: "Un site archéologique récemment découvert",
    typeFiche: "Site",
    latitude: 9.5,
    longitude: 2.0,
    categorie: "Nationale",
    etatConservation: "Dégradé"
  };

  try {
    const response = await fetch(
      'http://localhost:3000/api/v1/fiches',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newFiche)
      }
    );

    const json = await response.json();

    if (json.success) {
      console.log('Fiche créée! ID:', json.data.idFiche);
    } else {
      console.error('Erreur:', json.message);
    }

  } catch (error) {
    console.error('Erreur:', error);
  }
}
```

---

### 7.3 Exemple: Uploader une image

```javascript
async function uploadImage(file, idFiche) {
  const token = localStorage.getItem('authToken');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('idFiche', idFiche);
  formData.append('typeFichier', 'Photo');

  try {
    const response = await fetch(
      'http://localhost:3000/api/v1/medias/upload',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );

    const json = await response.json();

    if (json.success) {
      console.log('Image uploadée:', json.data.urlChemin);
      // Afficher l'image
      document.getElementById('preview').src = 
        'http://localhost:3000' + json.data.urlChemin;
    }

  } catch (error) {
    console.error('Erreur upload:', error);
  }
}

// Utilisation
document.getElementById('file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  uploadImage(file, 'uuid-fiche');
});
```

---

### 7.4 Exemple: Paiement et QR Code

```javascript
async function acheterTicket(idTicket, montant) {
  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch(
      'http://localhost:3000/api/v1/achats',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          idTicket,
          montant
        })
      }
    );

    const json = await response.json();

    if (json.success) {
      const { codeQR, referenceMomo } = json.data;

      // Afficher le QR code
      const qrImage = document.createElement('img');
      qrImage.src = `data:image/png;base64,${codeQR}`;
      document.getElementById('qr-container').appendChild(qrImage);

      // Afficher la référence Moov
      console.log('Référence Moov:', referenceMomo);
      console.log('Statut paiement:', json.data.statutPaiement);
    }

  } catch (error) {
    console.error('Erreur achat:', error);
  }
}
```

---

## 8. Gestion des erreurs

### 8.1 Codes HTTP et significations

| Code | Signification | Action |
|------|---------------|--------|
| **200** | OK - Requête réussie | ✅ Traiter les données |
| **201** | Created - Ressource créée | ✅ Rediriger ou recharger |
| **400** | Bad Request - Paramètres invalides | ❌ Vérifier les données envoyées |
| **401** | Unauthorized - Token manquant/expiré | ❌ Rediriger vers login |
| **403** | Forbidden - Accès refusé (pas Admin) | ❌ Afficher message d'erreur |
| **404** | Not Found - Ressource introuvable | ❌ Vérifier l'ID |
| **422** | Unprocessable - Données invalides | ❌ Valider les données |
| **500** | Server Error - Erreur serveur | ❌ Réessayer plus tard |

### 8.2 Gestion des erreurs en JavaScript

```javascript
async function APIRequest(endpoint, options) {
  try {
    const response = await fetch(endpoint, options);
    const json = await response.json();

    // Erreur API
    if (!json.success) {
      // Afficher les erreurs de validation
      if (json.errors && json.errors.length > 0) {
        json.errors.forEach(err => {
          console.error(`${err.field}: ${err.message}`);
        });
      } else {
        console.error('Erreur:', json.message);
      }

      // Rediriger vers login si token expiré
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }

      throw new Error(json.message);
    }

    return json.data;

  } catch (error) {
    console.error('Erreur réseau ou serveur:', error.message);
    // Afficher un message à l'utilisateur
    alert('Une erreur s\'est produite: ' + error.message);
    throw error;
  }
}
```

### 8.3 Exemple d'erreur complète

**Request invalide:**
```javascript
// Email vide
await api.post('/auth/login', {
  emailUser: '',
  mdpUser: 'password'
});
```

**Response (400):**
```json
{
  "success": false,
  "status": 400,
  "message": "Validation échouée",
  "errors": [
    {
      "field": "emailUser",
      "message": "Email et mot de passe requis"
    }
  ]
}
```

---

## 9. Best practices

### 9.1 Sécurité

✅ **À faire:**
- ✓ Toujours valider les données côté frontend avant d'envoyer
- ✓ Stocker le token en localStorage (ou sessionStorage pour plus de sécurité)
- ✓ Utiliser HTTPS en production
- ✓ Implémenter une expiration automatique du token (logout à 8h)
- ✓ Ne jamais afficher le token dans les logs ou console

❌ **À éviter:**
- ✗ Stocker les identifiants en clair
- ✗ Faire confiance 100% à la validation frontend
- ✗ Envoyer le token en query parameter
- ✗ Afficher les erreurs serveur détaillées à l'utilisateur

### 9.2 Performance

✅ **À faire:**
- ✓ Implémenter la pagination (max 50 items par page)
- ✓ Mettre en cache les données (Context, TanStack Query, localStorage)
- ✓ Debouncer les recherches pour éviter trop de requêtes
- ✓ Lazy-loader les images médias
- ✓ Compresser les images avant upload

❌ **À éviter:**
- ✗ Charger toutes les fiches en une seule requête
- ✗ Faire une requête à chaque keystroke dans une recherche
- ✗ Envoyer des images en haute résolution
- ✗ Charger les images médias au démarrage de la page

### 9.3 Gestion d'état

**Recommandation:** Utiliser **TanStack Query** pour gérer le cache et les requêtes

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Hook pour récupérer les fiches
export function useFiches(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['fiches', { page, limit }],
    queryFn: async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/fiches?page=${page}&limit=${limit}`
      );
      const json = await response.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    },
    staleTime: 5 * 60 * 1000,  // Revalidate après 5 min
    gcTime: 10 * 60 * 1000,     // Garder en cache 10 min
  });
}

// Hook pour créer une fiche
export function useCreateFiche() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch(
        'http://localhost:3000/api/v1/fiches',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(data)
        }
      );
      const json = await response.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    },
    onSuccess: () => {
      // Invalider le cache et recharger les fiches
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
    }
  });
}

// Utilisation dans un composant
export function CreateFicheForm() {
  const { mutate, isPending, error } = useCreateFiche();

  const handleSubmit = (formData) => {
    mutate(formData);
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit({
        designation: e.target.designation.value,
        // ...
      });
    }}>
      {/* Formulaire */}
    </form>
  );
}
```

### 9.4 Gestion des permissions

Vérifiez toujours le rôle de l'utilisateur avant d'afficher les options d'admin:

```javascript
export function AdminPanel() {
  const token = localStorage.getItem('authToken');
  const payload = JSON.parse(atob(token.split('.')[1]));

  if (payload.role !== 'Admin') {
    return <div>Accès refusé - Réservé aux administrateurs</div>;
  }

  return <div>Panneau d'administration</div>;
}

// Ou avec un contexte utilisateur
export function useUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser(payload);
    }
  }, []);

  return user;
}
```

### 9.5 Formatage et affichage des données

```javascript
// Formater les dates
export function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Formater les montants
export function formatMontant(montant) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF'  // Franc CFA
  }).format(montant);
}

// Afficher les énumérations
export const ENUM_LABELS = {
  typeFiche: {
    'Site': '📍 Site archéologique',
    'Objet': '🏺 Objet culturel',
    'Pratique': '🎭 Pratique immatérielle',
    'Artisan': '👨‍🎨 Artisan',
    'Événement': '🎪 Événement'
  },
  etatConservation: {
    'Bon': '✅ Bon',
    'Passable': '⚠️ Passable',
    'Dégradé': '❌ Dégradé'
  }
};
```

---

## 🔗 Ressources supplémentaires

- **Documentation Swagger:** `http://localhost:3000/docs`
- **Repo GitHub:** (à ajouter)
- **Postman Collection:** (à générer)

---

## 📞 Support

Pour toute question ou problème:
- Contactez l'équipe backend
- Consultez les logs serveur: `docker logs sgrp-backend`
- Vérifiez que le serveur est en fonctionnement: `curl http://localhost:3000/health`

---

**Dernière mise à jour:** Juin 2024  
**Version API:** 2.0  
**Statut:** Production ready
