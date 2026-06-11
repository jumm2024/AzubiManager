using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace AzubiManager.Api.Services
{
    public class AufgabeService
    {
        private readonly AppDbContext _db;
        private readonly CurrentUserService _currentUser;
        private readonly IMemoryCache _cache;

        public AufgabeService(AppDbContext db, CurrentUserService currentUser, IMemoryCache cache)
        {
            _db = db;
            _currentUser = currentUser;
            _cache = cache;
        }

        public async Task<PagedResponse<AufgabeDto>> AlleAbrufenAsync(bool? erledigt = null, int? skip = null, int? take = null, string? prioritaet = null, string? art = null)
        {
            var betreuteIds = await GetBetreuteIdsAsync();

            IQueryable<Aufgabe> query = _db.Aufgaben.AsNoTracking()
                .Where(a => (a.AzubiId != null && betreuteIds.Contains((int)a.AzubiId))
                         || (a.AzubiId == null && a.AusbilderId == _currentUser.BenutzerId));

            if (erledigt.HasValue)
                query = query.Where(a => a.Erledigt == erledigt.Value);

            if (!string.IsNullOrEmpty(prioritaet))
                query = query.Where(a => a.Prioritaet == prioritaet);

            if (art == "eigene")
                query = query.Where(a => a.AzubiId == null && a.AusbilderId == _currentUser.BenutzerId);
            else if (art == "azubi")
                query = query.Where(a => a.AzubiId != null);

            var totalCount = await query.CountAsync();

            var resultQuery = query
                .OrderBy(a => a.Faelligkeitsdatum)
                .Select(a => new AufgabeDto
                {
                    Id = a.Id,
                    Titel = a.Titel,
                    Beschreibung = a.Beschreibung,
                    Prioritaet = a.Prioritaet,
                    Faelligkeitsdatum = a.Faelligkeitsdatum,
                    Erledigt = a.Erledigt,
                    AzubiId = a.AzubiId,
                    IstGlobal = a.IstGlobal,
                    AzubiIds = a.AzubiIds,
                    AusbilderId = a.AusbilderId,
                    AusbilderName = a.Ausbilder != null ? a.Ausbilder.Vorname + " " + a.Ausbilder.Nachname : null,
                    ErledigtVonName = a.ErledigtVon != null ? a.ErledigtVon.Vorname + " " + a.ErledigtVon.Nachname : null
                });

            if (skip.HasValue) resultQuery = resultQuery.Skip(skip.Value);
            if (take.HasValue) resultQuery = resultQuery.Take(take.Value);

            var result = await resultQuery.ToListAsync();

            var alleIds = result.Where(r => !string.IsNullOrEmpty(r.AzubiIds))
                .SelectMany(r => r.AzubiIds!.Split(',', StringSplitOptions.RemoveEmptyEntries))
                .Select(ParseId)
                .Where(id => id.HasValue)
                .Select(id => id!.Value).Distinct().ToList();

            if (alleIds.Count > 0)
            {
                var namenMap = await _db.Teilnehmer.AsNoTracking()
                    .Where(t => alleIds.Contains(t.Id))
                    .ToDictionaryAsync(t => t.Id, t => t.Vorname + " " + t.Nachname);

                foreach (var aufgabe in result.Where(r => r.AzubiIds != null))
                {
                    var ids = aufgabe.AzubiIds!.Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(ParseId)
                        .Where(id => id.HasValue)
                        .Select(id => id!.Value).ToList();
                    aufgabe.AzubiName = string.Join(", ", ids.Where(id => namenMap.ContainsKey(id)).Select(id => namenMap[id]));
                }
            }

            return new PagedResponse<AufgabeDto> { Items = result, TotalCount = totalCount };
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
                AzubiId = dto.AzubiId ?? ExtractFirstId(dto.AzubiIds),
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
            if (dto.Erledigt && !aufgabe.ErledigtVonId.HasValue)
                aufgabe.ErledigtVonId = _currentUser.BenutzerId;
            else if (!dto.Erledigt)
                aufgabe.ErledigtVonId = null;
            if (dto.AzubiIds != null)
            {
                aufgabe.AzubiIds = string.IsNullOrEmpty(dto.AzubiIds) ? null : dto.AzubiIds;
                aufgabe.AzubiId = string.IsNullOrEmpty(dto.AzubiIds) ? null : (dto.AzubiId ?? ExtractFirstId(dto.AzubiIds));
            }
            else if (dto.AzubiId.HasValue)
            {
                aufgabe.AzubiId = dto.AzubiId;
            }

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
            if (aufgabe.Erledigt)
                aufgabe.ErledigtVonId = _currentUser.BenutzerId;
            else
                aufgabe.ErledigtVonId = null;

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

        private async Task<AufgabeDto> AlsDtoAsync(int id)
        {
            var a = await _db.Aufgaben.AsNoTracking()
                .Include(x => x.Ausbilder)
                .Include(x => x.ErledigtVon)
                .FirstAsync(x => x.Id == id);

            var namen = "";
            if (!string.IsNullOrEmpty(a.AzubiIds))
            {
                var ids = a.AzubiIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(ParseId).Where(id => id.HasValue).Select(id => id!.Value).ToList();
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
                AzubiId = a.AzubiId,
                IstGlobal = a.IstGlobal,
                AzubiIds = a.AzubiIds,
                AzubiName = namen,
                AusbilderId = a.AusbilderId,
                AusbilderName = a.Ausbilder != null ? a.Ausbilder.Vorname + " " + a.Ausbilder.Nachname : null,
                ErledigtVonName = a.ErledigtVon != null ? a.ErledigtVon.Vorname + " " + a.ErledigtVon.Nachname : null
            };
        }

        private async Task<List<int>> GetBetreuteIdsAsync()
        {
            var cacheKey = $"betreuteIds_{_currentUser.BenutzerId}";

            if (_cache.TryGetValue(cacheKey, out List<int>? cached))
            {
                return cached!;
            }

            var ids = await _db.AzubiBetreuer
                .AsNoTracking()
                .Where(ab => ab.BenutzerId == _currentUser.BenutzerId)
                .Select(ab => ab.TeilnehmerId)
                .ToListAsync();

            _cache.Set(cacheKey, ids, new MemoryCacheEntryOptions { Size = 1, AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) });

            return ids;
        }
    }
}