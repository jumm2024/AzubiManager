using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AllgemeineInfoController : ControllerBase
    {
        private readonly AllgemeineInfoService _service;
        public AllgemeineInfoController(AllgemeineInfoService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<List<AllgemeineInfoDto>>> Alle()
            => Ok(await _service.AlleAbrufenAsync());

        [HttpPost]
        public async Task<ActionResult<AllgemeineInfoDto>> Erstellen([FromBody] AllgemeineInfoErstellenDto dto)
            => Ok(await _service.ErstellenAsync(dto));

        [HttpPut("{id}")]
        public async Task<ActionResult<AllgemeineInfoDto>> Aktualisieren(int id, [FromBody] AllgemeineInfoErstellenDto dto)
        {
            var result = await _service.AktualisierenAsync(id, dto);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Loeschen(int id)
            => await _service.LoeschenAsync(id) ? NoContent() : NotFound();
    }
}
