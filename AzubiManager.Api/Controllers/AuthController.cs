using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly AppDbContext _db;

        public AuthController(AuthService authService, AppDbContext db)
        {
            _authService = authService;
            _db = db;
        }

        /// <summary>
        /// Meldet einen Benutzer an und gibt ein JWT-Token zurück.
        /// </summary>
        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
        {
            try
            {
                var response = await _authService.AnmeldenAsync(dto);

                Response.Cookies.Append("token", response.Token, new CookieOptions
                {
                    HttpOnly = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddMinutes(60)
                });

                Response.Cookies.Append("refreshToken", response.RefreshToken, new CookieOptions
                {
                    HttpOnly = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddDays(7),
                    Secure = true
                });

                return Ok(new { response.BenutzerId, response.Benutzername, response.Rolle, response.Vorname, response.PasswortGeandert });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { Fehler = "Benutzername oder Passwort ungültig" });
            }
        }

        [HttpPost("refresh")]
        [AllowAnonymous]
        [EnableRateLimiting("login")]
        public async Task<ActionResult<AuthResponseDto>> Refresh()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (string.IsNullOrEmpty(refreshToken))
                return BadRequest(new { Fehler = "Refresh Token fehlt" });

            try
            {
                var response = await _authService.RefreshTokenAsync(
                    refreshToken,
                    HttpContext.Connection.RemoteIpAddress?.ToString(),
                    HttpContext.Request.Headers["User-Agent"].ToString());

                Response.Cookies.Append("token", response.Token, new CookieOptions
                {
                    HttpOnly = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddMinutes(60)
                });

                Response.Cookies.Append("refreshToken", response.RefreshToken, new CookieOptions
                {
                    HttpOnly = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddDays(7),
                    Secure = true
                });

                return Ok(new { response.BenutzerId, response.Benutzername, response.Rolle, response.Vorname, response.PasswortGeandert });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { Fehler = "Session abgelaufen, bitte neu anmelden" });
            }
        }

        /// <summary>
        /// Registriert einen neuen Ausbilder.
        /// </summary>
        [HttpPost("logout")]
        [Authorize]
        public async Task<ActionResult> Logout()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out var userId))
            {
                var tokens = await _db.RefreshTokens
                    .Where(rt => rt.BenutzerId == userId && rt.VerwendetAm == null)
                    .ToListAsync();
                foreach (var token in tokens)
                {
                    token.LaeuftAb = DateTime.UtcNow;
                }
                await _db.SaveChangesAsync();
            }

            Response.Cookies.Delete("token");
            Response.Cookies.Delete("refreshToken");
            return Ok();
        }

        [HttpGet("me")]
        [Authorize]
        public ActionResult Me()
        {
            var benutzerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var benutzername = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            var rolle = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var vorname = User.FindFirst("vorname")?.Value;
            return Ok(new { benutzerId, benutzername, rolle, vorname });
        }

        [HttpPost("passwort-aendern")]
        [Authorize]
        public async Task<ActionResult> PasswortAendern([FromBody] PasswortAendernDto dto)
        {
            try
            {
                await _authService.PasswortAendernAsync(User, dto);
                return Ok();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { Fehler = "Altes Passwort ist falsch" });
            }
        }

        [HttpPost("register")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
        {
            try
            {
                var response = await _authService.RegistrierenAsync(dto);
                return CreatedAtAction(nameof(Login), response);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { Fehler = ex.Message });
            }
        }
    }
}