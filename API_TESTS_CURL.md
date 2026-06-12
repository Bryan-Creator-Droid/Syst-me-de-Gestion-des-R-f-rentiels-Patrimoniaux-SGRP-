# 🧪 Guide de Test des APIs SGRP — Exemples avec cURL

**Pour tester rapidement les endpoints sans code**

---

## 📝 Table des matières

1. [Prérequis](#prérequis)
2. [Tests basiques avec cURL](#tests-basiques-avec-curl)
3. [Scénarios complets](#scénarios-complets)
4. [Tests Postman](#tests-postman)

---

## Prérequis

Assurez-vous que:
- ✅ Le serveur backend fonctionne: `curl http://localhost:3000/health`
- ✅ MySQL est démarré
- ✅ Les variables d'environnement sont configurées (.env)

---

## Tests basiques avec cURL

### 1️⃣ SANTÉ DU SERVEUR

```bash
curl -X GET http://localhost:3000/health
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

### 2️⃣ AUTHENTIFICATION

#### Inscription (Visiteur)

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "emailUser": "test@example.com",
    "mdpUser": "TestPassword123!",
    "nom": "Dupont",
    "prenom": "Marie",
    "sexe": "Feminin",
    "pays": "Bénin"
  }'
```

#### Connexion

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailUser": "test@example.com",
    "mdpUser": "TestPassword123!"
  }'
```

**Réponse:**
```json
{
  "success": true,
  "status": 200,
  "message": "Connexion réussie",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "Visiteur",
    "nom": "Dupont",
    "prenom": "Marie"
  }
}
```

💡 **Conseil:** Copiez le token pour les requêtes suivantes

```bash
export TOKEN="votre_token_ici"
```

---

### 3️⃣ FICHES (Référentiels)

#### Lister toutes les fiches (PUBLIQUE)

```bash
curl -X GET "http://localhost:3000/api/v1/fiches?page=1&limit=10"
```

#### Lister les fiches avec filtres

```bash
# Filtrer par type
curl -X GET "http://localhost:3000/api/v1/fiches?typeFiche=Site&limit=10"

# Filtrer par catégorie
curl -X GET "http://localhost:3000/api/v1/fiches?categorie=UNESCO&limit=5"

# Filtrer par type ET catégorie
curl -X GET "http://localhost:3000/api/v1/fiches?typeFiche=Site&categorie=UNESCO&limit=5"
```

#### Récupérer une fiche spécifique

```bash
curl -X GET "http://localhost:3000/api/v1/fiches/550e8400-e29b-41d4-a716-446655440000"
```

#### Créer une fiche (Admin uniquement) ⚠️

**Site archéologique:**
```bash
curl -X POST http://localhost:3000/api/v1/fiches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "designation": "Palais Royal d'\''Abomey",
    "description": "Ancienne résidence royale du Royaume d'\''Abomey, aujourd'\''hui musée",
    "typeFiche": "Site",
    "latitude": 9.3069,
    "longitude": 1.9913,
    "dateClassement": "1985-12-10T00:00:00Z",
    "categorie": "UNESCO",
    "etatConservation": "Bon"
  }'
```

**Objet culturel:**
```bash
curl -X POST http://localhost:3000/api/v1/fiches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "designation": "Masque Gélédé",
    "description": "Masque rituel yoruba du Bénin",
    "typeFiche": "Objet",
    "matiere": "Bois sculpté",
    "epoque": "19ème siècle",
    "provenance": "Bénin",
    "hauteurObjet": 0.45,
    "largeurObjet": 0.30
  }'
```

**Pratique immatérielle:**
```bash
curl -X POST http://localhost:3000/api/v1/fiches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "designation": "Danse Gélédé",
    "description": "Pratique rituelle et artistique des Yorubas",
    "typeFiche": "Pratique",
    "communautePorteuse": "Communauté Yoruba",
    "region": "Sud-Bénin",
    "frequence": "Elevée"
  }'
```

**Artisan:**
```bash
curl -X POST http://localhost:3000/api/v1/fiches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "designation": "Sculpteur sur bois - Kofi Mensah",
    "typeFiche": "Artisan",
    "nomArtisan": "Mensah",
    "prenomArtisan": "Kofi",
    "specialite": "Sculpture sur bois, masques rituels"
  }'
