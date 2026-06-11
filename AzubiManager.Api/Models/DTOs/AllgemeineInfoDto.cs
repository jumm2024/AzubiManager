namespace AzubiManager.Api.Models.DTOs
{
    public class AllgemeineInfoDto
    {
        public int Id { get; set; }
        public string Bezeichnung { get; set; } = string.Empty;
        public string? Wert { get; set; }
        public int Sortierung { get; set; }
    }
}
