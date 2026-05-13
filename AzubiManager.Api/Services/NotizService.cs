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
            IQueryable<Notiz> query;
            if (_currentUser.IstAdmin)
                query = _db.Notizen.AsNoTracking();
            else
                query = _db.Notizen.AsNoTracking().Where(n => n.AusbilderId == _currentUser.BenutzerId);

            var result = await query.OrderByDescending(n => n.ErstelltAm).Select(n => new NotizDto
            {
                Id = n.Id, Titel = n.Titel, Inhalt = n.Inhalt, Kategorie = n.Kategorie,
                AzubiIds = n.AzubiIds, AusbilderId = n.AusbilderId, ErstelltAm = n.ErstelltAm
            }).ToListAsync();

            var alleIds = result.Where(r => !string.IsNullOrEmpty(r.AzubiIds))
                .SelectMany(r => r.AzubiIds!.Split(',', StringSplitOptions.RemoveEmptyEntries))
                .Select(int.Parse).Distinct().ToList();
            var namenMap = await _db.Teilnehmer.AsNoTracking()
                .Where(t => alleIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t.Vorname + " " + t.Nachname);
            foreach (var n in result.Where(r => r.AzubiIds != null))
            {
                var ids = n.AzubiIds!.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList();
                n.AzubiName = string.Join(", ", ids.Where(id => namenMap.ContainsKey(id)).Select(id => namenMap[id]));
            }
            return result;
        }

        public async Task<NotizDto> ErstellenAsync(NotizErstellenDto dto)
        {
            var notiz = new Notiz
            {
                Titel = dto.Titel, Inhalt = dto.Inhalt, Kategorie = dto.Kategorie,
                AzubiId = dto.AzubiId, AzubiIds = dto.AzubiIds,
                AusbilderId = _currentUser.BenutzerId
            };
            _db.Notizen.Add(notiz);
            await _db.SaveChangesAsync();

            var ids = notiz.AzubiIds?.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList() ?? new();
            var namen = ids.Count > 0 ? await _db.Teilnehmer.AsNoTracking()
                .Where(t => ids.Contains(t.Id)).Select(t => t.Vorname + " " + t.Nachname).ToListAsync() : new();
            return new NotizDto
            {
                Id = notiz.Id, Titel = notiz.Titel, Inhalt = notiz.Inhalt,
                Kategorie = notiz.Kategorie, AzubiIds = notiz.AzubiIds,
                AzubiName = string.Join(", ", namen), AusbilderId = notiz.AusbilderId, ErstelltAm = notiz.ErstelltAm
            };
        }

        public async Task<bool> LoeschenAsync(int id)
        {
            var notiz = await _db.Notizen.FindAsync(id);
            if (notiz == null) return false;
            if (!_currentUser.IstAdmin && notiz.AusbilderId != _currentUser.BenutzerId)
                throw new UnauthorizedAccessException();
            _db.Notizen.Remove(notiz);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