```

**Événement:**
```bash
curl -X POST http://localhost:3000/api/v1/fiches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "designation": "Festival des Masques Gélédé 2024",
    "description": "Célébration annuelle de la culture yoruba",
    "typeFiche": "Événement",
    "typeEvenement": "Festival",
    "dateEvenement": "2024-07-15T09:00:00Z",
    "accesEvenement": "Gratuit",
    "organisateur": "Ministère de la Culture"
  }'
```

#### Modifier une fiche (Admin uniquement) ⚠️

```bash
curl -X PUT http://localhost:3000/api/v1/fiches/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "designation": "Palais Royal d'\''Abomey - Musée National",
    "etatConservation": "Passable"
  }'
```

#### Archiver une fiche (Admin uniquement) ⚠️

```bash
curl -X PUT http://localhost:3000/api/v1/fiches/550e8400-e29b-41d4-a716-446655440000/archiver \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"archive": true}'
```

#### Supprimer une fiche (Admin uniquement) ⚠️

```bash
curl -X DELETE http://localhost:3000/api/v1/fiches/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4️⃣ MUSÉES

#### Lister les musées

```bash
curl -X GET "http://localhost:3000/api/v1/musees"
```

#### Créer un musée (Admin uniquement) ⚠️

```bash
curl -X POST http://localhost:3000/api/v1/musees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nomMusee": "Musée National de Cotonou",
    "longitude": 2.0443,
    "latitude": 6.4969,
    "adresse": "Rue Pythagore, Cotonou, Bénin"
  }'
```

---

### 5️⃣ VISITES

#### Lister les visites disponibles

```bash
curl -X GET "http://localhost:3000/api/v1/visites?page=1&limit=10"
```

#### Créer une visite (Admin uniquement) ⚠️

```bash
curl -X POST http://localhost:3000/api/v1/visites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "guide": "Jean Dupont",
    "dateVisite": "2024-06-20T09:00:00Z",
    "heureDebut": "2024-06-20T09:00:00Z",
    "capaciteMax": 20
  }'
```

#### Modifier une visite (Admin uniquement) ⚠️

```bash
curl -X PUT http://localhost:3000/api/v1/visites/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "guide": "Jean Dupont - Expert",
    "capaciteMax": 25
  }'
```

---

### 6️⃣ RENDEZ-VOUS

#### Réserver un rendez-vous (Authentification requise) ⚠️

```bash
curl -X POST http://localhost:3000/api/v1/rdvs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "dateRdv": "2024-06-20T09:00:00Z",
    "heureDebutRdv": "2024-06-20T09:00:00Z",
    "idVisite": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

#### Lister mes rendez-vous

```bash
curl -X GET "http://localhost:3000/api/v1/rdvs/mes-rdvs" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 7️⃣ COMMENTAIRES

#### Laisser un commentaire (Authentification requise) ⚠️

```bash
curl -X POST http://localhost:3000/api/v1/commentaires \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "contenus": "Visite magnifique et très instructive! Guide excellent!",
    "idVisite": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

#### Récupérer les commentaires d'une visite

```bash
curl -X GET "http://localhost:3000/api/v1/commentaires?idVisite=550e8400-e29b-41d4-a716-446655440000"
```

---

### 8️⃣ TICKETS

#### Lister les tickets disponibles

```bash
curl -X GET "http://localhost:3000/api/v1/tickets"
```

#### Lister les tickets d'une fiche

```bash
curl -X GET "http://localhost:3000/api/v1/tickets?idFiche=550e8400-e29b-41d4-a716-446655440000"
```

#### Créer un ticket (Admin uniquement) ⚠️

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "idFiche": "550e8400-e29b-41d4-a716-446655440000",
    "codeType": "STD",
    "prix": 5000
  }'
```

---

### 9️⃣ ACHATS & PAIEMENT

#### Acheter un ticket (Authentification requise) ⚠️

```bash
curl -X POST http://localhost:3000/api/v1/achats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "idTicket": "550e8400-e29b-41d4-a716-446655440000",
    "montant": 5000
  }'
```

**Réponse:**
```json
{
  "success": true,
  "status": 201,
  "message": "Achat créé avec succès",
  "data": {
    "idAchat": "550e8400-e29b-41d4-a716-446655440001",
    "codeQR": "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw...",
    "referenceMomo": "TRX123456789",
    "statutPaiement": "En attente"
  }
}
```

