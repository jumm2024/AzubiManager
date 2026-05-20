namespace AzubiManager.Api.Models.DTOs
{
    public class TeilnehmerDto
    {
        public int Id { get; set; }
        public string Vorname { get; set; } = string.Empty;
        public string Nachname { get; set; } = string.Empty;
        public DateOnly? Geburtsdatum { get; set; }
        public string? Kurs { get; set; }
        public int Lehrjahr { get; set; }
        public string? Abteilung { get; set; }
        public string Gruppe { get; set; } = "Ausbildung";
        public DateOnly? Ausbildungsstart { get; set; }
        public DateOnly? Ausbildungsende { get; set; }
        public int? AusbilderId { get; set; }
        public string? AusbilderName { get; set; }
        public bool IstBetreut { get; set; }
    }
}