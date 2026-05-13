using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models
{
    public class Termin
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Titel { get; set; } = string.Empty;

        public string? Beschreibung { get; set; }

        public DateTime Datum { get; set; }
        public DateTime? Endzeit { get; set; }

        [MaxLength(50)]
        public string Kategorie { get; set; } = "Sonstiges";

        public string? Ort { get; set; }

        // Optional: Verknüpfung zu einem Teilnehmer (Azubi)
        public int? AzubiId { get; set; }
        public Teilnehmer? Azubi { get; set; }

        // Besitzer (Ausbilder)
        public int AusbilderId { get; set; }
        public Benutzer? Ausbilder { get; set; }
    }
}