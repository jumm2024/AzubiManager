using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models.DTOs
{
    public class AufgabeAktualisierenDto
    {
        [Required, MaxLength(200)]
        public string Titel { get; set; } = string.Empty;

        public string? Beschreibung { get; set; }

        [MaxLength(20)]
        public string Prioritaet { get; set; } = "Mittel";

        public DateOnly Faelligkeitsdatum { get; set; }

        public bool Erledigt { get; set; }

        public int? AzubiId { get; set; }
        public string? AzubiIds { get; set; }
    }
}