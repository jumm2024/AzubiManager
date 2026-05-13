using AzubiManager.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AzubiManager.Api.Data
{
    public static class SeedData
    {
        public static async Task InitialisierenAsync(AppDbContext db)
        {
            // Prüfen, ob schon ein Admin existiert
            if (await db.Benutzer.AnyAsync(b => b.Rolle == "Admin"))
                return;

            var admin = new Benutzer
            {
                Benutzername = "admin",
                PasswortHash = BCrypt.Net.BCrypt.HashPassword("admin123", 12),
                Vorname = "System",
                Nachname = "Administrator",
                Rolle = "Admin",
                ErstelltAm = DateTime.UtcNow
            };

            db.Benutzer.Add(admin);
            await db.SaveChangesAsync();
        }
    }
}