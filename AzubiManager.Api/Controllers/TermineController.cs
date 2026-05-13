using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TermineController : ControllerBase
    {
        private readonly TerminService _service;
        public TermineController(TerminService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<List<TerminDto>>> Alle() => Ok(await _service.AlleAbrufenAsync());

        [HttpPost]
        public async Task<ActionResult<TerminDto>> Erstellen([FromBody] TerminErstellenDto dto)
            => Ok(await _service.ErstellenAsync(dto));

        [HttpDelete("{id}")]
        public async Task<ActionResult> Loeschen(int id)
        {
            try { return await _service.LoeschenAsync(id) ? NoContent() : NotFound(); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }
    }
}
