using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;

namespace AzubiManager.Tests
{
    public class TestWebApplicationFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureTestServices(services =>
            {
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<AppDbContext>(options =>
                {
                    options.UseInMemoryDatabase("TestDb");
                });

                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.Database.EnsureCreated();
                SeedTestData(db);
            });

            builder.ConfigureAppConfiguration((context, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Key"] = "TestSecretKeyThatIsLongEnoughForJwtValidation12345678901234567890",
                    ["Jwt:Issuer"] = "TestIssuer",
                    ["Jwt:Audience"] = "TestAudience",
                    ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=Test;Trusted_Connection=True;"
                });
            });
        }

        private static void SeedTestData(AppDbContext db)
        {
            if (db.Benutzer.Any()) return;

            db.Benutzer.Add(new Benutzer
            {
                Benutzername = "admin",
                PasswortHash = BCrypt.Net.BCrypt.HashPassword("admin123", 10),
                Vorname = "System",
                Nachname = "Administrator",
                Rolle = "Admin",
                ErstelltAm = DateTime.UtcNow
            });

            db.Benutzer.Add(new Benutzer
            {
                Benutzername = "ausbilder1",
                PasswortHash = BCrypt.Net.BCrypt.HashPassword("ausbilder123", 10),
                Vorname = "Max",
                Nachname = "Mustermann",
                Rolle = "Ausbilder",
                ErstelltAm = DateTime.UtcNow
            });

            db.SaveChanges();
        }
    }
}
