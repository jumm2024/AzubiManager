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
            var benutzerId = _currentUser.BenutzerId;
            var istAdmin = _currentUser.IstAdmin;

            // Teilnehmer-Query
            var teilnehmerQuery = _db.Teilnehmer.AsNoTracking();
            if (!istAdmin)
                teilnehmerQuery = teilnehmerQuery.Where(t => t.AusbilderId == benutzerId);
            int teilnehmerGesamt = await teilnehmerQuery.CountAsync();

            // Status-Statistik für heute
            var statusHeute = await _db.TagesstatusListe
                .AsNoTracking()
                .Where(s => s.Datum == heute && (istAdmin || s.Azubi.AusbilderId == benutzerId))
                .ToListAsync();

            // Jeden Status einzeln zählen
            int anwesend = statusHeute.Count(s => s.Status == "Anwesend");
            int schule = statusHeute.Count(s => s.Status == "Schule");
            int praktikum = statusHeute.Count(s => s.Status == "Praktikum");
            int termin = statusHeute.Count(s => s.Status == "Termin");
            int urlaub = statusHeute.Count(s => s.Status == "Urlaub");
            int krank = statusHeute.Count(s => s.Status == "Krank");
            int kindKrank = statusHeute.Count(s => s.Status == "Kind krank");
            int freigestellt = statusHeute.Count(s => s.Status == "Freigestellt");
            int entschuldigt = statusHeute.Count(s => s.Status == "Entschuldigt");
            int unentschuldigt = statusHeute.Count(s => s.Status == "Unentschuldigt");
            int ungeklaert = statusHeute.Count(s => s.Status == "Ungeklärt");

            // Teilnehmer ohne Status heute
            var alleTeilnehmerIds = await teilnehmerQuery.Select(t => t.Id).ToListAsync();
            var idsMitStatus = statusHeute.Select(s => s.AzubiId).Distinct().ToList();
            int statusFehlt = alleTeilnehmerIds.Count(id => !idsMitStatus.Contains(id));

            // Aufgaben
            var aufgabenQuery = _db.Aufgaben.AsNoTracking()
                .Where(a => a.AusbilderId == benutzerId || istAdmin);

            int offeneAufgaben = await aufgabenQuery.CountAsync(a => !a.Erledigt);
            int ueberfaelligeAufgaben = await aufgabenQuery
                .CountAsync(a => !a.Erledigt && a.Faelligkeitsdatum < heute);

            var aufgabenHeute = await aufgabenQuery
                .Where(a => !a.Erledigt && a.Faelligkeitsdatum == heute)
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
                }).ToListAsync();

            // Badges
            int krankLaenger = await _db.TagesstatusListe
                .AsNoTracking()
                .Where(s => s.Datum >= heute.AddDays(-7) && s.Datum <= heute && s.Status == "Krank")
                .GroupBy(s => s.AzubiId)
                .Where(g => g.Count() >= 3)
                .CountAsync();

            int hohePrioritaet = await aufgabenQuery
                .CountAsync(a => !a.Erledigt && a.Prioritaet == "Hoch");

            int roterBadge = ueberfaelligeAufgaben + statusFehlt + hohePrioritaet + krankLaenger;

            int orangerBadge = await _db.Termine
                .AsNoTracking()
                .CountAsync(t => (istAdmin || t.AusbilderId == benutzerId) &&
                    t.Datum >= DateTime.Today && t.Datum <= DateTime.Today.AddDays(7));

            int pinkerBadge = await _db.Notizen
                .AsNoTracking()
                .CountAsync(n => istAdmin || n.AusbilderId == benutzerId);

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
                TeilnehmerGesamt = teilnehmerGesamt
            };
        }
    }
}