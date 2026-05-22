using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [EnableRateLimiting("perUser")]
    public class NotizenController : ControllerBase
    {
        private readonly NotizService _service;
        public NotizenController(NotizService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<List<NotizDto>>> Alle(
            [FromQuery] int? skip = null,
            [FromQuery] int? take = null) => Ok(await _service.AlleAbrufenAsync(skip, take));

        [HttpPost]
        public async Task<ActionResult<NotizDto>> Erstellen([FromBody] NotizErstellenDto dto)
            => Ok(await _service.ErstellenAsync(dto));

        [HttpPut("{id}")]
        public async Task<ActionResult<NotizDto>> Aktualisieren(int id, [FromBody] NotizAktualisierenDto dto)
        {
            try
            {
                var result = await _service.AktualisierenAsync(id, dto);
                return result == null ? NotFound() : Ok(result);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Loeschen(int id)
        {
            try { return await _service.LoeschenAsync(id) ? NoContent() : NotFound(); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }
    }
}
