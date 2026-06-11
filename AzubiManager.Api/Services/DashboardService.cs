using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace AzubiManager.Api.Services
{
    public class DashboardService
    {
        private readonly AppDbContext _db;
        private readonly CurrentUserService _currentUser;
        private readonly IMemoryCache _cache;

        public DashboardService(AppDbContext db, CurrentUserService currentUser, IMemoryCache cache)
        {
            _db = db;
            _currentUser = currentUser;
            _cache = cache;
        }

        public async Task<DashboardDto> ErstellenAsync()
        {
            var cacheKey = $"dashboard_{_currentUser.BenutzerId}";

            if (_cache.TryGetValue(cacheKey, out DashboardDto? cached))
            {
                return cached!;
            }

            var heute = DateOnly.FromDateTime(DateTime.Today);

            var betreuteIds = await _db.AzubiBetreuer
                .AsNoTracking()
                .Where(b => b.BenutzerId == _currentUser.BenutzerId)
                .Select(b => b.TeilnehmerId)
                .ToListAsync();

            int teilnehmerGesamt = await _db.Teilnehmer.AsNoTracking().CountAsync();

            var statusCounts = await _db.TagesstatusListe
                .AsNoTracking()
                .Where(s => s.Datum == heute && betreuteIds.Contains(s.AzubiId))
                .GroupBy(s => s.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            var statusMap = statusCounts.ToDictionary(s => s.Status, s => s.Count);
            int anwesend = statusMap.GetValueOrDefault("Anwesend");
            int schule = statusMap.GetValueOrDefault("Schule");
            int praktikum = statusMap.GetValueOrDefault("Praktikum");
            int termin = statusMap.GetValueOrDefault("Termin");
            int urlaub = statusMap.GetValueOrDefault("Urlaub");
            int krank = statusMap.GetValueOrDefault("Krank");
            int kindKrank = statusMap.GetValueOrDefault("Kind krank");
            int vAmb = statusMap.GetValueOrDefault("VAmB");
            int freigestellt = statusMap.GetValueOrDefault("Freigestellt");
            int entschuldigt = statusMap.GetValueOrDefault("Entschuldigt");
            int unentschuldigt = statusMap.GetValueOrDefault("Unentschuldigt");
            int ungeklaert = statusMap.GetValueOrDefault("Ungeklärt");

            int idsMitStatusHeute = await _db.TagesstatusListe
                .AsNoTracking()
                .Where(s => s.Datum == heute && betreuteIds.Contains(s.AzubiId))
                .Select(s => s.AzubiId)
                .Distinct()
                .CountAsync();
            int statusFehlt = betreuteIds.Count - idsMitStatusHeute;

            var aufgabenQuery = _db.Aufgaben.AsNoTracking()
                .Where(a => !a.Erledigt && (
                    (a.AzubiId != null && betreuteIds.Contains((int)a.AzubiId)) ||
                    (a.AzubiId == null && a.AusbilderId == _currentUser.BenutzerId)
                ));

            var aufgabenCounts = await aufgabenQuery
                .GroupBy(a => 1)
                .Select(g => new
                {
                    Offene = g.Count(),
                    Ueberfaellig = g.Count(a => a.Faelligkeitsdatum < heute),
                    HohePrioritaet = g.Count(a => a.Prioritaet == "Hoch")
                })
                .FirstOrDefaultAsync();

            int offeneAufgaben = aufgabenCounts?.Offene ?? 0;
            int ueberfaelligeAufgaben = aufgabenCounts?.Ueberfaellig ?? 0;
            int hohePrioritaet = aufgabenCounts?.HohePrioritaet ?? 0;

            var aufgabenHeute = await _db.Aufgaben.AsNoTracking()
                .Where(a => !a.Erledigt && a.Faelligkeitsdatum == heute && (
                    (a.AzubiId != null && betreuteIds.Contains((int)a.AzubiId)) ||
                    (a.AzubiId == null && a.AusbilderId == _currentUser.BenutzerId)
                ))
                .OrderBy(a => a.Prioritaet)
                .Take(5)
                .Select(a => new AufgabeDto
                {
                    Id = a.Id,
                    Titel = a.Titel,
                    Prioritaet = a.Prioritaet,
                    Faelligkeitsdatum = a.Faelligkeitsdatum,
                    Erledigt = a.Erledigt,
                    AzubiName = a.Azubi != null ? a.Azubi.Vorname + " " + a.Azubi.Nachname : null
                })
                .ToListAsync();

            int krankLaenger = await _db.TagesstatusListe
                .AsNoTracking()
                .Where(s => s.Datum >= heute.AddDays(-7) && s.Datum <= heute && s.Status == "Krank" && betreuteIds.Contains(s.AzubiId))
                .GroupBy(s => s.AzubiId)
                .Where(g => g.Count() >= 3)
                .CountAsync();

            int roterBadge = ueberfaelligeAufgaben + statusFehlt + hohePrioritaet + krankLaenger;

            int orangerBadge = await _db.Termine
                .AsNoTracking()
                .Where(t => t.AzubiId != null && betreuteIds.Contains((int)t.AzubiId))
                .CountAsync(t => t.Datum >= DateTime.Today && t.Datum <= DateTime.Today.AddDays(7));

            int pinkerBadge = await _db.Notizen
                .AsNoTracking()
                .Where(n => n.AzubiId != null && betreuteIds.Contains((int)n.AzubiId))
                .CountAsync();

            int aufgabenGesamt = await _db.Aufgaben.AsNoTracking()
                .Where(a => (a.AzubiId != null && betreuteIds.Contains((int)a.AzubiId))
                         || (a.AzubiId == null && a.AusbilderId == _currentUser.BenutzerId))
                .CountAsync();

            int termineGesamt = await _db.Termine.AsNoTracking()
                .Where(t => (t.AzubiId != null && betreuteIds.Contains((int)t.AzubiId))
                         || (t.AzubiId == null && t.AusbilderId == _currentUser.BenutzerId))
                .CountAsync();

            int notizenGesamt = await _db.Notizen.AsNoTracking()
                .Where(n => (n.AzubiId != null && betreuteIds.Contains((int)n.AzubiId))
                         || (n.AzubiId == null && n.AusbilderId == _currentUser.BenutzerId))
                .CountAsync();

            var result = new DashboardDto
            {
                Anwesend = anwesend,
                Schule = schule,
                Praktikum = praktikum,
                Termin = termin,
                Urlaub = urlaub,
                Krank = krank,
                KindKrank = kindKrank,
                VAmB = vAmb,
                Freigestellt = freigestellt,
                Entschuldigt = entschuldigt,
                Unentschuldigt = unentschuldigt,
                Ungeklaert = ungeklaert,
                OffeneAufgaben = offeneAufgaben,
                UeberfaelligeAufgaben = ueberfaelligeAufgaben,
                AufgabenHeute = aufgabenHeute,
                TermineDemnachst = orangerBadge,
                RoterBadge = roterBadge,
                OrangerBadge = orangerBadge,
                PinkerBadge = pinkerBadge,
                StatusFehlt = statusFehlt,
                TeilnehmerGesamt = teilnehmerGesamt,
                BetreuteTeilnehmer = betreuteIds.Count,
                AufgabenGesamt = aufgabenGesamt,
                TermineGesamt = termineGesamt,
                NotizenGesamt = notizenGesamt
            };

            var cacheEntryOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromSeconds(30))
                .SetSlidingExpiration(TimeSpan.FromSeconds(10))
                .SetSize(1);

            _cache.Set(cacheKey, result, cacheEntryOptions);

            return result;
        }

        public void InvalidateCache(int benutzerId)
        {
            _cache.Remove($"dashboard_{benutzerId}");
        }
    }
}