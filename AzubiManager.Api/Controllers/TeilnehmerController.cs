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
    public class TeilnehmerController : ControllerBase
    {
        private readonly TeilnehmerService _service;
        private readonly TeilnehmerErstellenValidator _erstellenValidator;
        private readonly TeilnehmerAktualisierenValidator _aktualisierenValidator;

        public TeilnehmerController(
            TeilnehmerService service,
            TeilnehmerErstellenValidator erstellenValidator,
            TeilnehmerAktualisierenValidator aktualisierenValidator)
        {
            _service = service;
            _erstellenValidator = erstellenValidator;
            _aktualisierenValidator = aktualisierenValidator;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResponse<TeilnehmerDto>>> Alle(
            [FromQuery] string? gruppe = null,
            [FromQuery] int? skip = null,
            [FromQuery] int? take = null,
            [FromQuery] bool? nurMeine = null)
        {
            return Ok(await _service.AlleAbrufenAsync(gruppe, skip, take, nurMeine));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TeilnehmerDto>> Einzelner(int id)
        {
            try
            {
                var t = await _service.EinzelnenAbrufenAsync(id);
                return t == null ? NotFound() : Ok(t);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpPost]
        public async Task<ActionResult<TeilnehmerDto>> Erstellen([FromBody] TeilnehmerErstellenDto dto)
        {
            var validation = await _erstellenValidator.ValidateAsync(dto);
            if (!validation.IsValid)
                return BadRequest(validation.Errors);

            var teilnehmer = await _service.ErstellenAsync(dto);
            return CreatedAtAction(nameof(Einzelner), new { id = teilnehmer.Id }, teilnehmer);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<TeilnehmerDto>> Aktualisieren(int id, [FromBody] TeilnehmerAktualisierenDto dto)
        {
            var validation = await _aktualisierenValidator.ValidateAsync(dto);
            if (!validation.IsValid)
                return BadRequest(validation.Errors);

            try
            {
                var t = await _service.AktualisierenAsync(id, dto);
                return t == null ? NotFound() : Ok(t);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Loeschen(int id)
        {
            try
            {
                var ok = await _service.LoeschenAsync(id);
                return ok ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpGet("meine")]
        public async Task<ActionResult<List<int>>> MeineBetreute()
        {
            return Ok(await _service.MeineBetreuteIdsAsync());
        }

        [HttpPost("{id}/betreuen")]
        public async Task<ActionResult> BetreuungHinzufuegen(int id)
        {
            await _service.AddBetreuungAsync(id);
            return Ok();
        }

        [HttpDelete("{id}/betreuen")]
        public async Task<ActionResult> BetreuungEntfernen(int id)
        {
            await _service.RemoveBetreuungAsync(id);
            return Ok();
        }
    }
}