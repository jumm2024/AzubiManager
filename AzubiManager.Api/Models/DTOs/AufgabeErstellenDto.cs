using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models.DTOs
{
    public class AufgabeErstellenDto
    {
        [Required, MaxLength(200)]
        public string Titel { get; set; } = string.Empty;

        public string? Beschreibung { get; set; }

        [MaxLength(20)]
        public string Prioritaet { get; set; } = "Mittel";

        public DateOnly Faelligkeitsdatum { get; set; }

        public int? AzubiId { get; set; }
        public bool IstGlobal { get; set; }
    }
}