using AzubiManager.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AzubiManager.Api.Data
{
    public static class SeedData
    {
        public static async Task InitialisierenAsync(AppDbContext db, IConfiguration configuration, ILogger logger)
        {
            if (await db.Benutzer.AnyAsync(b => b.Rolle == "Admin"))
                return;

            var password = configuration["Admin:InitialPassword"];
            var generated = false;

            if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            {
                password = GenerateSecurePassword();
                generated = true;
            }

            var admin = new Benutzer
            {
                Benutzername = "admin",
                PasswortHash = BCrypt.Net.BCrypt.HashPassword(password, 12),
                Vorname = "System",
                Nachname = "Administrator",
                Rolle = "Admin",
                ErstelltAm = DateTime.UtcNow,
                PasswortGeandert = false
            };

            db.Benutzer.Add(admin);
            await db.SaveChangesAsync();

            var passwordFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "admin-password", "admin-initial-password.txt");
            await File.WriteAllTextAsync(passwordFilePath, password);

            if (generated)
            {
                logger.LogWarning("========================================");
                logger.LogWarning("INITIAL ADMIN PASSWORD GENERATED");
                logger.LogWarning("Password: {Password}", password);
                logger.LogWarning("Also saved to: {Path}", passwordFilePath);
                logger.LogWarning("CHANGE IMMEDIATELY after first login!");
                logger.LogWarning("========================================");
            }
            else
            {
                logger.LogWarning("Admin user created with password from Admin__InitialPassword env var. CHANGE IMMEDIATELY!");
            }
        }

        private static string GenerateSecurePassword()
        {
            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            const string lower = "abcdefghijkmnopqrstuvwxyz";
            const string digits = "23456789";
            const string special = "!@#$%^&*";
            const string all = upper + lower + digits + special;

            var random = new Random();
            var password = new char[16];
            password[0] = upper[random.Next(upper.Length)];
            password[1] = lower[random.Next(lower.Length)];
            password[2] = digits[random.Next(digits.Length)];
            password[3] = special[random.Next(special.Length)];

            for (int i = 4; i < 16; i++)
                password[i] = all[random.Next(all.Length)];

            return new string(password.OrderBy(_ => random.Next()).ToArray());
        }
    }
}