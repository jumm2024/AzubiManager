using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Services
{
    public class NotizService
    {
        private readonly AppDbContext _db;
        private readonly CurrentUserService _currentUser;

        public NotizService(AppDbContext db, CurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<List<NotizDto>> AlleAbrufenAsync()
        {
            var betreuteIds = await _db.AzubiBetreuer
                .AsNoTracking()
                .Where(b => b.BenutzerId == _currentUser.BenutzerId)
                .Select(b => b.TeilnehmerId)
                .ToListAsync();

            IQueryable<Notiz> query = _db.Notizen.AsNoTracking()
                .Where(n => n.AzubiId != null && betreuteIds.Contains((int)n.AzubiId));

            var result = await query.OrderByDescending(n => n.ErstelltAm).Select(n => new NotizDto
            {
                Id = n.Id, Titel = n.Titel, Inhalt = n.Inhalt, Kategorie = n.Kategorie,
                AzubiId = n.AzubiId, AzubiIds = n.AzubiIds, AusbilderId = n.AusbilderId, ErstelltAm = n.ErstelltAm,
                AusbilderName = n.Ausbilder != null ? n.Ausbilder.Vorname + " " + n.Ausbilder.Nachname : null
            }).ToListAsync();

            var alleIds = result.Where(r => !string.IsNullOrEmpty(r.AzubiIds))
                .SelectMany(r => r.AzubiIds!.Split(',', StringSplitOptions.RemoveEmptyEntries))
                .Select(ParseId).Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
            var namenMap = await _db.Teilnehmer.AsNoTracking()
                .Where(t => alleIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t.Vorname + " " + t.Nachname);
            foreach (var n in result.Where(r => r.AzubiIds != null))
            {
                var ids = n.AzubiIds!.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(ParseId).Where(id => id.HasValue).Select(id => id!.Value).ToList();
                n.AzubiName = string.Join(", ", ids.Where(id => namenMap.ContainsKey(id)).Select(id => namenMap[id]));
            }
            return result;
        }

        public async Task<NotizDto> ErstellenAsync(NotizErstellenDto dto)
        {
            var notiz = new Notiz
            {
                Titel = dto.Titel, Inhalt = dto.Inhalt, Kategorie = dto.Kategorie,
                AzubiId = dto.AzubiId ?? ExtractFirstId(dto.AzubiIds), AzubiIds = dto.AzubiIds,
                AusbilderId = _currentUser.BenutzerId
            };
            _db.Notizen.Add(notiz);
            await _db.SaveChangesAsync();

            var ids = notiz.AzubiIds?.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(ParseId).Where(id => id.HasValue).Select(id => id!.Value).ToList() ?? new();
            var namen = ids.Count > 0 ? await _db.Teilnehmer.AsNoTracking()
                .Where(t => ids.Contains(t.Id)).Select(t => t.Vorname + " " + t.Nachname).ToListAsync() : new();
            var ausbilderName = await _db.Benutzer.AsNoTracking()
                .Where(u => u.Id == _currentUser.BenutzerId)
                .Select(u => u.Vorname + " " + u.Nachname).FirstOrDefaultAsync();
            return new NotizDto
            {
                Id = notiz.Id, Titel = notiz.Titel, Inhalt = notiz.Inhalt,
                Kategorie = notiz.Kategorie, AzubiId = notiz.AzubiId, AzubiIds = notiz.AzubiIds,
                AzubiName = string.Join(", ", namen), AusbilderId = notiz.AusbilderId, ErstelltAm = notiz.ErstelltAm,
                AusbilderName = ausbilderName
            };
        }

        public async Task<NotizDto?> AktualisierenAsync(int id, NotizAktualisierenDto dto)
        {
            var notiz = await _db.Notizen.FindAsync(id);
            if (notiz == null) return null;

            notiz.Titel = dto.Titel;
            notiz.Inhalt = dto.Inhalt;
            notiz.Kategorie = dto.Kategorie;
            notiz.AzubiId = dto.AzubiId ?? ExtractFirstId(dto.AzubiIds) ?? notiz.AzubiId;
            notiz.AzubiIds = dto.AzubiIds;

            await _db.SaveChangesAsync();

            var ids = notiz.AzubiIds?.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(ParseId).Where(id => id.HasValue).Select(id => id!.Value).ToList() ?? new();
            var namen = ids.Count > 0 ? await _db.Teilnehmer.AsNoTracking()
                .Where(t => ids.Contains(t.Id)).Select(t => t.Vorname + " " + t.Nachname).ToListAsync() : new();
            var ausbilderName = await _db.Benutzer.AsNoTracking()
                .Where(u => u.Id == notiz.AusbilderId)
                .Select(u => u.Vorname + " " + u.Nachname).FirstOrDefaultAsync();
            return new NotizDto
            {
                Id = notiz.Id, Titel = notiz.Titel, Inhalt = notiz.Inhalt,
                Kategorie = notiz.Kategorie, AzubiId = notiz.AzubiId, AzubiIds = notiz.AzubiIds,
                AzubiName = string.Join(", ", namen), AusbilderId = notiz.AusbilderId, ErstelltAm = notiz.ErstelltAm,
                AusbilderName = ausbilderName
            };
        }

        public async Task<bool> LoeschenAsync(int id)
        {
            var notiz = await _db.Notizen.FindAsync(id);
            if (notiz == null) return false;
            _db.Notizen.Remove(notiz);
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
