using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models
{
    public class Teilnehmer
    {
        public int Id { get; set; }

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

        public DateOnly? Ausbildungsstart { get; set; }
        public DateOnly? Ausbildungsende { get; set; }

        // Besitzer (Ausbilder)
        public int? AusbilderId { get; set; }
        public Benutzer? Ausbilder { get; set; }

        // Navigation Properties – wichtig: Name muss exakt mit dem in der anderen Klasse übereinstimmen
        public ICollection<Tagesstatus> TagesstatusListe { get; set; } = new List<Tagesstatus>();
        public ICollection<Aufgabe> Aufgaben { get; set; } = new List<Aufgabe>();
        public ICollection<Termin> Termine { get; set; } = new List<Termin>();
        public ICollection<Notiz> Notizen { get; set; } = new List<Notiz>();
        public ICollection<AzubiBetreuer> Betreuer { get; set; } = new List<AzubiBetreuer>();
    }
}