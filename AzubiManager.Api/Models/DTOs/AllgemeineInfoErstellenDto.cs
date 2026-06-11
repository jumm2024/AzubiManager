using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models.DTOs
{
    public class AllgemeineInfoErstellenDto
    {
        [Required, MaxLength(100)]
        public string Bezeichnung { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Wert { get; set; }

        public int Sortierung { get; set; }
    }
}
