namespace AzubiManager.Api.Models.DTOs
{
    public class TerminDto
    {
        public int Id { get; set; }
        public string Titel { get; set; } = string.Empty;
        public string? Beschreibung { get; set; }
        public DateTime Datum { get; set; }
        public DateTime? Endzeit { get; set; }
        public string Kategorie { get; set; } = "Sonstiges";
        public string? Ort { get; set; }
        public int? AzubiId { get; set; }
        public string? AzubiIds { get; set; }
        public string? AzubiName { get; set; }
        public int AusbilderId { get; set; }
        public string? AusbilderName { get; set; }
    }
}
