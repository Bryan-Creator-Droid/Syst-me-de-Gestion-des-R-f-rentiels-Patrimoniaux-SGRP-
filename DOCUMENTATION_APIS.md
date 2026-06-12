# 📚 Documentation Complète des APIs SGRP

Bienvenue dans la documentation technique complète du projet SGRP. Cette ressource a été conçue pour aider les développeurs frontend à intégrer et tester les APIs du backend.

---

## 📖 Documents disponibles

### 1. **[API_GUIDE_FRONTEND.md](./API_GUIDE_FRONTEND.md)** 
**Le guide complet de référence**

Ce document est votre **bible technique**. Il contient:

- ✅ Structure des données et modèles (Utilisateurs, Fiches, Visites, etc.)
- ✅ Gestion de la base de données côté frontend (3 approches: Context, React Query, LocalStorage)
- ✅ Configuration du client API
- ✅ Authentification JWT complète
- ✅ **Tous les endpoints groupés par module** avec exemples JSON
- ✅ Best practices et patterns recommandés
- ✅ Gestion des erreurs HTTP

**Pour qui?** Tous les développeurs frontend  
**Quand l'utiliser?** En premier - pour comprendre la structure complète  
**Temps de lecture:** 45-60 minutes

---

### 2. **[API_TESTS_CURL.md](./API_TESTS_CURL.md)**
**Guide pratique de test immédiat**

Testez les APIs **sans écrire une seule ligne de code**. Contient:

- ✅ Commandes cURL prêtes à copier-coller
- ✅ Exemples pour **chaque endpoint**
- ✅ **2 scénarios complets** (visiteur et admin)
- ✅ Scripts bash automatisés
- ✅ Collection Postman JSON
- ✅ Checklist de validation

**Pour qui?** Développeurs frontend, testeurs, devops  
**Quand l'utiliser?** Avant d'intégrer - pour valider que tout fonctionne  
**Temps d'exécution:** 15-20 minutes pour tous les tests

---

### 3. **[REACT_INTEGRATION_GUIDE.md](./REACT_INTEGRATION_GUIDE.md)**
**Code React prêt à l'emploi**

Intégrez les APIs **directement dans votre application React**. Contient:

- ✅ Client API réutilisable (`api.ts`)
- ✅ Types TypeScript complets
- ✅ 5+ Hooks personnalisés prêts à copier-coller
- ✅ 4+ Composants React fonctionnels
- ✅ Gestion d'état avec Context
- ✅ Patterns avancés (Debounce, Protection de routes, Cache)

**Pour qui?** Développeurs React  
**Quand l'utiliser?** Pour commencer à développer l'interface  
**Temps de mise en place:** 30-45 minutes

---

## 🚀 Guide de démarrage rapide

### Pour commencer MAINTENANT:

```bash
# Étape 1: Vérifier que le serveur fonctionne
curl http://localhost:3000/health

# Étape 2: Tester la connexion
bash tests/scenario-visiteur.sh

# Étape 3: Lire le guide complet
open API_GUIDE_FRONTEND.md

# Étape 4: Commencer à coder
# Copier les hooks de REACT_INTEGRATION_GUIDE.md
```

---

## 🗺️ Carte mentale - Par cas d'usage

### 🔒 "Je veux implémenter la connexion"
1. Lire: **API_GUIDE_FRONTEND.md** → Section "Authentification JWT"
2. Copier: **REACT_INTEGRATION_GUIDE.md** → `useAuth` hook
3. Tester: **API_TESTS_CURL.md** → `/auth/login`

### 📋 "Je veux afficher une liste de fiches"
1. Lire: **API_GUIDE_FRONTEND.md** → Section "GET /api/v1/fiches"
2. Copier: **REACT_INTEGRATION_GUIDE.md** → `useFiches` hook
3. Tester: **API_TESTS_CURL.md** → "GET /fiches avec filtres"

### 📸 "Je veux uploader des images"
1. Lire: **API_GUIDE_FRONTEND.md** → Section "Médias"
2. Copier: **REACT_INTEGRATION_GUIDE.md** → `useMedias` hook + `ImageUpload`
3. Tester: **API_TESTS_CURL.md** → "POST /medias/upload"

### ✅ "Je dois tester les APIs rapidement"
1. Utiliser: **API_TESTS_CURL.md** → Scénarios complets
2. Importer: Collection Postman fournie

### 🔧 "Je suis bloqué/une erreur"
1. Vérifier: **API_GUIDE_FRONTEND.md** → Section "Gestion des erreurs"
2. Tester: **API_TESTS_CURL.md** → Reproduire avec curl
3. Consulter: Les logs du backend

---

## 📊 Structure de l'API

