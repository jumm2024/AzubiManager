using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _db;

        public UsersController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<ActionResult> Alle()
        {
            var users = await _db.Benutzer
                .AsNoTracking()
                .Select(u => new
                {
                    u.Id,
                    u.Benutzername,
                    u.Vorname,
                    u.Nachname,
                    u.Rolle
                }).ToListAsync();

            return Ok(users);
        }

        [HttpPost]
        public async Task<ActionResult> Erstellen([FromBody] CreateUserDto dto)
        {
            if (await _db.Benutzer.AnyAsync(b => b.Benutzername == dto.Benutzername))
                return Conflict("Benutzername existiert bereits");

            var user = new Benutzer
            {
                Benutzername = dto.Benutzername,
                PasswortHash = BCrypt.Net.BCrypt.HashPassword(dto.Passwort, 12),
                Vorname = dto.Vorname,
                Nachname = dto.Nachname,
                Rolle = dto.Rolle,
                ErstelltAm = DateTime.UtcNow
            };

            _db.Benutzer.Add(user);
            await _db.SaveChangesAsync();

            return Ok(new { user.Id, user.Benutzername, user.Rolle });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Loeschen(int id)
        {
            var user = await _db.Benutzer.FindAsync(id);
            if (user == null) return NotFound();
            if (user.Rolle == "Admin")
            {
                var adminCount = await _db.Benutzer.CountAsync(b => b.Rolle == "Admin");
                if (adminCount <= 1) return BadRequest("Letzten Admin nicht loeschen");
            }

            _db.Benutzer.Remove(user);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("{id}/passwort")]
        public async Task<ActionResult> PasswortZuruecksetzen(int id, [FromBody] PasswortDto dto)
        {
            var user = await _db.Benutzer.FindAsync(id);
            if (user == null) return NotFound();

            user.PasswortHash = BCrypt.Net.BCrypt.HashPassword(dto.Passwort, 12);
            await _db.SaveChangesAsync();

            return Ok();
        }
    }
}
