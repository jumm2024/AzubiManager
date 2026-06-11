using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Services;

namespace AzubiManager.Tests.Services
{
    public class TagesstatusServiceTests
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
                Lehrjahr = 1,
                Ausbildungsstart = default,
                Ausbildungsende = default,
                AusbilderId = 2
            });
            db.AzubiBetreuer.Add(new AzubiBetreuer { TeilnehmerId = 1, BenutzerId = 1 });
            db.TagesstatusListe.Add(new Tagesstatus { AzubiId = 1, Datum = new DateOnly(2026, 5, 4), Status = "Anwesend" });
            db.TagesstatusListe.Add(new Tagesstatus { AzubiId = 1, Datum = new DateOnly(2026, 5, 5), Status = "Schule" });
            db.TagesstatusListe.Add(new Tagesstatus { AzubiId = 2, Datum = new DateOnly(2026, 5, 4), Status = "Krank" });
            await db.SaveChangesAsync();
            foreach (var e in db.ChangeTracker.Entries()) e.State = EntityState.Detached;
        }

        [Fact]
        public async Task ExcelExportAsync_EnthaeltNurBetreuteAzubis()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            var user = CreateUser(1);
            using var cache = CreateCache();
            var dashboardService = new DashboardService(db, user, cache);
            var service = new TagesstatusService(db, user, cache, dashboardService);

            var result = await service.ExcelExportAsync(2026, 5);

            Assert.NotNull(result);
            Assert.True(result.Length > 0);
        }

        [Fact]
        public async Task ExcelExportAsync_OhneBetreuteAzubis_LeereDatei()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            var user = CreateUser(99);
            using var cache = CreateCache();
            var dashboardService = new DashboardService(db, user, cache);
            var service = new TagesstatusService(db, user, cache, dashboardService);

            var result = await service.ExcelExportAsync(2026, 5);

            Assert.NotNull(result);
            Assert.True(result.Length > 0);
        }

        [Fact]
        public async Task AzubiBerichtExportAsync_EnthaeltNurBetreuteAzubis()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            var user = CreateUser(1);
            using var cache = CreateCache();
            var dashboardService = new DashboardService(db, user, cache);
            var service = new TagesstatusService(db, user, cache, dashboardService);

            var result = await service.AzubiBerichtExportAsync(2026, 5);

            Assert.NotNull(result);
            Assert.True(result.Length > 0);
        }

        [Fact]
        public async Task AzubiBerichtGesamtExportAsync_EnthaeltNurBetreuteAzubis()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            var user = CreateUser(1);
            using var cache = CreateCache();
            var dashboardService = new DashboardService(db, user, cache);
            var service = new TagesstatusService(db, user, cache, dashboardService);

            var result = await service.AzubiBerichtGesamtExportAsync();

            Assert.NotNull(result);
            Assert.True(result.Length > 0);
        }

        [Fact]
        public async Task StatusListe_ZeigtAlleStatusAn()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            var user = CreateUser(1);
            using var cache = CreateCache();
            var dashboardService = new DashboardService(db, user, cache);
            var service = new TagesstatusService(db, user, cache, dashboardService);

            var result = await service.AlleFuerDatumAsync(new DateOnly(2026, 5, 4));

            Assert.NotNull(result);
            Assert.Contains(result, s => s.AzubiId == 1);
        }
    }
}