#### Récupérer un achat

```bash
curl -X GET "http://localhost:3000/api/v1/achats/550e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer $TOKEN"
```

#### Vérifier le statut de paiement

```bash
curl -X GET "http://localhost:3000/api/v1/achats/550e8400-e29b-41d4-a716-446655440001/statut" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 🔟 MÉDIAS (Upload)

#### Uploader une image

```bash
# Créer un fichier de test
echo "fake image data" > /tmp/test.jpg

# Uploader
curl -X POST http://localhost:3000/api/v1/medias/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.jpg" \
  -F "idFiche=550e8400-e29b-41d4-a716-446655440000" \
  -F "typeFichier=Photo"
```

#### Récupérer les médias d'une fiche

```bash
curl -X GET "http://localhost:3000/api/v1/medias?idFiche=550e8400-e29b-41d4-a716-446655440000"
```

#### Supprimer un média (Admin uniquement) ⚠️

```bash
curl -X DELETE http://localhost:3000/api/v1/medias/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

---

### 1️⃣1️⃣ RECHERCHE

#### Recherche simple

```bash
curl -X GET "http://localhost:3000/api/v1/search?q=palais"
```

#### Recherche avec filtres

```bash
curl -X GET "http://localhost:3000/api/v1/search?q=palais&typeFiche=Site&limit=20"
```

---

### 1️⃣2️⃣ EXPORT

#### Exporter en CSV (Admin uniquement) ⚠️

```bash
curl -X GET "http://localhost:3000/api/v1/export/csv?typeFiche=Site" \
  -H "Authorization: Bearer $TOKEN" \
  -o fiches.csv
```

#### Exporter une fiche en PDF (Admin uniquement) ⚠️

```bash
curl -X GET "http://localhost:3000/api/v1/export/pdf?idFiche=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN" \
  -o fiche.pdf
```

---

## Scénarios complets

### 📋 Scénario 1: Flux complet visiteur

```bash
#!/bin/bash

echo "=== 1. Inscription ===" 
REGISTER=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "emailUser": "visitor-'$(date +%s)'@test.com",
    "mdpUser": "TestPassword123!",
    "nom": "Visitor",
    "prenom": "Test"
  }')

echo $REGISTER | jq .

echo -e "\n=== 2. Connexion ==="
LOGIN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailUser": "visitor-'$(date +%s)'@test.com",
    "mdpUser": "TestPassword123!"
  }')

TOKEN=$(echo $LOGIN | jq -r '.data.token')
echo "Token obtenu: ${TOKEN:0:20}..."

echo -e "\n=== 3. Voir les fiches ===" 
curl -s -X GET "http://localhost:3000/api/v1/fiches?limit=5" | jq .

echo -e "\n=== 4. Voir les visites ===" 
curl -s -X GET "http://localhost:3000/api/v1/visites?limit=5" | jq .

echo -e "\n=== 5. Réserver une visite ==="
# Récupérer l'ID d'une visite d'abord
VISITE_ID=$(curl -s -X GET "http://localhost:3000/api/v1/visites?limit=1" | jq -r '.data.visites[0].idVisite')

curl -s -X POST http://localhost:3000/api/v1/rdvs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "dateRdv": "2024-06-25T09:00:00Z",
    "heureDebutRdv": "2024-06-25T09:00:00Z",
    "idVisite": "'$VISITE_ID'"
  }' | jq .

echo -e "\nScénario visiteur complété!"
```

---

### 🔐 Scénario 2: Flux complet administrateur

