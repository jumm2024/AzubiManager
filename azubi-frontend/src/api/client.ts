import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Teilnehmer {
  id: number;
  vorname: string;
  nachname: string;
  gruppe?: string;
  status?: string;
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
  azubiName?: string;
}

export interface Notiz {
  id: number;
  titel: string;
  inhalt?: string;
  erstelltAm: string;
  azubiName?: string;
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
}

export interface Tagesstatus {
  id: number;
  teilnehmerId: number;
  datum: string;
  status: string;
}

export const authApi = {
  login: (benutzername: string, passwort: string) =>
    api.post('/auth/login', { benutzername, passwort }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  passwortAendern: (altesPasswort: string, neuesPasswort: string) =>
    api.post('/auth/passwort-aendern', { altesPasswort, neuesPasswort }),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const teilnehmerApi = {
  alle: (gruppe?: string) => api.get<Teilnehmer[]>('/teilnehmer', { params: { gruppe } }),
  erstellen: (data: Partial<Teilnehmer>) => api.post<Teilnehmer>('/teilnehmer', data),
  aktualisieren: (id: number, data: Partial<Teilnehmer>) => api.put<Teilnehmer>(`/teilnehmer/${id}`, data),
  loeschen: (id: number) => api.delete(`/teilnehmer/${id}`),
};

export const benutzerApi = {
  alle: () => api.get<Benutzer[]>('/users'),
  erstellen: (data: { benutzername: string; passwort: string; vorname?: string; nachname?: string; rolle: string }) => api.post<Benutzer>('/users', data),
  loeschen: (id: number) => api.delete(`/users/${id}`),
  passwortZuruecksetzen: (id: number, passwort: string) => api.put(`/users/${id}/passwort`, { passwort }),
};

export const aufgabenApi = {
  alle: (erledigt?: boolean) => api.get<Aufgabe[]>('/aufgaben', { params: { erledigt } }),
  erstellen: (data: Partial<Aufgabe>) => api.post<Aufgabe>('/aufgaben', data),
  aktualisieren: (id: number, data: Partial<Aufgabe>) => api.put<Aufgabe>(`/aufgaben/${id}`, data),
  loeschen: (id: number) => api.delete(`/aufgaben/${id}`),
  toggleErledigt: (id: number) => api.patch(`/aufgaben/${id}/erledigt`),
};

export const notizenApi = {
  alle: () => api.get<Notiz[]>('/notizen'),
  erstellen: (data: Partial<Notiz>) => api.post<Notiz>('/notizen', data),
  aktualisieren: (id: number, data: Partial<Notiz>) => api.put<Notiz>(`/notizen/${id}`, data),
  loeschen: (id: number) => api.delete(`/notizen/${id}`),
};

export const termineApi = {
  alle: () => api.get<Termin[]>('/termine'),
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
  import: (file: File) => { const fd = new FormData(); fd.append('file', file); return api.post('/tagesstatus/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
};

export default api;
