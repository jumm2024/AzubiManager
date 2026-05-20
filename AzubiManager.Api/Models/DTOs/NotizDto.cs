namespace AzubiManager.Api.Models.DTOs
{
    public class NotizDto
    {
        public int Id { get; set; }
        public string Titel { get; set; } = string.Empty;
        public string Inhalt { get; set; } = string.Empty;
        public string Kategorie { get; set; } = "Beobachtung";
        public int? AzubiId { get; set; }
        public string? AzubiIds { get; set; }
        public string? AzubiName { get; set; }
        public int AusbilderId { get; set; }
        public string? AusbilderName { get; set; }
        public DateTime ErstelltAm { get; set; }
    }
}