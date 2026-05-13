using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models.DTOs
{
    public class NotizErstellenDto
    {
        [Required, MaxLength(200)]
        public string Titel { get; set; } = string.Empty;

        public string Inhalt { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Kategorie { get; set; } = "Beobachtung";

        public int? AzubiId { get; set; }
        public string? AzubiIds { get; set; }
    }
}