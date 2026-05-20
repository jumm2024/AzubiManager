using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Services
{
    public class DashboardService
    {
        private readonly AppDbContext _db;
        private readonly CurrentUserService _currentUser;

        public DashboardService(AppDbContext db, CurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<DashboardDto> ErstellenAsync()
        {
            var heute = DateOnly.FromDateTime(DateTime.Today);

            var betreuteIds = await _db.AzubiBetreuer
                .AsNoTracking()
                .Where(b => b.BenutzerId == _currentUser.BenutzerId)
                .Select(b => b.TeilnehmerId)
                .ToListAsync();

            var alleTeilnehmerIds = await _db.Teilnehmer.AsNoTracking().Select(t => t.Id).ToListAsync();
            int teilnehmerGesamt = alleTeilnehmerIds.Count;

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
            int freigestellt = statusMap.GetValueOrDefault("Freigestellt");
            int entschuldigt = statusMap.GetValueOrDefault("Entschuldigt");
            int unentschuldigt = statusMap.GetValueOrDefault("Unentschuldigt");
            int ungeklaert = statusMap.GetValueOrDefault("Ungeklärt");

            // Teilnehmer ohne Status heute
            var idsMitStatus = await _db.TagesstatusListe
                .AsNoTracking()
                .Where(s => s.Datum == heute && betreuteIds.Contains(s.AzubiId))
                .Select(s => s.AzubiId)
                .Distinct()
                .ToListAsync();
            int statusFehlt = betreuteIds.Count(id => !idsMitStatus.Contains(id));

            // Alle offenen Aufgaben in einer Query laden + in-memory filtern
            var alleAufgaben = await _db.Aufgaben.AsNoTracking()
                .Where(a => !a.Erledigt && a.AzubiId != null && betreuteIds.Contains((int)a.AzubiId))
                .OrderBy(a => a.Faelligkeitsdatum == heute ? 0 : 1)
                .ThenBy(a => a.Prioritaet)
                .Select(a => new
                {
                    a.Id,
                    a.Titel,
                    a.Prioritaet,
                    a.Faelligkeitsdatum,
                    a.Erledigt,
                    AzubiName = a.Azubi != null ? a.Azubi.Vorname + " " + a.Azubi.Nachname : null
                })
                .ToListAsync();

            int offeneAufgaben = alleAufgaben.Count;
            int ueberfaelligeAufgaben = alleAufgaben.Count(a => a.Faelligkeitsdatum < heute);
            int hohePrioritaet = alleAufgaben.Count(a => a.Prioritaet == "Hoch");

            var aufgabenHeute = alleAufgaben
                .Where(a => a.Faelligkeitsdatum == heute)
                .Take(5)
                .Select(a => new AufgabeDto
                {
                    Id = a.Id,
                    Titel = a.Titel,
                    Prioritaet = a.Prioritaet,
                    Faelligkeitsdatum = a.Faelligkeitsdatum,
                    Erledigt = a.Erledigt,
                    AzubiName = a.AzubiName
                }).ToList();

            // Badges
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

            return new DashboardDto
            {
                Anwesend = anwesend,
                Schule = schule,
                Praktikum = praktikum,
                Termin = termin,
                Urlaub = urlaub,
                Krank = krank,
                KindKrank = kindKrank,
                Freigestellt = freigestellt,
                Entschuldigt = entschuldigt,
                Unentschuldigt = unentschuldigt,
                Ungeklaert = ungeklaert,
                OffeneAufgaben = offeneAufgaben,
                UeberfaelligeAufgaben = ueberfaelligeAufgaben,
                AufgabenHeute = aufgabenHeute,
                RoterBadge = roterBadge,
                OrangerBadge = orangerBadge,
                PinkerBadge = pinkerBadge,
                StatusFehlt = statusFehlt,
                TeilnehmerGesamt = alleTeilnehmerIds.Count,
                BetreuteTeilnehmer = betreuteIds.Count
            };
        }
    }
}