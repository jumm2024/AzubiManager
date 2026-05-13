using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models.DTOs
{
    public class TeilnehmerAktualisierenDto
    {
        [Required, MaxLength(100)]
        public string Vorname { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Nachname { get; set; } = string.Empty;

        public DateOnly? Geburtsdatum { get; set; }

        [MaxLength(100)]
        public string? Kurs { get; set; }

        public int Lehrjahr { get; set; } = 1;

        [MaxLength(100)]
        public string? Abteilung { get; set; }

        [MaxLength(50)]
        public string Gruppe { get; set; } = "Ausbildung";

        public DateOnly Ausbildungsstart { get; set; }
        public DateOnly Ausbildungsende { get; set; }
    }
}