```
BASE_URL: http://localhost:3000/api/v1

├── /auth                 # Authentification
│   ├── POST /login       # Connexion
│   └── POST /register    # Inscription
│
├── /fiches              # Référentiels patrimoniaux
│   ├── GET /            # Lister (public)
│   ├── GET /:id         # Détail (public)
│   ├── POST /           # Créer (admin)
│   ├── PUT /:id         # Modifier (admin)
│   ├── DELETE /:id      # Supprimer (admin)
│   └── PUT /:id/archiver # Archiver (admin)
│
├── /musees              # Musées
│   ├── GET /            # Lister
│   └── POST /           # Créer (admin)
│
├── /visites             # Visites guidées
│   ├── GET /            # Lister
│   └── POST /           # Créer (admin)
│
├── /rdvs                # Rendez-vous
│   ├── POST /           # Réserver (auth)
│   └── GET /mes-rdvs    # Mes RDVs (auth)
│
├── /commentaires        # Commentaires
│   ├── POST /           # Créer (auth)
│   └── GET ?idVisite=   # Lister
│
├── /tickets             # Tickets/Entrées
│   ├── GET /            # Lister
│   └── POST /           # Créer (admin)
│
├── /achats              # Achats & Paiement
│   ├── POST /           # Créer achat (auth)
│   └── GET /:id         # Détail achat
│
├── /medias              # Uploads
│   ├── POST /upload     # Uploader (auth)
│   ├── GET ?idFiche=    # Lister
│   └── DELETE /:id      # Supprimer (admin)
│
├── /search              # Recherche full-text
│   └── GET ?q=...       # Rechercher
│
└── /export              # Export
    ├── GET /csv         # CSV (admin)
    └── GET /pdf         # PDF (admin)
```

---

## 🔑 Authentification

### Token JWT

```javascript
// Après connexion
const token = "eyJhbGciOiJIUzI1NiIs...";

// Ajouter à toutes les requêtes authentifiées
headers: {
  "Authorization": "Bearer " + token
}
```

### Rôles et permissions

| Endpoint | Visiteur | Admin | Public |
|----------|----------|-------|--------|
| GET /fiches | ✅ | ✅ | ✅ |
| POST /fiches | ❌ | ✅ | ❌ |
| POST /rdvs | ✅ | ✅ | ❌ |
| POST /achats | ✅ | ✅ | ❌ |
| DELETE /fiches | ❌ | ✅ | ❌ |
| GET /export | ❌ | ✅ | ❌ |

---

## 💾 Modèles de données clés

### Utilisateur
```typescript
{
  idUser: string;              // UUID
  emailUser: string;           // Unique
  nom: string;
  prenom: string;
  role: "Admin" | "Visiteur";
  date_creation: Date;
}
```

### Fiche (5 types différents)
```typescript
{
  idFiche: string;
  designation: string;
  typeFiche: "Site" | "Objet" | "Pratique" | "Artisan" | "Événement";
  // Champs spécifiques selon le type
  // (voir API_GUIDE_FRONTEND.md pour les détails)
}
```

### Achat & Paiement
```typescript
{
  idAchat: string;
  idTicket: string;
  montant: number;
  statutPaiement: "En attente" | "Payé" | "Échoué";
  codeQR: string;              // QR code en base64
  referenceMomo: string;       // Référence paiement
  date_achat: Date;
}
```

---

## 🛠️ Technologies utilisées

- **Backend:** Node.js + Express + TypeScript
- **Base de données:** MySQL
- **Authentification:** JWT (JSON Web Tokens)
- **Frontend:** React + TypeScript
- **Documentation:** Swagger/OpenAPI

---

## ⚙️ Configuration requise

```bash
# Variables d'environnement (.env)
REACT_APP_API_URL=http://localhost:3000
REACT_APP_NODE_ENV=development
```

---

## 📋 Checklist avant de commencer

- [ ] Backend fonctionne (`curl http://localhost:3000/health`)
- [ ] MySQL est démarré
- [ ] Node.js v16+ installé
- [ ] npm ou yarn disponible
- [ ] Vous avez lu **API_GUIDE_FRONTEND.md**

---

## 🐛 Dépannage courant

### "401 Unauthorized"
- Token expiré? Vous reconnecter
- Token manquant? Vérifier que vous l'envoyez dans l'en-tête `Authorization`
- Voir: **API_GUIDE_FRONTEND.md** → Section "Gestion des erreurs"

### "404 Not Found"
- Endpoint mal orthographié? Vérifier avec Swagger: `http://localhost:3000/docs`
- Ressource inexistante? Vérifier que l'ID est correct

### "422 Unprocessable"
- Données manquantes ou invalides
- Voir les `errors` dans la réponse pour plus de détails

### "500 Server Error"
- Erreur serveur - consulter les logs: `docker logs sgrp-backend`

---

## 📞 Ressources supplémentaires

- **Swagger interactive:** `http://localhost:3000/docs`
- **MongoDB Compass:** Pour explorer les données
- **Postman:** Collection fournie dans `API_TESTS_CURL.md`

---

## 📝 Notes importantes

### Secrets et sécurité
- ❌ Ne jamais committer le `.env` en clair
- ❌ Ne jamais afficher le token en log
- ✅ Utiliser `sessionStorage` pour plus de sécurité
- ✅ Implémenter l'expiration automatique des tokens

### Performance
- ✅ Implémenter la pagination (max 50 items)
- ✅ Mettre en cache les données (React Query recommandé)
- ✅ Compresser les images avant upload
- ❌ Ne pas faire une requête à chaque keystroke

### Validation
- ✅ Valider côté frontend ET backend
- ✅ Afficher les erreurs de validation à l'utilisateur
- ✅ Utiliser les types TypeScript pour éviter les erreurs

---

## 📞 Support

**Pour toute question:**
1. Consulter d'abord le document pertinent
2. Vérifier Swagger: `http://localhost:3000/docs`
3. Tester avec curl: `API_TESTS_CURL.md`
4. Regarder les logs serveur
5. Contacter l'équipe backend

---

## 📅 Versions et mises à jour

- **Version API:** 2.0
- **Dernière mise à jour:** Juin 2024
- **Statut:** Production ready ✅

---

**Bon développement! 🚀**

*Créé avec ❤️ pour les développeurs SGRP*
