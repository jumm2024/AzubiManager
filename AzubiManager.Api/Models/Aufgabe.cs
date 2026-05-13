using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models
{
    public class Aufgabe
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Titel { get; set; } = string.Empty;

        public string? Beschreibung { get; set; }

        [MaxLength(20)]
        public string Prioritaet { get; set; } = "Mittel";

        public DateOnly Faelligkeitsdatum { get; set; }

        public bool Erledigt { get; set; } = false;

        // Für alle Ausbilder sichtbar?
        public bool IstGlobal { get; set; } = false;

        // Optional: Verknüpfung zu einem Teilnehmer (Azubi)
        public int? AzubiId { get; set; }
        public Teilnehmer? Azubi { get; set; }

        // Besitzer (Ausbilder)
        public int AusbilderId { get; set; }
        public Benutzer? Ausbilder { get; set; }
    }
}