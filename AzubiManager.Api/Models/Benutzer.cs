using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models
{
    public class Benutzer
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Benutzername { get; set; } = string.Empty;

        [Required]
        public string PasswortHash { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Vorname { get; set; }

        [MaxLength(100)]
        public string? Nachname { get; set; }

        [MaxLength(50)]
        public string Rolle { get; set; } = "Ausbilder";

        public DateTime ErstelltAm { get; set; } = DateTime.UtcNow;
        public bool PasswortGeandert { get; set; }

        // Navigation: Ein Ausbilder kann viele Teilnehmer haben
        public ICollection<Teilnehmer> Teilnehmer { get; set; } = new List<Teilnehmer>();
    }
}
