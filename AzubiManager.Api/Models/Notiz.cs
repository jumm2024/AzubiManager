using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models
{
    public class Notiz
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Titel { get; set; } = string.Empty;

        public string Inhalt { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Kategorie { get; set; } = "Beobachtung";

        // Optional: Verknüpfung zu einem Teilnehmer (Azubi)
        public int? AzubiId { get; set; }
        public Teilnehmer? Azubi { get; set; }

        // Besitzer (Ausbilder)
        public int AusbilderId { get; set; }
        public Benutzer? Ausbilder { get; set; }

        public DateTime ErstelltAm { get; set; } = DateTime.UtcNow;
    }
}