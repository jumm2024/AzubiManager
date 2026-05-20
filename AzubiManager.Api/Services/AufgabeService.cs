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
            IQueryable<Aufgabe> query = _db.Aufgaben.AsNoTracking();

            if (erledigt.HasValue)
                query = query.Where(a => a.Erledigt == erledigt.Value);

            var result = await query
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
                    AzubiIds = a.AzubiIds,
                    AusbilderId = a.AusbilderId
                }).ToListAsync();

            // Azubi-Namen für IDs auflösen
            var alleIds = result.Where(r => !string.IsNullOrEmpty(r.AzubiIds))
                .SelectMany(r => r.AzubiIds!.Split(',', StringSplitOptions.RemoveEmptyEntries))
                .Select(int.Parse).Distinct().ToList();
            var namenMap = await _db.Teilnehmer.AsNoTracking()
                .Where(t => alleIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t.Vorname + " " + t.Nachname);

            foreach (var aufgabe in result.Where(r => r.AzubiIds != null))
            {
                var ids = aufgabe.AzubiIds!.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(int.Parse).ToList();
                aufgabe.AzubiName = string.Join(", ", ids.Where(id => namenMap.ContainsKey(id)).Select(id => namenMap[id]));
            }

            return result;
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
                AzubiIds = dto.AzubiIds,
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

            _db.Aufgaben.Remove(aufgabe);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ToggleErledigtAsync(int id)
        {
            var aufgabe = await _db.Aufgaben.FindAsync(id);
            if (aufgabe == null) return false;

            aufgabe.Erledigt = !aufgabe.Erledigt;
            await _db.SaveChangesAsync();
            return true;
        }

        private async Task<AufgabeDto> AlsDtoAsync(int id)
        {
            var a = await _db.Aufgaben.AsNoTracking()
                .FirstAsync(x => x.Id == id);

            var namen = "";
            if (!string.IsNullOrEmpty(a.AzubiIds))
            {
                var ids = a.AzubiIds.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList();
                var namenListe = await _db.Teilnehmer.AsNoTracking()
                    .Where(t => ids.Contains(t.Id))
                    .Select(t => t.Vorname + " " + t.Nachname)
                    .ToListAsync();
                namen = string.Join(", ", namenListe);
            }

            return new AufgabeDto
            {
                Id = a.Id,
                Titel = a.Titel,
                Beschreibung = a.Beschreibung,
                Prioritaet = a.Prioritaet,
                Faelligkeitsdatum = a.Faelligkeitsdatum,
                Erledigt = a.Erledigt,
                IstGlobal = a.IstGlobal,
                AzubiIds = a.AzubiIds,
                AzubiName = namen,
                AusbilderId = a.AusbilderId
            };
        }
    }
}