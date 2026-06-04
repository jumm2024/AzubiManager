using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
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
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AuthService(AppDbContext db, IConfiguration configuration, IHttpContextAccessor httpContextAccessor)
        {
            _db = db;
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;
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

            // Alle Refresh Tokens invalidieren bei Passwortänderung
            var tokens = await _db.RefreshTokens
                .Where(rt => rt.BenutzerId == userId && rt.VerwendetAm == null)
                .ToListAsync();
            foreach (var token in tokens)
            {
                token.LaeuftAb = DateTime.UtcNow;
            }
            await _db.SaveChangesAsync();
        }

        /// <summary>
        /// Erstellt ein neues Access Token mit einem bestehenden Refresh Token.
        /// </summary>
        public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken, string? ipAdresse, string? userAgent)
        {
            var tokenEntity = await _db.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

            if (tokenEntity == null || !tokenEntity.IstAktiv)
                throw new UnauthorizedAccessException("Ungültiger oder abgelaufener Refresh Token");

            var benutzer = await _db.Benutzer
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == tokenEntity.BenutzerId);

            if (benutzer == null)
                throw new UnauthorizedAccessException("Benutzer nicht gefunden");

            // Alten Refresh Token als verwendet markieren
            tokenEntity.VerwendetAm = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Neuen Token erstellen
            return ErstelleToken(benutzer);
        }

        /// <summary>
        /// Erstellt das JWT-Token (60 Minuten Access Token).
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

            // Refresh Token generieren und speichern
            var refreshToken = GeneriereRefreshToken(benutzer.Id);

            return new AuthResponseDto
            {
                Token = new JwtSecurityTokenHandler().WriteToken(token),
                RefreshToken = refreshToken,
                Benutzername = benutzer.Benutzername,
                Rolle = benutzer.Rolle,
                Vorname = benutzer.Vorname,
                BenutzerId = benutzer.Id,
                PasswortGeandert = benutzer.PasswortGeandert
            };
        }

        private string GeneriereRefreshToken(int benutzerId)
        {
            var randomNumber = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            var token = Convert.ToBase64String(randomNumber);

            var refreshToken = new RefreshToken
            {
                BenutzerId = benutzerId,
                Token = token,
                LaeuftAb = DateTime.UtcNow.AddDays(7),
                IpAdresse = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
                UserAgent = _httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString()
            };

            _db.RefreshTokens.Add(refreshToken);
            _db.SaveChanges();

            return token;
        }
    }
}