using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Tests.Services
{
    public class NotizServiceTests
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
                AusbilderId = 2
            });
            db.AzubiBetreuer.Add(new AzubiBetreuer { TeilnehmerId = 1, BenutzerId = 1 });
            db.AzubiBetreuer.Add(new AzubiBetreuer { TeilnehmerId = 2, BenutzerId = 2 });
            db.Benutzer.Add(new Benutzer { Id = 1, Benutzername = "ausbilder1", Vorname = "Hans", Nachname = "Meier", PasswortHash = "hash", Rolle = "Ausbilder" });
            db.Notizen.Add(new Notiz
            {
                Id = 1,
                Titel = "Notiz fuer Azubi 1",
                Inhalt = "Inhalt",
                Kategorie = "Beobachtung",
                AzubiId = 1,
                AusbilderId = 1,
                ErstelltAm = DateTime.UtcNow
            });
            db.Notizen.Add(new Notiz
            {
                Id = 2,
                Titel = "Eigene Notiz ohne Azubi",
                Inhalt = "Inhalt",
                Kategorie = "Allgemein",
                AzubiId = null,
                AusbilderId = 1,
                ErstelltAm = DateTime.UtcNow
            });
            db.Notizen.Add(new Notiz
            {
                Id = 3,
                Titel = "Fremde Notiz",
                Inhalt = "Inhalt",
                Kategorie = "Beobachtung",
                AzubiId = 2,
                AusbilderId = 2,
                ErstelltAm = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            foreach (var e in db.ChangeTracker.Entries()) e.State = EntityState.Detached;
        }

        [Fact]
        public async Task AlleAbrufenAsync_ZeigtNurBetreuteUndEigene()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new NotizService(db, user, cache);

            var result = await service.AlleAbrufenAsync();

            Assert.Contains(result, n => n.Id == 1);
            Assert.Contains(result, n => n.Id == 2);
            Assert.DoesNotContain(result, n => n.Id == 3);
        }

        [Fact]
        public async Task AlleAbrufenAsync_UnterstuetztPaging()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new NotizService(db, user, cache);

            var take1 = await service.AlleAbrufenAsync(take: 1);
            var skip1 = await service.AlleAbrufenAsync(skip: 1);

            Assert.Single(take1);
            Assert.Single(skip1);
        }

        [Fact]
        public async Task ErstellenAsync_ErzeugtNotiz()
        {
            using var db = CreateDb();
            db.Benutzer.Add(new Benutzer { Id = 1, Benutzername = "ausbilder1", Vorname = "Hans", Nachname = "Meier", PasswortHash = "hash", Rolle = "Ausbilder" });
            await db.SaveChangesAsync();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new NotizService(db, user, cache);

            var dto = new NotizErstellenDto
            {
                Titel = "Neue Notiz",
                Inhalt = "Wichtiger Hinweis",
                Kategorie = "Beobachtung"
            };

            var result = await service.ErstellenAsync(dto);

            Assert.Equal("Neue Notiz", result.Titel);
            Assert.Equal(1, result.AusbilderId);
            Assert.Equal("Hans Meier", result.AusbilderName);
            Assert.True(result.Id > 0);
        }

        [Fact]
        public async Task ErstellenAsync_MitAzubiId_SetztNamen()
        {
            using var db = CreateDb();
            db.Teilnehmer.Add(new Teilnehmer { Id = 1, Vorname = "Max", Nachname = "Mustermann", Gruppe = "Ausbildung", Lehrjahr = 1, Ausbildungsstart = default, Ausbildungsende = default, AusbilderId = 1 });
            db.Benutzer.Add(new Benutzer { Id = 1, Benutzername = "ausbilder1", Vorname = "Hans", Nachname = "Meier", PasswortHash = "hash", Rolle = "Ausbilder" });
            await db.SaveChangesAsync();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new NotizService(db, user, cache);

            var dto = new NotizErstellenDto
            {
                Titel = "Notiz",
                Inhalt = "Inhalt",
                AzubiId = 1
            };

            var result = await service.ErstellenAsync(dto);

            Assert.Equal(1, result.AzubiId);
        }

        [Fact]
        public async Task AktualisierenAsync_AendertNotiz()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new NotizService(db, user, cache);

            var dto = new NotizAktualisierenDto
            {
                Titel = "Geänderter Titel",
                Inhalt = "Geänderter Inhalt",
                Kategorie = "Rückmeldung"
            };

            var result = await service.AktualisierenAsync(1, dto);

            Assert.NotNull(result);
            Assert.Equal("Geänderter Titel", result!.Titel);
            Assert.Equal("Geänderter Inhalt", result.Inhalt);
        }

        [Fact]
        public async Task AktualisierenAsync_BeiUngueltigerId_GibtNull()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new NotizService(db, user, cache);

            var dto = new NotizAktualisierenDto { Titel = "Test", Inhalt = "Inhalt" };

            var result = await service.AktualisierenAsync(999, dto);

            Assert.Null(result);
        }

        [Fact]
        public async Task LoeschenAsync_EntferntNotiz()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new NotizService(db, user, cache);

            var result = await service.LoeschenAsync(1);

            Assert.True(result);
            Assert.Null(await db.Notizen.FindAsync(1));
        }

        [Fact]
        public async Task LoeschenAsync_BeiUngueltigerId_GibtFalse()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new NotizService(db, user, cache);

            var result = await service.LoeschenAsync(999);

            Assert.False(result);
        }
    }
}
