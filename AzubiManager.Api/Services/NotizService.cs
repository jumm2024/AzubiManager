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
            var query = _db.Notizen.AsNoTracking()
                .Where(n => n.AusbilderId == _currentUser.BenutzerId);

            if (_currentUser.IstAdmin)
                query = _db.Notizen.AsNoTracking();

            return await query
                .OrderByDescending(n => n.ErstelltAm)
                .Select(n => new NotizDto
                {
                    Id = n.Id,
                    Titel = n.Titel,
                    Inhalt = n.Inhalt,
                    Kategorie = n.Kategorie,
                    AzubiId = n.AzubiId,
                    AzubiName = n.Azubi != null ? n.Azubi.Vorname + " " + n.Azubi.Nachname : null,
                    AusbilderId = n.AusbilderId,
                    ErstelltAm = n.ErstelltAm
                }).ToListAsync();
        }

        public async Task<NotizDto> ErstellenAsync(NotizErstellenDto dto)
        {
            var notiz = new Notiz
            {
                Titel = dto.Titel,
                Inhalt = dto.Inhalt,
                Kategorie = dto.Kategorie,
                AzubiId = dto.AzubiId,
                AusbilderId = _currentUser.BenutzerId
            };

            _db.Notizen.Add(notiz);
            await _db.SaveChangesAsync();

            return await _db.Notizen.AsNoTracking()
                .Include(n => n.Azubi)
                .Where(n => n.Id == notiz.Id)
                .Select(n => new NotizDto
                {
                    Id = n.Id,
                    Titel = n.Titel,
                    Inhalt = n.Inhalt,
                    Kategorie = n.Kategorie,
                    AzubiId = n.AzubiId,
                    AzubiName = n.Azubi != null ? n.Azubi.Vorname + " " + n.Azubi.Nachname : null,
                    AusbilderId = n.AusbilderId,
                    ErstelltAm = n.ErstelltAm
                }).FirstAsync();
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