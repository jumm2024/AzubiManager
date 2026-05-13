using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models.DTOs
{
    public class TagesstatusErstellenDto
    {
        [Required]
        public int AzubiId { get; set; }

        [Required]
        public DateOnly Datum { get; set; }

        [Required, MaxLength(50)]
        public string Status { get; set; } = "Anwesend";

        [MaxLength(500)]
        public string? Bemerkung { get; set; }
    }
}