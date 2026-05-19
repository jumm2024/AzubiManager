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
  alle: (gruppe?: string) => api.get('/teilnehmer', { params: { gruppe } }),
  erstellen: (data: any) => api.post('/teilnehmer', data),
  aktualisieren: (id: number, data: any) => api.put(`/teilnehmer/${id}`, data),
  loeschen: (id: number) => api.delete(`/teilnehmer/${id}`),
};
export const benutzerApi = {
  alle: () => api.get('/users'),
  erstellen: (data: any) => api.post('/users', data),
  loeschen: (id: number) => api.delete(`/users/${id}`),
  passwortZuruecksetzen: (id: number, passwort: string) => api.put(`/users/${id}/passwort`, { passwort }),
};
export const aufgabenApi = {
  alle: (erledigt?: boolean) => api.get('/aufgaben', { params: { erledigt } }),
  erstellen: (data: any) => api.post('/aufgaben', data),
  aktualisieren: (id: number, data: any) => api.put(`/aufgaben/${id}`, data),
  loeschen: (id: number) => api.delete(`/aufgaben/${id}`),
  toggleErledigt: (id: number) => api.patch(`/aufgaben/${id}/erledigt`),
};
export const notizenApi = {
  alle: () => api.get('/notizen'),
  erstellen: (data: any) => api.post('/notizen', data),
  aktualisieren: (id: number, data: any) => api.put(`/notizen/${id}`, data),
  loeschen: (id: number) => api.delete(`/notizen/${id}`),
};
export const termineApi = {
  alle: () => api.get('/termine'),
  erstellen: (data: any) => api.post('/termine', data),
  aktualisieren: (id: number, data: any) => api.put(`/termine/${id}`, data),
  loeschen: (id: number) => api.delete(`/termine/${id}`),
};
export const tagesstatusApi = {
  alleFuerDatum: (datum: string) => api.get(`/tagesstatus/${datum}`),
  setzen: (data: any) => api.post('/tagesstatus', data),
  loeschen: (id: number) => api.delete(`/tagesstatus/${id}`),
  export: (year: number, month: number) => api.get(`/tagesstatus/export/${year}/${month}`, { responseType: 'blob' }),
  import: (file: File) => { const fd = new FormData(); fd.append('file', file); return api.post('/tagesstatus/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
};
export default api;
