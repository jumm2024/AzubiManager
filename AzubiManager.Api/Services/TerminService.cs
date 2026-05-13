using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Services
{
    public class TerminService
    {
        private readonly AppDbContext _db;
        private readonly CurrentUserService _currentUser;

        public TerminService(AppDbContext db, CurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<List<TerminDto>> AlleAbrufenAsync()
        {
            var query = _db.Termine.AsNoTracking()
                .Where(t => t.AusbilderId == _currentUser.BenutzerId);

            if (_currentUser.IstAdmin)
                query = _db.Termine.AsNoTracking();

            return await query
                .OrderBy(t => t.Datum)
                .Select(t => new TerminDto
                {
                    Id = t.Id,
                    Titel = t.Titel,
                    Beschreibung = t.Beschreibung,
                    Datum = t.Datum,
                    Endzeit = t.Endzeit,
                    Kategorie = t.Kategorie,
                    Ort = t.Ort,
                    AzubiId = t.AzubiId,
                    AzubiName = t.Azubi != null ? t.Azubi.Vorname + " " + t.Azubi.Nachname : null,
                    AusbilderId = t.AusbilderId
                }).ToListAsync();
        }

        public async Task<TerminDto> ErstellenAsync(TerminErstellenDto dto)
        {
            var termin = new Termin
            {
                Titel = dto.Titel,
                Beschreibung = dto.Beschreibung,
                Datum = dto.Datum,
                Endzeit = dto.Endzeit,
                Kategorie = dto.Kategorie,
                Ort = dto.Ort,
                AzubiId = dto.AzubiId,
                AusbilderId = _currentUser.BenutzerId
            };

            _db.Termine.Add(termin);
            await _db.SaveChangesAsync();

            return await _db.Termine.AsNoTracking()
                .Include(t => t.Azubi)
                .Where(t => t.Id == termin.Id)
                .Select(t => new TerminDto
                {
                    Id = t.Id,
                    Titel = t.Titel,
                    Beschreibung = t.Beschreibung,
                    Datum = t.Datum,
                    Endzeit = t.Endzeit,
                    Kategorie = t.Kategorie,
                    Ort = t.Ort,
                    AzubiId = t.AzubiId,
                    AzubiName = t.Azubi != null ? t.Azubi.Vorname + " " + t.Azubi.Nachname : null,
                    AusbilderId = t.AusbilderId
                }).FirstAsync();
        }

        public async Task<bool> LoeschenAsync(int id)
        {
            var termin = await _db.Termine.FindAsync(id);
            if (termin == null) return false;
            if (!_currentUser.IstAdmin && termin.AusbilderId != _currentUser.BenutzerId)
                throw new UnauthorizedAccessException();

            _db.Termine.Remove(termin);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}