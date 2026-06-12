# ⚛️ Guide d'Intégration des APIs avec React — Exemples complets

**Code prêt à copier-coller pour intégrer les APIs dans votre application React**

---

## 📋 Table des matières

1. [Configuration initiale](#configuration-initiale)
2. [Hooks personnalisés](#hooks-personnalisés)
3. [Composants prêts à l'emploi](#composants-prêts-à-lemploi)
4. [Gestion d'état avec Context](#gestion-détat-avec-context)
5. [Patterns avancés](#patterns-avancés)

---

## Configuration initiale

### 1. Client API réutilisable

Créez le fichier `src/services/api.ts`:

```typescript
// src/services/api.ts

interface APIResponse<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  errors?: Array<{ field: string; message: string }>;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: HeadersInit;
  body?: any;
}

export class APIClient {
  private baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  private token: string | null = localStorage.getItem('authToken');

  /**
   * Définir le token JWT après connexion
   */
  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  /**
   * Récupérer le token stocké
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Nettoyer le token (déconnexion)
   */
  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  public isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * Extraire le payload du JWT (rôle, email, etc.)
   */
  public getUser(): any {
    if (!this.token) return null;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Requête générique
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Gestion des codes d'erreur
      if (response.status === 401) {
        this.clearToken();
        window.location.href = '/login';
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      if (response.status === 403) {
        throw new Error('Accès refusé. Vous n\'avez pas les permissions nécessaires.');
      }

      const data: APIResponse<T> = await response.json();

      if (!data.success) {
        const errorMessage = data.errors?.[0]?.message || data.message;
        throw new Error(errorMessage);
      }

      return data.data;
    } catch (error) {
      console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error);
      throw error;
    }
  }

  // ========== Méthodes raccourcis ==========

  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  public put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  public async upload<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = { ...options?.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data: APIResponse<T> = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (error) {
      console.error(`Upload Error [${endpoint}]:`, error);
      throw error;
    }
  }
}

// Export une instance globale
export const api = new APIClient();
```

### 2. Types TypeScript

Créez le fichier `src/types/index.ts`:

```typescript
// src/types/index.ts

// ========== UTILISATEURS ==========

export interface Utilisateur {
  idUser: string;
  emailUser: string;
  nom: string;
  prenom: string;
  sexe?: 'Masculin' | 'Feminin';
  pays?: string;
  role: 'Admin' | 'Visiteur';
  date_creation: Date;
}

export interface LoginPayload {
  emailUser: string;
  mdpUser: string;
}

export interface RegisterPayload {
  emailUser: string;
  mdpUser: string;
  nom: string;
  prenom: string;
  sexe?: string;
  pays?: string;
}

// ========== FICHES ==========

export type TypeFiche = 'Site' | 'Objet' | 'Pratique' | 'Artisan' | 'Événement';
export type CategorieFiche = 'UNESCO' | 'Nationale' | 'Locale';
export type EtatConservation = 'Bon' | 'Passable' | 'Dégradé';
export type Frequence = 'Faible' | 'Moyenne' | 'Elevée';

export interface FicheBase {
  idFiche: string;
  designation: string;
  description?: string;
  typeFiche: TypeFiche;
  categorie?: CategorieFiche;
  etatConservation?: EtatConservation;
  archive: boolean;
  cree_par: string;
  date_creation: Date;
  date_modification: Date;
}

export interface FicheSite extends FicheBase {
  typeFiche: 'Site';
  latitude: number;
  longitude: number;
  dateClassement?: Date;
}

export interface FicheObjet extends FicheBase {
  typeFiche: 'Objet';
  matiere: string;
  epoque?: string;
  provenance?: string;
  hauteurObjet?: number;
  largeurObjet?: number;
}

export interface FichePratique extends FicheBase {
  typeFiche: 'Pratique';
  communautePorteuse: string;
  region: string;
  frequence?: Frequence;
}

export interface FicheArtisan extends FicheBase {
  typeFiche: 'Artisan';
  nomArtisan: string;
  prenomArtisan: string;
  specialite?: string;
}

export type TypeEvenement = 'Festival' | 'Ceremonie' | 'Exposition' | 'Atelier' | 'Concours' | 'Parade' | 'Rituel' | 'Conférence';
export type AccesEvenement = 'Gratuit' | 'Payant';

export interface FicheEvenement extends FicheBase {
  typeFiche: 'Événement';
  typeEvenement: TypeEvenement;
  dateEvenement: Date;
  accesEvenement: AccesEvenement;
  organisateur: string;
}

export type Fiche = FicheSite | FicheObjet | FichePratique | FicheArtisan | FicheEvenement;

// ========== VISITES ==========

export interface Visite {
  idVisite: string;
  guide: string;
  dateVisite: Date;
  heureDebut: Date;
  capaciteMax: number;
  nbParticipants: number;
  date_creation: Date;
}

// ========== TICKETS & ACHATS ==========

export interface Ticket {
  idTicket: string;
  idFiche: string;
  codeType: 'STD' | 'VIP';
  prix: number;
  date_creation: Date;
}

export interface Achat {
  idAchat: string;
  idTicket: string;
  idVisiteur: string;
  montant: number;
  statutPaiement: 'En attente' | 'Payé' | 'Échoué';
  referenceMomo?: string;
  codeQR?: string;
  date_achat: Date;
}

// ========== PAGINATION ==========

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## Hooks personnalisés

### 1. useAuth — Gestion de l'authentification

```typescript
// src/hooks/useAuth.ts

import { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Utilisateur, LoginPayload, RegisterPayload } from '../types';

interface AuthState {
  user: Utilisateur | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    error: null,
  });

  // Initialiser depuis le localStorage
  useEffect(() => {
    const token = api.getToken();
    const user = api.getUser();

    if (token && user) {
      setState({
        user: {
          idUser: user.idUser,
          emailUser: user.emailUser,
          role: user.role,
        } as Utilisateur,
        token,
        loading: false,
        error: null,
      });
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await api.post<{ token: string; nom: string; prenom: string; role: string }>(
        '/api/v1/auth/login',
        payload
      );

      api.setToken(response.token);
      const user = api.getUser();

      setState({
        user: { ...user, nom: response.nom, prenom: response.prenom },
        token: response.token,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur de connexion',
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await api.post('/api/v1/auth/register', payload);

      // Connexion automatique après inscription
      await login({
        emailUser: payload.emailUser,
        mdpUser: payload.mdpUser,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur d\'inscription',
      }));
      throw error;
    }
  }, [login]);

  const logout = useCallback(() => {
    api.clearToken();
    setState({
      user: null,
      token: null,
      loading: false,
      error: null,
    });
  }, []);

  const isAdmin = useCallback((): boolean => {
    return state.user?.role === 'Admin';
  }, [state.user]);

  return {
    ...state,
    login,
    register,
    logout,
    isAdmin,
    isAuthenticated: state.token !== null,
  };
}
```

**Utilisation:**
```tsx
export function App() {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async () => {
    await login({ emailUser: 'user@test.com', mdpUser: 'password' });
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div>
      <p>Bienvenue {user?.nom}!</p>
      <button onClick={logout}>Déconnexion</button>
    </div>
  );
}
```

---

### 2. useFiches — Gestion des fiches

```typescript
// src/hooks/useFiches.ts

import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { Fiche, PaginatedResponse } from '../types';

interface FichesFilters {
  page?: number;
  limit?: number;
  typeFiche?: string;
  categorie?: string;
}

export function useFiches(initialFilters: FichesFilters = {}) {
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchFiches = useCallback(async (filters: FichesFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(filters.page || pagination.page),
        limit: String(filters.limit || pagination.limit),
        ...(filters.typeFiche && { typeFiche: filters.typeFiche }),
        ...(filters.categorie && { categorie: filters.categorie }),
      });

      const response = await api.get<{ fiches: Fiche[]; pagination: typeof pagination }>(
        `/api/v1/fiches?${params}`
      );

      setFiches(response.fiches);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  const getFicheById = useCallback(async (id: string): Promise<Fiche> => {
    return api.get(`/api/v1/fiches/${id}`);
  }, []);

  const createFiche = useCallback(async (fiche: any) => {
    const result = await api.post<{ idFiche: string }>('/api/v1/fiches', fiche);
    await fetchFiches(); // Recharger la liste
    return result;
  }, [fetchFiches]);

  const updateFiche = useCallback(async (id: string, updates: any) => {
    await api.put(`/api/v1/fiches/${id}`, updates);
    await fetchFiches(); // Recharger
  }, [fetchFiches]);

  const deleteFiche = useCallback(async (id: string) => {
    await api.delete(`/api/v1/fiches/${id}`);
    await fetchFiches(); // Recharger
  }, [fetchFiches]);

  const archiveFiche = useCallback(async (id: string) => {
    await api.put(`/api/v1/fiches/${id}/archiver`, { archive: true });
    await fetchFiches(); // Recharger
  }, [fetchFiches]);

  // Charger les fiches au montage
  useEffect(() => {
    fetchFiches(initialFilters);
  }, []);

  return {
    fiches,
    loading,
    error,
    pagination,
    fetchFiches,
    getFicheById,
    createFiche,
    updateFiche,
    deleteFiche,
    archiveFiche,
  };
}
```

**Utilisation:**
```tsx
export function FichesList() {
  const { fiches, loading, error, pagination, fetchFiches } = useFiches();

  const handleFilterByType = (typeFiche: string) => {
    fetchFiches({ typeFiche, page: 1 });
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      <button onClick={() => handleFilterByType('Site')}>Sites</button>
      <button onClick={() => handleFilterByType('Objet')}>Objets</button>

      <ul>
        {fiches.map(fiche => (
          <li key={fiche.idFiche}>{fiche.designation}</li>
        ))}
      </ul>

      <p>Page {pagination.page} sur {pagination.totalPages}</p>
    </div>
  );
}
```

---

### 3. useMedias — Gestion des uploads

```typescript
// src/hooks/useMedias.ts

import { useCallback, useState } from 'react';
import { api } from '../services/api';

interface Media {
  idMedias: string;
  urlChemin: string;
  typeFichier: 'Photo' | 'Video' | 'Document' | 'Audio';
  date_upload: Date;
}

export function useMedias() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadMedia = useCallback(async (
    file: File,
    idFiche: string,
    typeFichier: 'Photo' | 'Video' | 'Document' | 'Audio' = 'Photo'
  ): Promise<Media> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('idFiche', idFiche);
      formData.append('typeFichier', typeFichier);

      const response = await api.upload<Media>(
        '/api/v1/medias/upload',
        formData
      );

      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur upload';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMedias = useCallback(async (idFiche: string): Promise<Media[]> => {
    return api.get(`/api/v1/medias?idFiche=${idFiche}`);
  }, []);

  const deleteMedia = useCallback(async (idMedia: string) => {
    await api.delete(`/api/v1/medias/${idMedia}`);
  }, []);

  return {
    loading,
    error,
    uploadMedia,
    getMedias,
    deleteMedia,
  };
}
```

---

## Composants prêts à l'emploi

### 1. Formulaire de connexion

```tsx
// src/components/LoginForm.tsx

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginForm() {
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    emailUser: '',
    mdpUser: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData);
      // Redirection vers le dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      // L'erreur est déjà affichée via le state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Connexion</h2>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <input
        type="email"
        name="emailUser"
        placeholder="Email"
        value={formData.emailUser}
        onChange={handleChange}
        required
      />

      <input
        type="password"
        name="mdpUser"
        placeholder="Mot de passe"
        value={formData.mdpUser}
        onChange={handleChange}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
}
```

---

### 2. Formulaire de création de fiche

```tsx
// src/components/CreateFicheForm.tsx

import React, { useState } from 'react';
import { useFiches } from '../hooks/useFiches';
import { TypeFiche } from '../types';

type FicheFormData = {
  designation: string;
  description: string;
  typeFiche: TypeFiche;
  // Champs communs
  categorie?: string;
  etatConservation?: string;
  // Champs Site
  latitude?: number;
  longitude?: number;
  // Champs Objet
  matiere?: string;
  epoque?: string;
  // Champs Pratique
  communautePorteuse?: string;
  region?: string;
};

export function CreateFicheForm() {
  const { createFiche, loading, error } = useFiches();
  const [formData, setFormData] = useState<FicheFormData>({
    designation: '',
    description: '',
    typeFiche: 'Site',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createFiche(formData);
      alert('Fiche créée avec succès!');
      setFormData({
        designation: '',
        description: '',
        typeFiche: 'Site',
      });
    } catch (err) {
      // Erreur affichée
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Créer une nouvelle fiche</h2>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <input
        type="text"
        name="designation"
        placeholder="Nom/Titre"
        value={formData.designation}
        onChange={handleChange}
        required
      />

      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
      />

      <select
        name="typeFiche"
        value={formData.typeFiche}
        onChange={handleChange}
      >
        <option value="Site">Site archéologique</option>
        <option value="Objet">Objet culturel</option>
        <option value="Pratique">Pratique immatérielle</option>
        <option value="Artisan">Artisan</option>
        <option value="Événement">Événement</option>
      </select>

      {formData.typeFiche === 'Site' && (
        <>
          <input
            type="number"
            name="latitude"
            placeholder="Latitude"
            step="0.00001"
            value={formData.latitude || ''}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="longitude"
            placeholder="Longitude"
            step="0.00001"
            value={formData.longitude || ''}
            onChange={handleChange}
            required
          />
        </>
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Création...' : 'Créer la fiche'}
      </button>
    </form>
  );
}
```

---

### 3. Composant d'upload d'image

```tsx
// src/components/ImageUpload.tsx

import React, { useState } from 'react';
import { useMedias } from '../hooks/useMedias';

interface ImageUploadProps {
  idFiche: string;
  onSuccess?: (url: string) => void;
}

export function ImageUpload({ idFiche, onSuccess }: ImageUploadProps) {
  const { uploadMedia, loading, error } = useMedias();
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Aperçu local
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    try {
      const media = await uploadMedia(file, idFiche, 'Photo');
      onSuccess?.(`http://localhost:3000${media.urlChemin}`);
      alert('Image uploadée avec succès!');
    } catch (err) {
      alert('Erreur lors de l\'upload');
    }
  };

  return (
    <div>
      <h3>Uploader une image</h3>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={loading}
      />

      {loading && <p>Upload en cours...</p>}

      {preview && (
        <div>
          <img src={preview} alt="Aperçu" style={{ maxWidth: '200px' }} />
        </div>
      )}
    </div>
  );
}
```

---

### 4. Liste des fiches avec pagination

```tsx
// src/components/FichesList.tsx

import React, { useState } from 'react';
import { useFiches } from '../hooks/useFiches';
import { useAuth } from '../hooks/useAuth';

export function FichesList() {
  const { fiches, loading, error, pagination, fetchFiches, deleteFiche, archiveFiche } = useFiches();
  const { isAdmin } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('');

  const handleFilterChange = (type: string) => {
    setSelectedType(type);
    fetchFiches({ typeFiche: type || undefined, page: 1 });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr?')) {
      await deleteFiche(id);
    }
  };

  const handleArchive = async (id: string) => {
    if (window.confirm('Archiver cette fiche?')) {
      await archiveFiche(id);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchFiches({ page: newPage, typeFiche: selectedType || undefined });
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      <h2>Référentiels patrimoniaux</h2>

      <div>
        <button onClick={() => handleFilterChange('')}>Tous</button>
        <button onClick={() => handleFilterChange('Site')}>Sites</button>
        <button onClick={() => handleFilterChange('Objet')}>Objets</button>
        <button onClick={() => handleFilterChange('Pratique')}>Pratiques</button>
      </div>

      {fiches.length === 0 ? (
        <p>Aucune fiche trouvée</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>État</th>
              {isAdmin() && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {fiches.map(fiche => (
              <tr key={fiche.idFiche}>
                <td>{fiche.designation}</td>
                <td>{fiche.typeFiche}</td>
                <td>{fiche.etatConservation || '-'}</td>
                {isAdmin() && (
                  <td>
                    <button onClick={() => handleArchive(fiche.idFiche)}>Archiver</button>
                    <button onClick={() => handleDelete(fiche.idFiche)}>Supprimer</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div>
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
        >
          Précédent
        </button>

        <span>
          Page {pagination.page} sur {pagination.totalPages}
        </span>

        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
```

---

## Gestion d'état avec Context

### AuthContext — Accès globalisé

```tsx
// src/context/AuthContext.tsx

import React, { createContext, useContext } from 'react';
import { useAuth as useAuthHook } from '../hooks/useAuth';

const AuthContext = createContext<ReturnType<typeof useAuthHook> | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthHook();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
```

**Configuration dans App.tsx:**
```tsx
import { AuthProvider } from './context/AuthContext';

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

---

## Patterns avancés

### 1. Debounce pour la recherche

```typescript
// src/hooks/useDebounce.ts

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

**Utilisation:**
```tsx
export function SearchFiches() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedTerm = useDebounce(searchTerm, 300);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (debouncedTerm) {
      api.get(`/api/v1/search?q=${debouncedTerm}`).then(setResults);
    }
  }, [debouncedTerm]);

  return (
    <>
      <input
        type="text"
        placeholder="Rechercher..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <ul>
        {results.map(result => (
          <li key={result.idFiche}>{result.designation}</li>
        ))}
      </ul>
    </>
  );
}
```

---

### 2. Protection de routes (Admin uniquement)

```tsx
// src/components/ProtectedRoute.tsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}
```

**Utilisation:**
```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    }
  />
  <Route
    path="/admin"
    element={
      <ProtectedRoute adminOnly>
        <AdminPanel />
      </ProtectedRoute>
    }
  />
</Routes>
```

---

### 3. Cache avec React Query

```tsx
// src/hooks/useQueryFiches.ts (si vous utilisez TanStack Query)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Fiche } from '../types';

export function useFichesQuery() {
  return useQuery({
    queryKey: ['fiches'],
    queryFn: async () => {
      const response = await api.get('/api/v1/fiches');
      return response.fiches as Fiche[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}

export function useCreateFicheMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fiche: any) => api.post('/api/v1/fiches', fiche),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
    },
  });
}
```

---

## 📋 Checklist intégration

- [ ] Installer les dépendances: `npm install axios` (optionnel)
- [ ] Créer `src/services/api.ts`
- [ ] Créer `src/types/index.ts`
- [ ] Créer les hooks personnalisés
- [ ] Créer les composants
- [ ] Configurer AuthProvider
- [ ] Tester la connexion
- [ ] Tester CRUD fiches
- [ ] Tester upload médias
- [ ] Tester la pagination

---

**Vous avez maintenant tout ce qu'il faut pour intégrer les APIs dans votre application React!** 🚀
