using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        /// <summary>
        /// Meldet einen Benutzer an und gibt ein JWT-Token zurück.
        /// </summary>
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
        {
            try
            {
                var response = await _authService.AnmeldenAsync(dto);

                // HttpOnly Cookie setzen (sicherer als localStorage)
                Response.Cookies.Append("token", response.Token, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false, // true in Produktion (HTTPS)
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTime.UtcNow.AddMinutes(240)
                });

                return Ok(new { response.BenutzerId, response.Benutzername, response.Rolle, response.Vorname, response.PasswortGeandert });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { Fehler = "Benutzername oder Passwort ungültig" });
            }
        }

        /// <summary>
        /// Registriert einen neuen Ausbilder.
        /// </summary>
        [HttpPost("logout")]
        [Authorize]
        public ActionResult Logout()
        {
            Response.Cookies.Delete("token");
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
        [AllowAnonymous]
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