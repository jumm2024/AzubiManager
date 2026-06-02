using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Tests.Services
{
    public class TeilnehmerServiceTests
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

        private TeilnehmerService CreateService(AppDbContext db, CurrentUserService user, IMemoryCache cache)
        {
            var dashboardService = new DashboardService(db, user, cache);
            return new TeilnehmerService(db, user, cache, dashboardService);
        }

        [Fact]
        public async Task MeineBetreuteIds_Leer_BeiNeuemBenutzer()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = CreateService(db, user, cache);

            var ids = await service.MeineBetreuteIdsAsync();

            Assert.Empty(ids);
        }

        [Fact]
        public async Task AddBetreuung_FuegtEintragHinzu()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = CreateService(db, user, cache);

            db.Teilnehmer.Add(new Teilnehmer
            {
                Vorname = "Max",
                Nachname = "Mustermann",
                Gruppe = "Ausbildung",
                Lehrjahr = 1,
                Ausbildungsstart = new DateOnly(2024, 9, 1),
                Ausbildungsende = new DateOnly(2027, 8, 31),
                AusbilderId = 1
            });
            await db.SaveChangesAsync();

            await service.AddBetreuungAsync(1);

            var ids = await service.MeineBetreuteIdsAsync();
            Assert.Contains(1, ids);
        }

        [Fact]
        public async Task AddBetreuung_KeineDoppeltenEintraege()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = CreateService(db, user, cache);

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
            await db.SaveChangesAsync();
            db.Entry(db.Teilnehmer.Find(1)!).State = EntityState.Detached;

            await service.AddBetreuungAsync(1);
            await service.AddBetreuungAsync(1);

            var count = await db.AzubiBetreuer.CountAsync();
            Assert.Equal(1, count);
        }

        [Fact]
        public async Task RemoveBetreuung_EntferntEintrag()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = CreateService(db, user, cache);

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
            db.AzubiBetreuer.Add(new AzubiBetreuer { TeilnehmerId = 1, BenutzerId = 1 });
            await db.SaveChangesAsync();

            await service.RemoveBetreuungAsync(1);

            var ids = await service.MeineBetreuteIdsAsync();
            Assert.Empty(ids);
        }

        [Fact]
        public async Task AlleAbrufenAsync_EnthaeltIstBetreutFlag()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = CreateService(db, user, cache);

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
            db.AzubiBetreuer.Add(new AzubiBetreuer { TeilnehmerId = 1, BenutzerId = 1 });
            await db.SaveChangesAsync();

            var alle = await service.AlleAbrufenAsync();

            Assert.Single(alle.Items);
            Assert.True(alle.Items[0].IstBetreut);
        }

        [Fact]
        public async Task AlleAbrufenAsync_IstBetreutFlag_NullWennNichtBetreut()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = CreateService(db, user, cache);

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
            await db.SaveChangesAsync();

            var alle = await service.AlleAbrufenAsync();

            Assert.Single(alle.Items);
            Assert.False(alle.Items[0].IstBetreut);
        }

        [Fact]
        public async Task AlleAbrufenAsync_FiltertNachGruppe()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = CreateService(db, user, cache);

            db.Teilnehmer.Add(new Teilnehmer { Id = 1, Vorname = "A", Nachname = "B", Gruppe = "Ausbildung", Lehrjahr = 1, Ausbildungsstart = default, Ausbildungsende = default, AusbilderId = 1 });
            db.Teilnehmer.Add(new Teilnehmer { Id = 2, Vorname = "C", Nachname = "D", Gruppe = "BVB", Lehrjahr = 1, Ausbildungsstart = default, Ausbildungsende = default, AusbilderId = 1 });
            await db.SaveChangesAsync();

            var nurBvb = await service.AlleAbrufenAsync("BVB");

            Assert.Single(nurBvb.Items);
            Assert.Equal("BVB", nurBvb.Items[0].Gruppe);
        }
    }
}
