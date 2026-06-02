using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Tests.Services
{
    public class AufgabeServiceTests
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
            db.Benutzer.Add(new Benutzer { Id = 1, Benutzername = "ausbilder1", Vorname = "Hans", Nachname = "Meier", PasswortHash = "hash", Rolle = "Ausbilder" });
            db.Benutzer.Add(new Benutzer { Id = 2, Benutzername = "ausbilder2", Vorname = "Petra", Nachname = "Schmidt", PasswortHash = "hash", Rolle = "Ausbilder" });
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
            db.Aufgaben.Add(new Aufgabe
            {
                Id = 1,
                Titel = "Bericht lesen",
                Beschreibung = "Wöchentlichen Bericht durchgehen",
                Prioritaet = "Hoch",
                Faelligkeitsdatum = new DateOnly(2026, 6, 1),
                AzubiId = 1,
                AusbilderId = 1
            });
            db.Aufgaben.Add(new Aufgabe
            {
                Id = 2,
                Titel = "Erledigte Aufgabe",
                Beschreibung = "Bereits erledigt",
                Prioritaet = "Mittel",
                Faelligkeitsdatum = new DateOnly(2026, 5, 1),
                Erledigt = true,
                AzubiId = 1,
                AusbilderId = 1
            });
            db.Aufgaben.Add(new Aufgabe
            {
                Id = 3,
                Titel = "Globale Aufgabe",
                Beschreibung = "Für alle sichtbar",
                Prioritaet = "Niedrig",
                Faelligkeitsdatum = new DateOnly(2026, 7, 1),
                AzubiId = null,
                AusbilderId = 1
            });
            db.Aufgaben.Add(new Aufgabe
            {
                Id = 4,
                Titel = "Fremde Aufgabe",
                Beschreibung = "Nicht betreuter Azubi",
                Prioritaet = "Mittel",
                Faelligkeitsdatum = new DateOnly(2026, 6, 15),
                AzubiId = 2,
                AusbilderId = 2
            });
            await db.SaveChangesAsync();
        }

        [Fact]
        public async Task AlleAbrufenAsync_ZeigtNurBetreuteUndEigene()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new AufgabeService(db, user, cache);

            var result = await service.AlleAbrufenAsync();

            Assert.Contains(result.Items, a => a.Id == 1);
            Assert.Contains(result.Items, a => a.Id == 2);
            Assert.Contains(result.Items, a => a.Id == 3);
            Assert.DoesNotContain(result.Items, a => a.Id == 4);
        }

        [Fact]
        public async Task AlleAbrufenAsync_FiltertNachErledigt()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new AufgabeService(db, user, cache);

            var offene = await service.AlleAbrufenAsync(erledigt: false);
            var erledigte = await service.AlleAbrufenAsync(erledigt: true);

            Assert.Contains(offene.Items, a => a.Id == 1);
            Assert.Contains(erledigte.Items, a => a.Id == 2);
            Assert.DoesNotContain(offene.Items, a => a.Id == 2);
            Assert.DoesNotContain(erledigte.Items, a => a.Id == 1);
        }

        [Fact]
        public async Task AlleAbrufenAsync_UnterstuetztPaging()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new AufgabeService(db, user, cache);

            var skip1 = await service.AlleAbrufenAsync(skip: 1);
            var take1 = await service.AlleAbrufenAsync(take: 1);

            Assert.Single(take1.Items);
            Assert.Equal(2, skip1.Items.Count);
        }

        [Fact]
        public async Task ErstellenAsync_ErzeugtAufgabe()
        {
            using var db = CreateDb();
            db.Benutzer.Add(new Benutzer { Id = 1, Benutzername = "ausbilder1", Vorname = "Hans", Nachname = "Meier", PasswortHash = "hash", Rolle = "Ausbilder" });
            await db.SaveChangesAsync();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new AufgabeService(db, user, cache);

            var dto = new AufgabeErstellenDto
            {
                Titel = "Neue Aufgabe",
                Beschreibung = "Beschreibung",
                Prioritaet = "Hoch",
                Faelligkeitsdatum = new DateOnly(2026, 7, 1),
                AzubiId = 1
            };

            var result = await service.ErstellenAsync(dto);

            Assert.Equal("Neue Aufgabe", result.Titel);
            Assert.Equal("Hoch", result.Prioritaet);
            Assert.Equal(1, result.AusbilderId);
            Assert.True(result.Id > 0);
        }

        [Fact]
        public async Task ErstellenAsync_SetztGlobalFlag()
        {
            using var db = CreateDb();
            db.Benutzer.Add(new Benutzer { Id = 1, Benutzername = "ausbilder1", Vorname = "Hans", Nachname = "Meier", PasswortHash = "hash", Rolle = "Ausbilder" });
            await db.SaveChangesAsync();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new AufgabeService(db, user, cache);

            var dto = new AufgabeErstellenDto
            {
                Titel = "Globale Aufgabe",
                IstGlobal = true,
                Faelligkeitsdatum = new DateOnly(2026, 7, 1)
            };

            var result = await service.ErstellenAsync(dto);

            Assert.True(result.IstGlobal);
        }

        [Fact]
        public async Task AktualisierenAsync_AendertAufgabe()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new AufgabeService(db, user, cache);

            var dto = new AufgabeAktualisierenDto
            {
                Titel = "Geänderter Titel",
                Beschreibung = "Geänderte Beschreibung",
                Prioritaet = "Niedrig",
                Faelligkeitsdatum = new DateOnly(2026, 8, 1),
                Erledigt = true
            };

            var result = await service.AktualisierenAsync(1, dto);

            Assert.NotNull(result);
            Assert.Equal("Geänderter Titel", result!.Titel);
            Assert.True(result.Erledigt);
        }

        [Fact]
        public async Task AktualisierenAsync_BeiUngueltigerId_GibtNull()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new AufgabeService(db, user, cache);

            var dto = new AufgabeAktualisierenDto
            {
                Titel = "Test",
                Faelligkeitsdatum = new DateOnly(2026, 8, 1)
            };

            var result = await service.AktualisierenAsync(999, dto);

            Assert.Null(result);
        }

        [Fact]
        public async Task LoeschenAsync_EntferntAufgabe()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new AufgabeService(db, user, cache);

            var result = await service.LoeschenAsync(1);

            Assert.True(result);
            Assert.Null(await db.Aufgaben.FindAsync(1));
        }

        [Fact]
        public async Task LoeschenAsync_BeiUngueltigerId_GibtFalse()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new AufgabeService(db, user, cache);

            var result = await service.LoeschenAsync(999);

            Assert.False(result);
        }

        [Fact]
        public async Task ToggleErledigtAsync_SchaltetUm()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new AufgabeService(db, user, cache);

            var success = await service.ToggleErledigtAsync(1);
            Assert.True(success);

            var aufgabe = await db.Aufgaben.FindAsync(1);
            Assert.NotNull(aufgabe);
            Assert.True(aufgabe!.Erledigt);
            Assert.Equal(1, aufgabe.ErledigtVonId);

            await service.ToggleErledigtAsync(1);
            Assert.False(aufgabe.Erledigt);
            Assert.Null(aufgabe.ErledigtVonId);
        }

        [Fact]
        public async Task ToggleErledigtAsync_BeiUngueltigerId_GibtFalse()
        {
            using var db = CreateDb();
            using var cache = CreateCache();
            var user = CreateUser(1);
            var service = new AufgabeService(db, user, cache);

            var result = await service.ToggleErledigtAsync(999);

            Assert.False(result);
        }
    }
}
