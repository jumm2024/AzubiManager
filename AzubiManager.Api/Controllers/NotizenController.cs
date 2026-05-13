using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Services;

namespace AzubiManager.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotizenController : ControllerBase
    {
        private readonly NotizService _service;
        public NotizenController(NotizService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<List<NotizDto>>> Alle() => Ok(await _service.AlleAbrufenAsync());

        [HttpPost]
        public async Task<ActionResult<NotizDto>> Erstellen([FromBody] NotizErstellenDto dto)
            => Ok(await _service.ErstellenAsync(dto));

        [HttpDelete("{id}")]
        public async Task<ActionResult> Loeschen(int id)
        {
            try { return await _service.LoeschenAsync(id) ? NoContent() : NotFound(); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }
    }
}
