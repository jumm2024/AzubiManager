using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Services
{
    public class AuthService
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _configuration;

        public AuthService(AppDbContext db, IConfiguration configuration)
        {
            _db = db;
            _configuration = configuration;
        }

        /// <summary>
        /// Registriert einen neuen Ausbilder und gibt ein JWT-Token zurück.
        /// </summary>
        public async Task<AuthResponseDto> RegistrierenAsync(RegisterDto dto)
        {
            if (await _db.Benutzer.AnyAsync(b => b.Benutzername == dto.Benutzername))
                throw new InvalidOperationException("Benutzername bereits vergeben");

            var benutzer = new Benutzer
            {
                Benutzername = dto.Benutzername,
                PasswortHash = BCrypt.Net.BCrypt.HashPassword(dto.Passwort, 10),
                Vorname = dto.Vorname,
                Nachname = dto.Nachname,
                Rolle = "Ausbilder",
                ErstelltAm = DateTime.UtcNow,
                PasswortGeandert = false
            };

            _db.Benutzer.Add(benutzer);
            await _db.SaveChangesAsync();

            return ErstelleToken(benutzer);
        }

        /// <summary>
        /// Authentifiziert einen Benutzer und gibt ein JWT-Token zurück.
        /// </summary>
        public async Task<AuthResponseDto> AnmeldenAsync(LoginDto dto)
        {
            var benutzer = await _db.Benutzer
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Benutzername == dto.Benutzername);

            if (benutzer == null || !BCrypt.Net.BCrypt.Verify(dto.Passwort, benutzer.PasswortHash))
                throw new UnauthorizedAccessException("Benutzername oder Passwort ungültig");

            return ErstelleToken(benutzer);
        }

        /// <summary>
        /// Eigenes Passwort ändern (eingeloggter Benutzer)
        /// </summary>
        public async Task PasswortAendernAsync(ClaimsPrincipal user, PasswortAendernDto dto)
        {
            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                throw new UnauthorizedAccessException();

            var benutzer = await _db.Benutzer.FindAsync(userId);
            if (benutzer == null)
                throw new UnauthorizedAccessException();

            if (!BCrypt.Net.BCrypt.Verify(dto.AltesPasswort, benutzer.PasswortHash))
                throw new UnauthorizedAccessException("Altes Passwort ist falsch");

            benutzer.PasswortHash = BCrypt.Net.BCrypt.HashPassword(dto.NeuesPasswort, 10);
            benutzer.PasswortGeandert = true;
            await _db.SaveChangesAsync();
        }

        /// <summary>
        /// Erstellt das JWT-Token (30 Minuten für Sicherheit).
        /// </summary>
        private AuthResponseDto ErstelleToken(Benutzer benutzer)
        {
            var jwtKey = _configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("JWT-Key nicht konfiguriert");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, benutzer.Id.ToString()),
                new Claim(ClaimTypes.Name, benutzer.Benutzername),
                new Claim(ClaimTypes.Role, benutzer.Rolle),
                new Claim("vorname", benutzer.Vorname ?? ""),
                new Claim("nachname", benutzer.Nachname ?? "")
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(60),
                signingCredentials: credentials
            );

            return new AuthResponseDto
            {
                Token = new JwtSecurityTokenHandler().WriteToken(token),
                Benutzername = benutzer.Benutzername,
                Rolle = benutzer.Rolle,
                Vorname = benutzer.Vorname,
                BenutzerId = benutzer.Id,
                PasswortGeandert = benutzer.PasswortGeandert
            };
        }
    }
}