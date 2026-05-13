using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Services
{
    public class AufgabeService
    {
        private readonly AppDbContext _db;
        private readonly CurrentUserService _currentUser;

        public AufgabeService(AppDbContext db, CurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<List<AufgabeDto>> AlleAbrufenAsync(bool? erledigt = null)
        {
            IQueryable<Aufgabe> query;

            if (_currentUser.IstAdmin)
            {
                query = _db.Aufgaben.AsNoTracking();
            }
            else
            {
                // Eigene Aufgaben + global sichtbare Aufgaben
                query = _db.Aufgaben.AsNoTracking()
                    .Where(a => a.AusbilderId == _currentUser.BenutzerId || a.IstGlobal);
            }

            if (erledigt.HasValue)
                query = query.Where(a => a.Erledigt == erledigt.Value);

            return await query
                .OrderBy(a => a.Faelligkeitsdatum)
                .Select(a => new AufgabeDto
                {
                    Id = a.Id,
                    Titel = a.Titel,
                    Beschreibung = a.Beschreibung,
                    Prioritaet = a.Prioritaet,
                    Faelligkeitsdatum = a.Faelligkeitsdatum,
                    Erledigt = a.Erledigt,
                    IstGlobal = a.IstGlobal,
                    AzubiId = a.AzubiId,
                    AzubiName = a.Azubi != null ? a.Azubi.Vorname + " " + a.Azubi.Nachname : null,
                    AusbilderId = a.AusbilderId
                }).ToListAsync();
        }

        public async Task<AufgabeDto> ErstellenAsync(AufgabeErstellenDto dto)
        {
            var aufgabe = new Aufgabe
            {
                Titel = dto.Titel,
                Beschreibung = dto.Beschreibung,
                Prioritaet = dto.Prioritaet,
                Faelligkeitsdatum = dto.Faelligkeitsdatum,
                IstGlobal = dto.IstGlobal,
                AzubiId = dto.AzubiId,
                AusbilderId = _currentUser.BenutzerId
            };

            _db.Aufgaben.Add(aufgabe);
            await _db.SaveChangesAsync();

            return await AlsDtoAsync(aufgabe.Id);
        }

        public async Task<AufgabeDto?> AktualisierenAsync(int id, AufgabeAktualisierenDto dto)
        {
            var aufgabe = await _db.Aufgaben.FindAsync(id);
            if (aufgabe == null) return null;

            if (!_currentUser.IstAdmin && aufgabe.AusbilderId != _currentUser.BenutzerId)
                throw new UnauthorizedAccessException();

            aufgabe.Titel = dto.Titel;
            aufgabe.Beschreibung = dto.Beschreibung;
            aufgabe.Prioritaet = dto.Prioritaet;
            aufgabe.Faelligkeitsdatum = dto.Faelligkeitsdatum;
            aufgabe.Erledigt = dto.Erledigt;
            aufgabe.AzubiId = dto.AzubiId;

            await _db.SaveChangesAsync();
            return await AlsDtoAsync(aufgabe.Id);
        }

        public async Task<bool> LoeschenAsync(int id)
        {
            var aufgabe = await _db.Aufgaben.FindAsync(id);
            if (aufgabe == null) return false;

            if (!_currentUser.IstAdmin && aufgabe.AusbilderId != _currentUser.BenutzerId)
                throw new UnauthorizedAccessException();

            _db.Aufgaben.Remove(aufgabe);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ToggleErledigtAsync(int id)
        {
            var aufgabe = await _db.Aufgaben.FindAsync(id);
            if (aufgabe == null) return false;

            if (!_currentUser.IstAdmin && aufgabe.AusbilderId != _currentUser.BenutzerId)
                throw new UnauthorizedAccessException();

            aufgabe.Erledigt = !aufgabe.Erledigt;
            await _db.SaveChangesAsync();
            return true;
        }

        private async Task<AufgabeDto> AlsDtoAsync(int id)
        {
            var a = await _db.Aufgaben.AsNoTracking()
                .Include(x => x.Azubi)
                .FirstAsync(x => x.Id == id);

            return new AufgabeDto
            {
                Id = a.Id,
                Titel = a.Titel,
                Beschreibung = a.Beschreibung,
                Prioritaet = a.Prioritaet,
                Faelligkeitsdatum = a.Faelligkeitsdatum,
                Erledigt = a.Erledigt,
                IstGlobal = a.IstGlobal,
                AzubiId = a.AzubiId,
                AzubiName = a.Azubi != null ? a.Azubi.Vorname + " " + a.Azubi.Nachname : null,
                AusbilderId = a.AusbilderId
            };
        }
    }
}