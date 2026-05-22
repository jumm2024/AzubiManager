import { describe, it, expect } from 'vitest';
import {
  authApi,
  dashboardApi,
  teilnehmerApi,
  benutzerApi,
  aufgabenApi,
  notizenApi,
  termineApi,
  tagesstatusApi,
} from './client';

describe('API client', () => {
  it('authApi hat alle Endpunkte', () => {
    expect(authApi.login).toBeDefined();
    expect(authApi.logout).toBeDefined();
    expect(authApi.me).toBeDefined();
    expect(authApi.passwortAendern).toBeDefined();
  });

  it('dashboardApi hat alle Endpunkte', () => {
    expect(dashboardApi.get).toBeDefined();
  });

  it('teilnehmerApi hat alle Endpunkte', () => {
    expect(teilnehmerApi.alle).toBeDefined();
    expect(teilnehmerApi.erstellen).toBeDefined();
    expect(teilnehmerApi.aktualisieren).toBeDefined();
    expect(teilnehmerApi.loeschen).toBeDefined();
    expect(teilnehmerApi.meine).toBeDefined();
    expect(teilnehmerApi.betreuen).toBeDefined();
    expect(teilnehmerApi.nichtBetreuen).toBeDefined();
  });

  it('benutzerApi hat alle Endpunkte', () => {
    expect(benutzerApi.alle).toBeDefined();
    expect(benutzerApi.erstellen).toBeDefined();
    expect(benutzerApi.loeschen).toBeDefined();
    expect(benutzerApi.passwortZuruecksetzen).toBeDefined();
  });

  it('aufgabenApi hat alle Endpunkte', () => {
    expect(aufgabenApi.alle).toBeDefined();
    expect(aufgabenApi.erstellen).toBeDefined();
    expect(aufgabenApi.aktualisieren).toBeDefined();
    expect(aufgabenApi.loeschen).toBeDefined();
    expect(aufgabenApi.toggleErledigt).toBeDefined();
  });

  it('notizenApi hat alle Endpunkte', () => {
    expect(notizenApi.alle).toBeDefined();
    expect(notizenApi.erstellen).toBeDefined();
    expect(notizenApi.aktualisieren).toBeDefined();
    expect(notizenApi.loeschen).toBeDefined();
  });

  it('termineApi hat alle Endpunkte', () => {
    expect(termineApi.alle).toBeDefined();
    expect(termineApi.erstellen).toBeDefined();
    expect(termineApi.aktualisieren).toBeDefined();
    expect(termineApi.loeschen).toBeDefined();
  });

  it('tagesstatusApi hat alle Endpunkte', () => {
    expect(tagesstatusApi.alleFuerDatum).toBeDefined();
    expect(tagesstatusApi.setzen).toBeDefined();
    expect(tagesstatusApi.loeschen).toBeDefined();
    expect(tagesstatusApi.export).toBeDefined();
    expect(tagesstatusApi.bericht).toBeDefined();
    expect(tagesstatusApi.berichtGesamt).toBeDefined();
    expect(tagesstatusApi.import).toBeDefined();
  });
});
