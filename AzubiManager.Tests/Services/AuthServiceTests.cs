using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Tests.Services
{
    public class AuthServiceTests
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

        private static IConfiguration CreateConfig()
        {
            return new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Key"] = "ThisIsASecretKeyForTestingPurposesThatIsLongEnough123!",
                    ["Jwt:Issuer"] = "TestIssuer",
                    ["Jwt:Audience"] = "TestAudience"
                })
                .Build();
        }

        [Fact]
        public async Task RegistrierenAsync_ErzeugtBenutzer()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config);

            var dto = new RegisterDto
            {
                Benutzername = "neuerausbilder",
                Passwort = "Passwort123",
                Vorname = "Neu",
                Nachname = "Benutzer"
            };

            var result = await service.RegistrierenAsync(dto);

            Assert.Equal("neuerausbilder", result.Benutzername);
            Assert.Equal("Ausbilder", result.Rolle);
            Assert.False(result.PasswortGeandert);
            Assert.NotNull(result.Token);
            Assert.True(result.BenutzerId > 0);
        }

        [Fact]
        public async Task RegistrierenAsync_MitDoppeltemBenutzernamen_WirftException()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config);

            db.Benutzer.Add(new Benutzer { Benutzername = "doppelt", PasswortHash = "hash", Rolle = "Ausbilder" });
            await db.SaveChangesAsync();

            var dto = new RegisterDto
            {
                Benutzername = "doppelt",
                Passwort = "Passwort123"
            };

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.RegistrierenAsync(dto));
            Assert.Contains("bereits vergeben", ex.Message);
        }

        [Fact]
        public async Task AnmeldenAsync_MitGueltigenDaten_GibtToken()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config);

            var hash = BCrypt.Net.BCrypt.HashPassword("GeheimesPasswort1", 10);
            db.Benutzer.Add(new Benutzer
            {
                Benutzername = "testuser",
                PasswortHash = hash,
                Rolle = "Ausbilder",
                Vorname = "Test",
                Nachname = "User"
            });
            await db.SaveChangesAsync();

            var dto = new LoginDto { Benutzername = "testuser", Passwort = "GeheimesPasswort1" };

            var result = await service.AnmeldenAsync(dto);

            Assert.Equal("testuser", result.Benutzername);
            Assert.Equal("Ausbilder", result.Rolle);
            Assert.Equal("Test", result.Vorname);
            Assert.NotNull(result.Token);
        }

        [Fact]
        public async Task AnmeldenAsync_MitFalschemPasswort_WirftUnauthorized()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config);

            var hash = BCrypt.Net.BCrypt.HashPassword("RichtigesPasswort", 10);
            db.Benutzer.Add(new Benutzer { Benutzername = "testuser", PasswortHash = hash, Rolle = "Ausbilder" });
            await db.SaveChangesAsync();

            var dto = new LoginDto { Benutzername = "testuser", Passwort = "FalschesPasswort" };

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.AnmeldenAsync(dto));
        }

        [Fact]
        public async Task AnmeldenAsync_MitUnbekanntemBenutzer_WirftUnauthorized()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config);

            var dto = new LoginDto { Benutzername = "unbekannt", Passwort = "egal" };

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.AnmeldenAsync(dto));
        }

        [Fact]
        public async Task PasswortAendernAsync_MitGueltigemPasswort_Aendert()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config);

            var hash = BCrypt.Net.BCrypt.HashPassword("AltesPasswort1", 10);
            var benutzer = new Benutzer
            {
                Id = 1,
                Benutzername = "testuser",
                PasswortHash = hash,
                Rolle = "Ausbilder",
                PasswortGeandert = false
            };
            db.Benutzer.Add(benutzer);
            await db.SaveChangesAsync();

            var claims = new List<System.Security.Claims.Claim>
            {
                new(System.Security.Claims.ClaimTypes.NameIdentifier, "1"),
                new(System.Security.Claims.ClaimTypes.Role, "Ausbilder")
            };
            var identity = new System.Security.Claims.ClaimsIdentity(claims, "test");
            var principal = new System.Security.Claims.ClaimsPrincipal(identity);

            var dto = new PasswortAendernDto { AltesPasswort = "AltesPasswort1", NeuesPasswort = "NeuesPasswort1" };

            await service.PasswortAendernAsync(principal, dto);

            var aktualisiert = await db.Benutzer.FindAsync(1);
            Assert.NotNull(aktualisiert);
            Assert.True(aktualisiert!.PasswortGeandert);
            Assert.True(BCrypt.Net.BCrypt.Verify("NeuesPasswort1", aktualisiert.PasswortHash));
        }

        [Fact]
        public async Task PasswortAendernAsync_MitFalschemAltemPasswort_WirftUnauthorized()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config);

            var hash = BCrypt.Net.BCrypt.HashPassword("RichtigesAltpasswort", 10);
            db.Benutzer.Add(new Benutzer { Id = 1, Benutzername = "testuser", PasswortHash = hash, Rolle = "Ausbilder" });
            await db.SaveChangesAsync();

            var claims = new List<System.Security.Claims.Claim>
            {
                new(System.Security.Claims.ClaimTypes.NameIdentifier, "1"),
                new(System.Security.Claims.ClaimTypes.Role, "Ausbilder")
            };
            var identity = new System.Security.Claims.ClaimsIdentity(claims, "test");
            var principal = new System.Security.Claims.ClaimsPrincipal(identity);

            var dto = new PasswortAendernDto { AltesPasswort = "FalschesAltpasswort", NeuesPasswort = "NeuesPasswort1" };

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.PasswortAendernAsync(principal, dto));
        }

        [Fact]
        public async Task PasswortAendernAsync_OhneUserClaim_WirftUnauthorized()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config);

            var principal = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity());

            var dto = new PasswortAendernDto { AltesPasswort = "alt", NeuesPasswort = "neu" };

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.PasswortAendernAsync(principal, dto));
        }
    }
}
