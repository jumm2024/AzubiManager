using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using Moq;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Tests.Services
{
    public class RefreshTokenTests
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

        private static IHttpContextAccessor CreateHttpContextAccessor()
        {
            var mock = new Mock<IHttpContextAccessor>();
            mock.Setup(x => x.HttpContext).Returns((HttpContext?)null);
            return mock.Object;
        }

        [Fact]
        public async Task Login_GibtRefreshTokenZurueck()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config, CreateHttpContextAccessor());

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

            Assert.NotNull(result.RefreshToken);
            Assert.NotEmpty(result.RefreshToken);
        }

        [Fact]
        public async Task RefreshTokenAsync_MitGueltigemToken_GibtNeuesToken()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config, CreateHttpContextAccessor());

            var hash = BCrypt.Net.BCrypt.HashPassword("GeheimesPasswort1", 10);
            db.Benutzer.Add(new Benutzer
            {
                Id = 1,
                Benutzername = "testuser",
                PasswortHash = hash,
                Rolle = "Ausbilder",
                Vorname = "Test",
                Nachname = "User"
            });
            await db.SaveChangesAsync();

            var loginResult = await service.AnmeldenAsync(new LoginDto { Benutzername = "testuser", Passwort = "GeheimesPasswort1" });
            var refreshToken = loginResult.RefreshToken;

            var refreshResult = await service.RefreshTokenAsync(refreshToken, "127.0.0.1", "TestAgent");

            Assert.NotNull(refreshResult.Token);
            Assert.NotEmpty(refreshResult.Token);
            Assert.NotEqual(refreshToken, refreshResult.RefreshToken);
        }

        [Fact]
        public async Task RefreshTokenAsync_MitAbgelaufenemToken_WirftUnauthorized()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config, CreateHttpContextAccessor());

            var hash = BCrypt.Net.BCrypt.HashPassword("GeheimesPasswort1", 10);
            db.Benutzer.Add(new Benutzer
            {
                Id = 1,
                Benutzername = "testuser",
                PasswortHash = hash,
                Rolle = "Ausbilder"
            });
            await db.SaveChangesAsync();

            var loginResult = await service.AnmeldenAsync(new LoginDto { Benutzername = "testuser", Passwort = "GeheimesPasswort1" });
            var refreshToken = loginResult.RefreshToken;

            await service.RefreshTokenAsync(refreshToken, "127.0.0.1", "TestAgent");

            var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                service.RefreshTokenAsync(refreshToken, "127.0.0.1", "TestAgent"));

            Assert.Contains("ungültiger", ex.Message.ToLower());
        }

        [Fact]
        public async Task PasswortAendern_InvalidiertRefreshTokens()
        {
            using var db = CreateDb();
            var config = CreateConfig();
            var service = new AuthService(db, config, CreateHttpContextAccessor());

            var hash = BCrypt.Net.BCrypt.HashPassword("AltesPasswort1", 10);
            db.Benutzer.Add(new Benutzer
            {
                Id = 1,
                Benutzername = "testuser",
                PasswortHash = hash,
                Rolle = "Ausbilder"
            });
            await db.SaveChangesAsync();

            var loginResult = await service.AnmeldenAsync(new LoginDto { Benutzername = "testuser", Passwort = "AltesPasswort1" });
            var refreshToken = loginResult.RefreshToken;

            var claims = new List<System.Security.Claims.Claim>
            {
                new(System.Security.Claims.ClaimTypes.NameIdentifier, "1"),
                new(System.Security.Claims.ClaimTypes.Role, "Ausbilder")
            };
            var identity = new System.Security.Claims.ClaimsIdentity(claims, "test");
            var principal = new System.Security.Claims.ClaimsPrincipal(identity);

            await service.PasswortAendernAsync(principal, new PasswortAendernDto
            {
                AltesPasswort = "AltesPasswort1",
                NeuesPasswort = "NeuesPasswort1"
            });

            var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                service.RefreshTokenAsync(refreshToken, "127.0.0.1", "TestAgent"));

            Assert.Contains("ungültiger", ex.Message.ToLower());
        }
    }
}
