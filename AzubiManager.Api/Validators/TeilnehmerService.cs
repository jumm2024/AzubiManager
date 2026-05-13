using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Services
{
    public class TeilnehmerService
    {
        private readonly AppDbContext _db;
        private readonly CurrentUserService _currentUser;

        public TeilnehmerService(AppDbContext db, CurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<List<TeilnehmerDto>> AlleAbrufenAsync(string? gruppe = null)
        {
            var query = _db.Teilnehmer.AsNoTracking();

            if (!_currentUser.IstAdmin)
                query = query.Where(t => t.AusbilderId == _currentUser.BenutzerId);

            if (!string.IsNullOrEmpty(gruppe))
                query = query.Where(t => t.Gruppe == gruppe);

            return await query
                .OrderBy(t => t.Nachname).ThenBy(t => t.Vorname)
                .Select(t => new TeilnehmerDto
                {
                    Id = t.Id,
                    Vorname = t.Vorname,
                    Nachname = t.Nachname,
                    Geburtsdatum = t.Geburtsdatum,
                    Kurs = t.Kurs,
                    Lehrjahr = t.Lehrjahr,
                    Abteilung = t.Abteilung,
                    Gruppe = t.Gruppe,
                    Ausbildungsstart = t.Ausbildungsstart,
                    Ausbildungsende = t.Ausbildungsende,
                    AusbilderId = t.AusbilderId,
                    AusbilderName = t.Ausbilder != null ? t.Ausbilder.Vorname + " " + t.Ausbilder.Nachname : null
                }).ToListAsync();
        }

        public async Task<TeilnehmerDto?> EinzelnenAbrufenAsync(int id)
        {
            var t = await _db.Teilnehmer.AsNoTracking().Include(x => x.Ausbilder).FirstOrDefaultAsync(x => x.Id == id);
            if (t == null) return null;

            if (!_currentUser.IstAdmin && t.AusbilderId != _currentUser.BenutzerId)
                throw new UnauthorizedAccessException();

            return new TeilnehmerDto
            {
                Id = t.Id,
                Vorname = t.Vorname,
                Nachname = t.Nachname,
                Geburtsdatum = t.Geburtsdatum,
                Kurs = t.Kurs,
                Lehrjahr = t.Lehrjahr,
                Abteilung = t.Abteilung,
                Gruppe = t.Gruppe,
                Ausbildungsstart = t.Ausbildungsstart,
                Ausbildungsende = t.Ausbildungsende,
                AusbilderId = t.AusbilderId,
                AusbilderName = t.Ausbilder?.Vorname + " " + t.Ausbilder?.Nachname
            };
        }

        public async Task<TeilnehmerDto> ErstellenAsync(TeilnehmerErstellenDto dto)
        {
            var teilnehmer = new Teilnehmer
            {
                Vorname = dto.Vorname,
                Nachname = dto.Nachname,
                Geburtsdatum = dto.Geburtsdatum,
                Kurs = dto.Kurs,
                Lehrjahr = dto.Lehrjahr,
                Abteilung = dto.Abteilung,
                Gruppe = dto.Gruppe,
                Ausbildungsstart = dto.Ausbildungsstart,
                Ausbildungsende = dto.Ausbildungsende,
                AusbilderId = _currentUser.BenutzerId
            };

            _db.Teilnehmer.Add(teilnehmer);
            await _db.SaveChangesAsync();

            return new TeilnehmerDto
            {
                Id = teilnehmer.Id,
                Vorname = teilnehmer.Vorname,
                Nachname = teilnehmer.Nachname,
                Geburtsdatum = teilnehmer.Geburtsdatum,
                Kurs = teilnehmer.Kurs,
                Lehrjahr = teilnehmer.Lehrjahr,
                Abteilung = teilnehmer.Abteilung,
                Gruppe = teilnehmer.Gruppe,
                Ausbildungsstart = teilnehmer.Ausbildungsstart,
                Ausbildungsende = teilnehmer.Ausbildungsende,
                AusbilderId = teilnehmer.AusbilderId
            };
        }

        public async Task<TeilnehmerDto?> AktualisierenAsync(int id, TeilnehmerAktualisierenDto dto)
        {
            var teilnehmer = await _db.Teilnehmer.FindAsync(id);
            if (teilnehmer == null) return null;

            if (!_currentUser.IstAdmin && teilnehmer.AusbilderId != _currentUser.BenutzerId)
                throw new UnauthorizedAccessException();

            teilnehmer.Vorname = dto.Vorname;
            teilnehmer.Nachname = dto.Nachname;
            teilnehmer.Geburtsdatum = dto.Geburtsdatum;
            teilnehmer.Kurs = dto.Kurs;
            teilnehmer.Lehrjahr = dto.Lehrjahr;
            teilnehmer.Abteilung = dto.Abteilung;
            teilnehmer.Gruppe = dto.Gruppe;
            teilnehmer.Ausbildungsstart = dto.Ausbildungsstart;
            teilnehmer.Ausbildungsende = dto.Ausbildungsende;

            await _db.SaveChangesAsync();

            return new TeilnehmerDto
            {
                Id = teilnehmer.Id,
                Vorname = teilnehmer.Vorname,
                Nachname = teilnehmer.Nachname,
                Geburtsdatum = teilnehmer.Geburtsdatum,
                Kurs = teilnehmer.Kurs,
                Lehrjahr = teilnehmer.Lehrjahr,
                Abteilung = teilnehmer.Abteilung,
                Gruppe = teilnehmer.Gruppe,
                Ausbildungsstart = teilnehmer.Ausbildungsstart,
                Ausbildungsende = teilnehmer.Ausbildungsende,
                AusbilderId = teilnehmer.AusbilderId
            };
        }

        public async Task<bool> LoeschenAsync(int id)
        {
            var teilnehmer = await _db.Teilnehmer.FindAsync(id);
            if (teilnehmer == null) return false;

            if (!_currentUser.IstAdmin && teilnehmer.AusbilderId != _currentUser.BenutzerId)
                throw new UnauthorizedAccessException();

            _db.Teilnehmer.Remove(teilnehmer);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}