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
            var betreuteIds = await _db.AzubiBetreuer
                .AsNoTracking()
                .Where(b => b.BenutzerId == _currentUser.BenutzerId)
                .Select(b => b.TeilnehmerId)
                .ToListAsync();

            IQueryable<Termin> query = _db.Termine.AsNoTracking()
                .Where(t => t.AzubiId != null && betreuteIds.Contains((int)t.AzubiId));

            var result = await query.OrderBy(t => t.Datum).Select(t => new TerminDto
            {
                Id = t.Id, Titel = t.Titel, Beschreibung = t.Beschreibung, Datum = t.Datum,
                Endzeit = t.Endzeit, Kategorie = t.Kategorie, Ort = t.Ort,
                AzubiId = t.AzubiId, AzubiIds = t.AzubiIds, AusbilderId = t.AusbilderId,
                AusbilderName = t.Ausbilder != null ? t.Ausbilder.Vorname + " " + t.Ausbilder.Nachname : null
            }).ToListAsync();

            var alleIds = result.Where(r => !string.IsNullOrEmpty(r.AzubiIds))
                .SelectMany(r => r.AzubiIds!.Split(',', StringSplitOptions.RemoveEmptyEntries))
                .Select(ParseId).Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
            var namenMap = await _db.Teilnehmer.AsNoTracking()
                .Where(t => alleIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t.Vorname + " " + t.Nachname);
            foreach (var t in result.Where(r => r.AzubiIds != null))
            {
                var ids = t.AzubiIds!.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(ParseId).Where(id => id.HasValue).Select(id => id!.Value).ToList();
                t.AzubiName = string.Join(", ", ids.Where(id => namenMap.ContainsKey(id)).Select(id => namenMap[id]));
            }
            return result;
        }

        public async Task<TerminDto> ErstellenAsync(TerminErstellenDto dto)
        {
            var termin = new Termin
            {
                Titel = dto.Titel, Beschreibung = dto.Beschreibung, Datum = dto.Datum,
                Endzeit = dto.Endzeit, Kategorie = dto.Kategorie, Ort = dto.Ort,
                AzubiId = dto.AzubiId ?? ExtractFirstId(dto.AzubiIds), AzubiIds = dto.AzubiIds,
                AusbilderId = _currentUser.BenutzerId
            };
            _db.Termine.Add(termin);
            await _db.SaveChangesAsync();

            var ids = termin.AzubiIds?.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(ParseId).Where(id => id.HasValue).Select(id => id!.Value).ToList() ?? new();
            var namen = ids.Count > 0 ? await _db.Teilnehmer.AsNoTracking()
                .Where(t => ids.Contains(t.Id)).Select(t => t.Vorname + " " + t.Nachname).ToListAsync() : new();
            var ausbilderName = await _db.Benutzer.AsNoTracking()
                .Where(u => u.Id == _currentUser.BenutzerId)
                .Select(u => u.Vorname + " " + u.Nachname).FirstOrDefaultAsync();
            return new TerminDto
            {
                Id = termin.Id, Titel = termin.Titel, Beschreibung = termin.Beschreibung,
                Datum = termin.Datum, Endzeit = termin.Endzeit, Kategorie = termin.Kategorie,
                Ort = termin.Ort, AzubiId = termin.AzubiId, AzubiIds = termin.AzubiIds,
                AzubiName = string.Join(", ", namen), AusbilderId = termin.AusbilderId,
                AusbilderName = ausbilderName
            };
        }

        public async Task<TerminDto?> AktualisierenAsync(int id, TerminAktualisierenDto dto)
        {
            var termin = await _db.Termine.FindAsync(id);
            if (termin == null) return null;

            termin.Titel = dto.Titel;
            termin.Beschreibung = dto.Beschreibung;
            termin.Datum = dto.Datum;
            termin.Endzeit = dto.Endzeit;
            termin.Kategorie = dto.Kategorie;
            termin.Ort = dto.Ort;
            termin.AzubiId = dto.AzubiId ?? ExtractFirstId(dto.AzubiIds) ?? termin.AzubiId;
            termin.AzubiIds = dto.AzubiIds;

            await _db.SaveChangesAsync();

            var ids = termin.AzubiIds?.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(ParseId).Where(id => id.HasValue).Select(id => id!.Value).ToList() ?? new();
            var namen = ids.Count > 0 ? await _db.Teilnehmer.AsNoTracking()
                .Where(t => ids.Contains(t.Id)).Select(t => t.Vorname + " " + t.Nachname).ToListAsync() : new();
            var ausbilderName = await _db.Benutzer.AsNoTracking()
                .Where(u => u.Id == termin.AusbilderId)
                .Select(u => u.Vorname + " " + u.Nachname).FirstOrDefaultAsync();
            return new TerminDto
            {
                Id = termin.Id, Titel = termin.Titel, Beschreibung = termin.Beschreibung,
                Datum = termin.Datum, Endzeit = termin.Endzeit, Kategorie = termin.Kategorie,
                Ort = termin.Ort, AzubiId = termin.AzubiId, AzubiIds = termin.AzubiIds,
                AzubiName = string.Join(", ", namen), AusbilderId = termin.AusbilderId,
                AusbilderName = ausbilderName
            };
        }

        public async Task<bool> LoeschenAsync(int id)
        {
            var termin = await _db.Termine.FindAsync(id);
            if (termin == null) return false;
            _db.Termine.Remove(termin);
            await _db.SaveChangesAsync();
            return true;
        }

        private static int? ParseId(string s) =>
            int.TryParse(s, out var id) ? id : null;

        private static int? ExtractFirstId(string? azubiIds)
        {
            if (string.IsNullOrWhiteSpace(azubiIds)) return null;
            var parts = azubiIds.Split(',', StringSplitOptions.RemoveEmptyEntries);
            return parts.Length > 0 && int.TryParse(parts[0], out var id) ? id : null;
        }
    }
}
