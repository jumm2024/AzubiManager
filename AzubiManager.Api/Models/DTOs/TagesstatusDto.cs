namespace AzubiManager.Api.Models.DTOs
{
    public class TagesstatusDto
    {
        public int Id { get; set; }
        public int AzubiId { get; set; }
        public string AzubiName { get; set; } = string.Empty;
        public DateOnly Datum { get; set; }
        public string Status { get; set; } = "Anwesend";
        public string? Bemerkung { get; set; }
    }
}