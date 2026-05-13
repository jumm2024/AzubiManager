using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models.DTOs
{
    public class TerminErstellenDto
    {
        [Required, MaxLength(200)]
        public string Titel { get; set; } = string.Empty;

        public string? Beschreibung { get; set; }

        [Required]
        public DateTime Datum { get; set; }

        public DateTime? Endzeit { get; set; }

        [MaxLength(50)]
        public string Kategorie { get; set; } = "Sonstiges";

        public string? Ort { get; set; }

        public int? AzubiId { get; set; }
        public string? AzubiIds { get; set; }
    }
}