```bash
#!/bin/bash

echo "=== 1. Connexion Admin ==="
LOGIN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailUser": "admin@sgrp.bj",
    "mdpUser": "AdminPassword123!"
  }')

TOKEN=$(echo $LOGIN | jq -r '.data.token')
echo "Connecté en tant qu'Admin"

echo -e "\n=== 2. Créer un site archéologique ==="
SITE=$(curl -s -X POST http://localhost:3000/api/v1/fiches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "designation": "Château Watinon",
    "description": "Ancien fort colonial en ruines",
    "typeFiche": "Site",
    "latitude": 10.3156,
    "longitude": -86.2419,
    "categorie": "Nationale",
    "etatConservation": "Dégradé"
  }')

SITE_ID=$(echo $SITE | jq -r '.data.idFiche')
echo "Site créé: $SITE_ID"

echo -e "\n=== 3. Créer des tickets pour ce site ==="
curl -s -X POST http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "idFiche": "'$SITE_ID'",
    "codeType": "STD",
    "prix": 3000
  }' | jq .

echo -e "\n=== 4. Créer une visite guidée ==="
VISITE=$(curl -s -X POST http://localhost:3000/api/v1/visites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "guide": "Expert en Archéologie",
    "dateVisite": "2024-06-20T08:00:00Z",
    "heureDebut": "2024-06-20T08:00:00Z",
    "capaciteMax": 15
  }')

VISITE_ID=$(echo $VISITE | jq -r '.data.idVisite')
echo "Visite créée: $VISITE_ID"

echo -e "\n=== 5. Exporter les données ==="
curl -s -X GET "http://localhost:3000/api/v1/export/csv?typeFiche=Site" \
  -H "Authorization: Bearer $TOKEN" \
  -o sites_export.csv

echo "Export CSV sauvegardé: sites_export.csv"

echo -e "\nScénario admin complété!"
```

---

## Tests Postman

### Installation

1. Télécharger [Postman](https://www.postman.com/downloads/)
2. Importer la collection (voir ci-dessous)

### Collection Postman JSON

Créez un fichier `SGRP_API.postman_collection.json`:

```json
{
  "info": {
    "name": "SGRP API - Tests Complets",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "AUTH",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"emailUser\":\"user@test.com\",\"mdpUser\":\"Password123!\",\"nom\":\"Test\",\"prenom\":\"User\"}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/v1/auth/register",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "auth", "register"]
            }
          }
        },
        {
          "name": "Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "  var jsonData = pm.response.json();",
                  "  pm.environment.set('token', jsonData.data.token);",
                  "  console.log('Token saved: ' + jsonData.data.token);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"emailUser\":\"admin@sgrp.bj\",\"mdpUser\":\"AdminPassword123!\"}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/v1/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "auth", "login"]
            }
          }
        }
      ]
    },
    {
      "name": "FICHES",
      "item": [
        {
          "name": "Get All Fiches",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/api/v1/fiches?page=1&limit=10",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "fiches"],
              "query": [
                {"key": "page", "value": "1"},
                {"key": "limit", "value": "10"}
              ]
            }
          }
        },
        {
          "name": "Create Fiche (Admin)",
          "request": {
            "method": "POST",
            "header": [
              {"key": "Content-Type", "value": "application/json"},
              {"key": "Authorization", "value": "Bearer {{token}}"}
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"designation\":\"New Site\",\"description\":\"Test\",\"typeFiche\":\"Site\",\"latitude\":9.3,\"longitude\":1.9,\"categorie\":\"Nationale\",\"etatConservation\":\"Bon\"}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/v1/fiches",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "fiches"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ]
}
```

---

## 💡 Conseils de test

### Vérifier la réponse complète

```bash
curl -i http://localhost:3000/health
```

Affiche les headers + body

### Pretty-print JSON

```bash
curl http://localhost:3000/api/v1/fiches | jq '.'
```

### Sauvegarder la réponse

```bash
curl http://localhost:3000/api/v1/fiches > response.json
```

### Afficher seulement les headers

```bash
curl -i -X HEAD http://localhost:3000/health
```

### Tester avec authentification personnalisée

```bash
# Générer un token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailUser":"test@test.com","mdpUser":"pwd"}' | jq -r '.data.token')

# Utiliser le token
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/fiches/protected
```

---

## ✅ Checklist de test

Avant de livrer:

- [ ] Vérifier `/health` → OK
- [ ] Tester login/register → Tokens générés
- [ ] Lister les fiches (public) → Données retournées
- [ ] Créer une fiche (admin) → Créée avec succès
- [ ] Modifier une fiche (admin) → Modifiée
- [ ] Archiver une fiche (admin) → Archivée
- [ ] Supprimer une fiche (admin) → Supprimée
- [ ] Upload médias → Fichier stocké
- [ ] Recherche → Résultats corrects
- [ ] Export CSV → Fichier généré
- [ ] Export PDF → Fichier généré
- [ ] Pagination → Limite respectée
- [ ] Erreurs 401 sans token → Redirection login
- [ ] Erreurs 403 non-admin → Message refusé
