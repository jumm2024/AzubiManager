using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Tests.Services
{
    public class AllgemeineInfoServiceTests
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

        private AllgemeineInfoService CreateService(AppDbContext db)
            => new(db);

        private async Task SetupTestData(AppDbContext db)
        {
            db.AllgemeineInfos.Add(new()
            {
                Id = 1,
                Bezeichnung = "Kassenöffnungszeiten",
                Wert = "Mo–Fr 08:00–18:00",
                Sortierung = 1
            });
            db.AllgemeineInfos.Add(new()
            {
                Id = 2,
                Bezeichnung = "Medizinischer Dienst",
                Wert = "Dr. Schmidt, Sprechstunde Di+Do 14-16 Uhr",
                Sortierung = 2
            });
            db.AllgemeineInfos.Add(new()
            {
                Id = 3,
                Bezeichnung = "Notfallnummer",
                Wert = "112",
                Sortierung = 3
            });
            await db.SaveChangesAsync();
            foreach (var e in db.ChangeTracker.Entries()) e.State = EntityState.Detached;
        }

        [Fact]
        public async Task AlleAbrufenAsync_GibtAlleZurueck_NachSortierung()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            var service = CreateService(db);

            var result = await service.AlleAbrufenAsync();

            Assert.Equal(3, result.Count);
            Assert.Equal("Kassenöffnungszeiten", result[0].Bezeichnung);
            Assert.Equal("Medizinischer Dienst", result[1].Bezeichnung);
            Assert.Equal("Notfallnummer", result[2].Bezeichnung);
        }

        [Fact]
        public async Task AlleAbrufenAsync_LeereDatenbank_GibtLeereListe()
        {
            using var db = CreateDb();
            var service = CreateService(db);

            var result = await service.AlleAbrufenAsync();

            Assert.Empty(result);
        }

        [Fact]
        public async Task ErstellenAsync_ErzeugtEintrag()
        {
            using var db = CreateDb();
            var service = CreateService(db);

            var dto = new AllgemeineInfoErstellenDto
            {
                Bezeichnung = "Standort",
                Wert = "Musterstraße 123",
                Sortierung = 1
            };

            var result = await service.ErstellenAsync(dto);

            Assert.Equal("Standort", result.Bezeichnung);
            Assert.Equal("Musterstraße 123", result.Wert);
            Assert.Equal(1, result.Sortierung);
            Assert.True(result.Id > 0);
        }

        [Fact]
        public async Task ErstellenAsync_OhneWert_ErzeugtEintrag()
        {
            using var db = CreateDb();
            var service = CreateService(db);

            var dto = new AllgemeineInfoErstellenDto
            {
                Bezeichnung = "Hinweis",
                Sortierung = 5
            };

            var result = await service.ErstellenAsync(dto);

            Assert.Equal("Hinweis", result.Bezeichnung);
            Assert.Null(result.Wert);
        }

        [Fact]
        public async Task AktualisierenAsync_AendertEintrag()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            var service = CreateService(db);

            var dto = new AllgemeineInfoErstellenDto
            {
                Bezeichnung = "Geänderte Öffnungszeiten",
                Wert = "Mo–Fr 09:00–17:00",
                Sortierung = 10
            };

            var result = await service.AktualisierenAsync(1, dto);

            Assert.NotNull(result);
            Assert.Equal("Geänderte Öffnungszeiten", result!.Bezeichnung);
            Assert.Equal("Mo–Fr 09:00–17:00", result.Wert);
            Assert.Equal(10, result.Sortierung);
        }

        [Fact]
        public async Task AktualisierenAsync_UngueltigeId_GibtNull()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            var service = CreateService(db);

            var dto = new AllgemeineInfoErstellenDto
            {
                Bezeichnung = "Test",
                Sortierung = 0
            };

            var result = await service.AktualisierenAsync(999, dto);

            Assert.Null(result);
        }

        [Fact]
        public async Task LoeschenAsync_EntferntEintrag()
        {
            using var db = CreateDb();
            await SetupTestData(db);
            var service = CreateService(db);

            var result = await service.LoeschenAsync(1);

            Assert.True(result);
            Assert.Null(await db.AllgemeineInfos.FindAsync(1));
        }

        [Fact]
        public async Task LoeschenAsync_UngueltigeId_GibtFalse()
        {
            using var db = CreateDb();
            var service = CreateService(db);

            var result = await service.LoeschenAsync(999);

            Assert.False(result);
        }

        [Fact]
        public async Task AlleAbrufenAsync_RespektiertSortierung()
        {
            using var db = CreateDb();
            db.AllgemeineInfos.Add(new()
            {
                Id = 10,
                Bezeichnung = "Zweitletztes",
                Sortierung = 20
            });
            db.AllgemeineInfos.Add(new()
            {
                Id = 11,
                Bezeichnung = "Erstes",
                Sortierung = 5
            });
            db.AllgemeineInfos.Add(new()
            {
                Id = 12,
                Bezeichnung = "Letztes",
                Sortierung = 30
            });
            await db.SaveChangesAsync();
            foreach (var e in db.ChangeTracker.Entries()) e.State = EntityState.Detached;
            var service = CreateService(db);

            var result = await service.AlleAbrufenAsync();

            Assert.Equal("Erstes", result[0].Bezeichnung);
            Assert.Equal("Zweitletztes", result[1].Bezeichnung);
            Assert.Equal("Letztes", result[2].Bezeichnung);
        }
    }
}
