using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Tests.Services
{
    public class DashboardServiceTests
    {
        private AppDbContext CreateDb()
        {
            var opts = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            var db = new AppDbContext(opts);
            db.Database.EnsureCreated();
            return db;
        }

        private CurrentUserService CreateUser(int userId)
        {
            var claims = new List<System.Security.Claims.Claim>
            {
                new(System.Security.Claims.ClaimTypes.NameIdentifier, userId.ToString()),
                new(System.Security.Claims.ClaimTypes.Role, "Ausbilder")
            };
            var identity = new System.Security.Claims.ClaimsIdentity(claims, "test");
            var principal = new System.Security.Claims.ClaimsPrincipal(identity);
            var httpCtx = new Microsoft.AspNetCore.Http.DefaultHttpContext { User = principal };
            var accessor = new Microsoft.AspNetCore.Http.HttpContextAccessor { HttpContext = httpCtx };
            return new CurrentUserService(accessor);
        }

        private static IMemoryCache CreateCache() => new MemoryCache(new MemoryCacheOptions());

        private async Task SetupTestData(AppDbContext db)
        {
            db.Teilnehmer.Add(new Teilnehmer
            {
                Id = 1,
                Vorname = "Max",
                Nachname = "Mustermann",
                Gruppe = "Ausbildung",
                Lehrjahr = 1,
                Ausbildungsstart = new DateOnly(2024, 9, 1),
                Ausbildungsende = new DateOnly(2027, 8, 31),
                AusbilderId = 1
            });
            db.Teilnehmer.Add(new Teilnehmer
            {
                Id = 2,
                Vorname = "Erika",
                Nachname = "Musterfrau",
                Gruppe = "BVB",
                Lehrjahr = 2,
                Ausbildungsstart = new DateOnly(2023, 9, 1),
                Ausbildungsende = new DateOnly(2026, 8, 31),
                AusbilderId = 1
            });
            db.Teilnehmer.Add(new Teilnehmer
            {
                Id = 3,
                Vorname = "Nicht",
                Nachname = "Betreut",
                Gruppe = "Ausbildung",
                Lehrjahr = 1,
                Ausbildungsstart = default,
                Ausbildungsende = default,
                AusbilderId = 2
            });
            db.AzubiBetreuer.Add(new AzubiBetreuer { TeilnehmerId = 1, BenutzerId = 1 });
            db.AzubiBetreuer.Add(new AzubiBetreuer { TeilnehmerId = 2, BenutzerId = 1 });

            var heute = DateOnly.FromDateTime(DateTime.Today);
            db.TagesstatusListe.Add(new Tagesstatus { AzubiId = 1, Datum = heute, Status = "Anwesend" });
            db.TagesstatusListe.Add(new Tagesstatus { AzubiId = 2, Datum = heute, Status = "Krank" });

            db.Aufgaben.Add(new Aufgabe
            {
                Id = 1,
                Titel = "Offene Aufgabe",
                Prioritaet = "Hoch",
                Faelligkeitsdatum = heute.AddDays(-1),
                AzubiId = 1,
                AusbilderId = 1
            });
            db.Aufgaben.Add(new Aufgabe
            {
                Id = 2,
                Titel = "Erledigte Aufgabe",
                Prioritaet = "Mittel",
                Faelligkeitsdatum = heute.AddDays(-2),
                Erledigt = true,
                AzubiId = 1,
                AusbilderId = 1
            });
            db.Aufgaben.Add(new Aufgabe
            {
                Id = 3,
                Titel = "Aufgabe für heute",
                Prioritaet = "Hoch",
                Faelligkeitsdatum = heute,
                AzubiId = 2,
                AusbilderId = 1
            });

            db.Termine.Add(new Termin
            {
                Id = 1,
                Titel = "Termin diese Woche",
                Datum = DateTime.Today.AddDays(2),
                AzubiId = 1,
                AusbilderId = 1
            });

            db.Notizen.Add(new Notiz
            {
                Id = 1,
                Titel = "Notiz",
                Inhalt = "Inhalt",
                AzubiId = 1,
                AusbilderId = 1
            });

            await db.SaveChangesAsync();
            foreach (var e in db.ChangeTracker.Entries()) e.State = EntityState.Detached;
        }

        [Fact]
        public async Task ErstellenAsync_BerechnetStatusStatistik()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new DashboardService(db, user, cache);

            var result = await service.ErstellenAsync();

            Assert.Equal(1, result.Anwesend);
            Assert.Equal(1, result.Krank);
            Assert.Equal(0, result.Schule);
            Assert.Equal(0, result.Urlaub);
            Assert.Equal(3, result.TeilnehmerGesamt);
            Assert.Equal(2, result.BetreuteTeilnehmer);
            Assert.Equal(0, result.StatusFehlt);
        }

        [Fact]
        public async Task ErstellenAsync_BerechnetAufgabenStatistik()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new DashboardService(db, user, cache);

            var result = await service.ErstellenAsync();

            Assert.Equal(2, result.OffeneAufgaben);
            Assert.Equal(1, result.UeberfaelligeAufgaben);
            Assert.Single(result.AufgabenHeute);
            Assert.Equal("Aufgabe für heute", result.AufgabenHeute[0].Titel);
        }

        [Fact]
        public async Task ErstellenAsync_BerechnetBadges()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new DashboardService(db, user, cache);

            var result = await service.ErstellenAsync();

            Assert.Equal(1, result.OrangerBadge);
            Assert.Equal(1, result.PinkerBadge);
        }

        [Fact]
        public async Task ErstellenAsync_VerwendetCache()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new DashboardService(db, user, cache);

            var result1 = await service.ErstellenAsync();

            db.TagesstatusListe.Add(new Tagesstatus { AzubiId = 1, Datum = DateOnly.FromDateTime(DateTime.Today), Status = "Schule" });
            await db.SaveChangesAsync();

            var result2 = await service.ErstellenAsync();

            Assert.Equal(result1.Anwesend, result2.Anwesend);
        }

        [Fact]
        public async Task ErstellenAsync_ZaehltVAmBStatus()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var heute = DateOnly.FromDateTime(DateTime.Today);
            db.Teilnehmer.Add(new Teilnehmer
            {
                Id = 1, Vorname = "Test", Nachname = "User",
                Gruppe = "Ausbildung", Lehrjahr = 1,
                AusbilderId = 1
            });
            db.AzubiBetreuer.Add(new AzubiBetreuer { TeilnehmerId = 1, BenutzerId = 1 });
            db.TagesstatusListe.Add(new Tagesstatus { AzubiId = 1, Datum = heute, Status = "VAmB" });
            await db.SaveChangesAsync();
            foreach (var e in db.ChangeTracker.Entries()) e.State = EntityState.Detached;

            var user = CreateUser(1);
            var service = new DashboardService(db, user, cache);

            var result = await service.ErstellenAsync();

            Assert.Equal(1, result.VAmB);
            Assert.Equal(0, result.Anwesend);
            Assert.Equal(0, result.Krank);
        }

        [Fact]
        public async Task ErstellenAsync_OhneBetreuteAzubis_GibtLeereWerte()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(99);
            var service = new DashboardService(db, user, cache);

            var result = await service.ErstellenAsync();

            Assert.Equal(0, result.Anwesend);
            Assert.Equal(0, result.Krank);
            Assert.Equal(0, result.OffeneAufgaben);
            Assert.Equal(0, result.BetreuteTeilnehmer);
        }

        [Fact]
        public void InvalidateCache_EntferntCacheEintrag()
        {
            using var cache = CreateCache();
            cache.Set("dashboard_1", new DashboardDto { Anwesend = 5 }, TimeSpan.FromMinutes(5));

            var service = new DashboardService(CreateDb(), CreateUser(1), cache);
            service.InvalidateCache(1);

            Assert.False(cache.TryGetValue("dashboard_1", out _));
        }
    }
}
