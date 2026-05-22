using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;
using AzubiManager.Api.Validators;

namespace AzubiManager.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [EnableRateLimiting("perUser")]
    public class AufgabenController : ControllerBase
    {
        private readonly AufgabeService _service;
        private readonly AufgabeErstellenValidator _validator;

        public AufgabenController(AufgabeService service, AufgabeErstellenValidator validator)
        {
            _service = service;
            _validator = validator;
        }

        [HttpGet]
        public async Task<ActionResult<List<AufgabeDto>>> Alle(
            [FromQuery] bool? erledigt = null,
            [FromQuery] int? skip = null,
            [FromQuery] int? take = null)
        {
            return Ok(await _service.AlleAbrufenAsync(erledigt, skip, take));
        }

        [HttpPost]
        public async Task<ActionResult<AufgabeDto>> Erstellen([FromBody] AufgabeErstellenDto dto)
        {
            var validation = await _validator.ValidateAsync(dto);
            if (!validation.IsValid) return BadRequest(validation.Errors);

            return Ok(await _service.ErstellenAsync(dto));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<AufgabeDto>> Aktualisieren(int id, [FromBody] AufgabeAktualisierenDto dto)
        {
            try
            {
                var a = await _service.AktualisierenAsync(id, dto);
                return a == null ? NotFound() : Ok(a);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Loeschen(int id)
        {
            try
            {
                return await _service.LoeschenAsync(id) ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        [HttpPatch("{id}/erledigt")]
        public async Task<ActionResult> ToggleErledigt(int id)
        {
            try
            {
                return await _service.ToggleErledigtAsync(id) ? Ok() : NotFound();
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }
    }
}
