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
    public class TagesstatusController : ControllerBase
    {
        private readonly TagesstatusService _service;
        private readonly TagesstatusErstellenValidator _validator;
        private readonly ILogger<TagesstatusController> _logger;

        public TagesstatusController(TagesstatusService service, TagesstatusErstellenValidator validator, ILogger<TagesstatusController> logger)
        {
            _service = service;
            _validator = validator;
            _logger = logger;
        }

        /// <summary>
        /// Alle Status für ein Datum abrufen
        /// </summary>
        [HttpGet("{datum}")]
        public async Task<ActionResult<List<TagesstatusDto>>> AlleFuerDatum(DateOnly datum)
        {
            return Ok(await _service.AlleFuerDatumAsync(datum));
        }

        /// <summary>
        /// Status setzen (erstellt oder aktualisiert)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<TagesstatusDto>> Setzen([FromBody] TagesstatusErstellenDto dto)
        {
            var validation = await _validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return BadRequest(validation.Errors);

            try
            {
                var status = await _service.SetzenAsync(dto);
                return Ok(status);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Fehler = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        /// <summary>
        /// Excel-Export für einen Monat
        /// </summary>
        [HttpGet("export/{year}/{month}")]
        public async Task<IActionResult> Export(int year, int month)
        {
            var data = await _service.ExcelExportAsync(year, month);
            return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"Tagesstatus_{year}_{month:D2}.xlsx");
        }

        /// <summary>
        /// Azubi-Bericht Export mit Status-Zusammenfassung
        /// </summary>
        [HttpGet("bericht/{year}/{month}")]
        public async Task<IActionResult> Bericht(int year, int month)
        {
            var data = await _service.AzubiBerichtExportAsync(year, month);
            return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"AzubiBericht_{year}_{month:D2}.xlsx");
        }

        /// <summary>
        /// Azubi-Bericht Gesamtzeitraum Export
        /// </summary>
        [HttpGet("bericht/gesamt")]
        public async Task<IActionResult> BerichtGesamt()
        {
            var data = await _service.AzubiBerichtGesamtExportAsync();
            return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"AzubiBericht_Gesamt.xlsx");
        }

        /// <summary>
        /// Excel-Import
        /// </summary>
        [HttpPost("import")]
        public async Task<ActionResult> Import([FromQuery] int year, [FromQuery] int month)
        {
            var file = Request.Form.Files.FirstOrDefault();
            if (file == null || file.Length == 0)
                return BadRequest(new { fehler = "Keine Datei ausgewählt" });

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            var data = stream.ToArray();
            var count = await _service.ExcelImportAsync(data, year, month);

            // Datei speichern für tägliches Update
            try
            {
                var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
                Directory.CreateDirectory(uploadsDir);
                var monatsName = $"{DateTime.Now.Year}_{DateTime.Now.Month:D2}";
                var pfad = Path.Combine(uploadsDir, $"Tagesstatus_{monatsName}.xlsx");
                await System.IO.File.WriteAllBytesAsync(pfad, data);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Fehler beim Speichern der Import-Datei");
            }

            return Ok(new { imported = count });
        }

        /// <summary>
        /// Status löschen
        /// </summary>
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
    }
}