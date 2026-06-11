import axios from 'axios';

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
}

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push(() => resolve(api(originalRequest)));
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        pendingRequests.forEach((cb) => cb());
        pendingRequests = [];
        return api(originalRequest);
      } catch {
        pendingRequests = [];
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export interface Teilnehmer {
  id: number;
  vorname: string;
  nachname: string;
  geburtsdatum?: string;
  kurs?: string;
  lehrjahr: number;
  abteilung?: string;
  gruppe: string;
  ausbildungsstart?: string;
  ausbildungsende?: string;
  ausbilderId?: number;
  ausbilderName?: string;
  istBetreut: boolean;
}

export interface Benutzer {
  id: number;
  benutzername: string;
  vorname?: string;
  nachname?: string;
  rolle: string;
}

export interface Aufgabe {
  id: number;
  titel: string;
  beschreibung?: string;
  faelligkeitsdatum: string;
  prioritaet: string;
  erledigt: boolean;
  azubiId?: number;
  azubiName?: string;
  ausbilderName?: string;
  erledigtVonName?: string;
}

export interface Notiz {
  id: number;
  titel: string;
  inhalt?: string;
  erstelltAm: string;
  azubiId?: number;
  azubiName?: string;
  ausbilderName?: string;
}

export interface Termin {
  id: number;
  titel: string;
  beschreibung?: string;
  datum: string;
  endzeit?: string;
  kategorie: string;
  ort?: string;
  azubiId?: number;
  azubiName?: string;
  ausbilderName?: string;
}

export interface Tagesstatus {
  id: number;
  azubiId: number;
  azubiName: string;
  datum: string;
  status: string;
  bemerkung?: string;
}

export interface AllgemeineInfo {
  id: number;
  bezeichnung: string;
  wert?: string;
  sortierung: number;
}

export interface AdminKontakt {
  vorname?: string;
  nachname?: string;
  benutzername: string;
}

export const authApi = {
  login: (benutzername: string, passwort: string) =>
    api.post('/auth/login', { benutzername, passwort }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  passwortAendern: (altesPasswort: string, neuesPasswort: string) =>
    api.post('/auth/passwort-aendern', { altesPasswort, neuesPasswort }),
  adminKontakte: () => api.get<AdminKontakt[]>('/auth/admin-kontakte'),
};

export interface DashboardDto {
  anwesend: number;
  schule: number;
  praktikum: number;
  termin: number;
  urlaub: number;
  krank: number;
  kindKrank: number;
  vAmB: number;
  freigestellt: number;
  entschuldigt: number;
  unentschuldigt: number;
  ungeklaert: number;
  offeneAufgaben: number;
  ueberfaelligeAufgaben: number;
  aufgabenHeute: Aufgabe[];
  termineDemnachst: number;
  roterBadge: number;
  orangerBadge: number;
  pinkerBadge: number;
  aufgabenGesamt: number;
  termineGesamt: number;
  notizenGesamt: number;
  statusFehlt: number;
  teilnehmerGesamt: number;
  betreuteTeilnehmer: number;
}

export const dashboardApi = {
  get: () => api.get<DashboardDto>('/dashboard'),
};

export const teilnehmerApi = {
  alle: (gruppe?: string, skip = 0, take = 200, nurMeine?: boolean) => api.get<PagedResponse<Teilnehmer>>('/teilnehmer', { params: { gruppe, skip, take, nurMeine } }),
  erstellen: (data: Partial<Teilnehmer>) => api.post<Teilnehmer>('/teilnehmer', data),
  aktualisieren: (id: number, data: Partial<Teilnehmer>) => api.put<Teilnehmer>(`/teilnehmer/${id}`, data),
  loeschen: (id: number) => api.delete(`/teilnehmer/${id}`),
  meine: () => api.get<number[]>('/teilnehmer/meine'),
  betreuen: (id: number) => api.post(`/teilnehmer/${id}/betreuen`),
  nichtBetreuen: (id: number) => api.delete(`/teilnehmer/${id}/betreuen`),
};

export const benutzerApi = {
  alle: () => api.get<Benutzer[]>('/users'),
  erstellen: (data: { benutzername: string; passwort: string; vorname?: string; nachname?: string; rolle: string }) => api.post<Benutzer>('/users', data),
  loeschen: (id: number) => api.delete(`/users/${id}`),
  passwortZuruecksetzen: (id: number, passwort: string) => api.put(`/users/${id}/passwort`, { passwort }),
};

export const aufgabenApi = {
  alle: (erledigt?: boolean, skip = 0, take = 200, prioritaet?: string, art?: string) => api.get<PagedResponse<Aufgabe>>('/aufgaben', { params: { erledigt, skip, take, prioritaet, art } }),
  erstellen: (data: Partial<Aufgabe>) => api.post<Aufgabe>('/aufgaben', data),
  aktualisieren: (id: number, data: Partial<Aufgabe>) => api.put<Aufgabe>(`/aufgaben/${id}`, data),
  loeschen: (id: number) => api.delete(`/aufgaben/${id}`),
  toggleErledigt: (id: number) => api.patch(`/aufgaben/${id}/erledigt`),
};

export const notizenApi = {
  alle: (skip = 0, take = 200) => api.get<PagedResponse<Notiz>>('/notizen', { params: { skip, take } }),
  erstellen: (data: Partial<Notiz>) => api.post<Notiz>('/notizen', data),
  aktualisieren: (id: number, data: Partial<Notiz>) => api.put<Notiz>(`/notizen/${id}`, data),
  loeschen: (id: number) => api.delete(`/notizen/${id}`),
};

export const termineApi = {
  alle: (skip = 0, take = 200, zeitFilter?: string) => api.get<PagedResponse<Termin>>('/termine', { params: { skip, take, zeitFilter } }),
  erstellen: (data: Partial<Termin>) => api.post<Termin>('/termine', data),
  aktualisieren: (id: number, data: Partial<Termin>) => api.put<Termin>(`/termine/${id}`, data),
  loeschen: (id: number) => api.delete(`/termine/${id}`),
};

export const tagesstatusApi = {
  alleFuerDatum: (datum: string) => api.get<Tagesstatus[]>(`/tagesstatus/${datum}`),
  setzen: (data: Partial<Tagesstatus>) => api.post<Tagesstatus>('/tagesstatus', data),
  loeschen: (id: number) => api.delete(`/tagesstatus/${id}`),
  export: (year: number, month: number) => api.get(`/tagesstatus/export/${year}/${month}`, { responseType: 'blob' }),
  bericht: (year: number, month: number) => api.get(`/tagesstatus/bericht/${year}/${month}`, { responseType: 'blob' }),
  berichtGesamt: () => api.get('/tagesstatus/bericht/gesamt', { responseType: 'blob' }),
  import: (file: File, year: number, month: number) => { const fd = new FormData(); fd.append('file', file); return api.post(`/tagesstatus/import?year=${year}&month=${month}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
};

export const allgemeineInfoApi = {
  alle: () => api.get<AllgemeineInfo[]>('/allgemeineinfo'),
  erstellen: (data: { bezeichnung: string; wert?: string; sortierung: number }) => api.post<AllgemeineInfo>('/allgemeineinfo', data),
  aktualisieren: (id: number, data: { bezeichnung: string; wert?: string; sortierung: number }) => api.put<AllgemeineInfo>(`/allgemeineinfo/${id}`, data),
  loeschen: (id: number) => api.delete(`/allgemeineinfo/${id}`),
};

export default api;
