using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Tests.Services
{
    public class TerminServiceTests
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
            db.Termine.Add(new Termin
            {
                Id = 1,
                Titel = "Zwischenprüfung",
                Beschreibung = "Wichtiger Termin",
                Datum = new DateTime(2026, 6, 15, 10, 0, 0),
                Kategorie = "Prüfung",
                AzubiId = 1,
                AusbilderId = 1
            });
            db.Termine.Add(new Termin
            {
                Id = 2,
                Titel = "Eigener Termin",
                Beschreibung = "Ohne Azubi",
                Datum = new DateTime(2026, 6, 20, 14, 0, 0),
                Kategorie = "Sonstiges",
                AzubiId = null,
                AusbilderId = 1
            });
            db.Termine.Add(new Termin
            {
                Id = 3,
                Titel = "Fremder Termin",
                Beschreibung = "Nicht sichtbar",
                Datum = new DateTime(2026, 7, 1, 9, 0, 0),
                Kategorie = "Sonstiges",
                AzubiId = 2,
                AusbilderId = 2
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
            var service = new TerminService(db, user, cache);

            var result = await service.AlleAbrufenAsync();

            Assert.Contains(result, t => t.Id == 1);
            Assert.Contains(result, t => t.Id == 2);
            Assert.DoesNotContain(result, t => t.Id == 3);
        }

        [Fact]
        public async Task AlleAbrufenAsync_UnterstuetztPaging()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new TerminService(db, user, cache);

            var take1 = await service.AlleAbrufenAsync(take: 1);
            var skip1 = await service.AlleAbrufenAsync(skip: 1);

            Assert.Single(take1);
            Assert.Single(skip1);
        }

        [Fact]
        public async Task ErstellenAsync_ErzeugtTermin()
        {
            using var db = CreateDb();
            db.Benutzer.Add(new Benutzer { Id = 1, Benutzername = "ausbilder1", Vorname = "Hans", Nachname = "Meier", PasswortHash = "hash", Rolle = "Ausbilder" });
            await db.SaveChangesAsync();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new TerminService(db, user, cache);

            var dto = new TerminErstellenDto
            {
                Titel = "Neuer Termin",
                Beschreibung = "Beschreibung",
                Datum = new DateTime(2026, 7, 1, 10, 0, 0),
                Kategorie = "Prüfung",
                Ort = "Raum 101"
            };

            var result = await service.ErstellenAsync(dto);

            Assert.Equal("Neuer Termin", result.Titel);
            Assert.Equal(1, result.AusbilderId);
            Assert.Equal("Hans Meier", result.AusbilderName);
            Assert.Equal("Raum 101", result.Ort);
            Assert.True(result.Id > 0);
        }

        [Fact]
        public async Task ErstellenAsync_MitAzubiId_SetztAzubi()
        {
            using var db = CreateDb();
            db.Teilnehmer.Add(new Teilnehmer { Id = 1, Vorname = "Max", Nachname = "Mustermann", Gruppe = "Ausbildung", Lehrjahr = 1, Ausbildungsstart = default, Ausbildungsende = default, AusbilderId = 1 });
            db.Benutzer.Add(new Benutzer { Id = 1, Benutzername = "ausbilder1", Vorname = "Hans", Nachname = "Meier", PasswortHash = "hash", Rolle = "Ausbilder" });
            await db.SaveChangesAsync();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new TerminService(db, user, cache);

            var dto = new TerminErstellenDto
            {
                Titel = "Termin mit Azubi",
                Datum = new DateTime(2026, 7, 1, 10, 0, 0),
                AzubiId = 1
            };

            var result = await service.ErstellenAsync(dto);

            Assert.Equal(1, result.AzubiId);
        }

        [Fact]
        public async Task AktualisierenAsync_AendertTermin()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new TerminService(db, user, cache);

            var dto = new TerminAktualisierenDto
            {
                Titel = "Geänderter Termin",
                Beschreibung = "Neue Beschreibung",
                Datum = new DateTime(2026, 8, 1, 9, 0, 0),
                Kategorie = "Sonstiges",
                Ort = "Raum 202"
            };

            var result = await service.AktualisierenAsync(1, dto);

            Assert.NotNull(result);
            Assert.Equal("Geänderter Termin", result!.Titel);
            Assert.Equal("Raum 202", result.Ort);
        }

        [Fact]
        public async Task AktualisierenAsync_BeiUngueltigerId_GibtNull()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new TerminService(db, user, cache);

            var dto = new TerminAktualisierenDto
            {
                Titel = "Test",
                Datum = new DateTime(2026, 8, 1)
            };

            var result = await service.AktualisierenAsync(999, dto);

            Assert.Null(result);
        }

        [Fact]
        public async Task LoeschenAsync_EntferntTermin()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new TerminService(db, user, cache);

            var result = await service.LoeschenAsync(1);

            Assert.True(result);
            Assert.Null(await db.Termine.FindAsync(1));
        }

        [Fact]
        public async Task LoeschenAsync_BeiUngueltigerId_GibtFalse()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new TerminService(db, user, cache);

            var result = await service.LoeschenAsync(999);

            Assert.False(result);
        }
    }
}
