namespace AzubiManager.Api.Models.DTOs
{
    public class AufgabeDto
    {
        public int Id { get; set; }
        public string Titel { get; set; } = string.Empty;
        public string? Beschreibung { get; set; }
        public string Prioritaet { get; set; } = "Mittel";
        public DateOnly Faelligkeitsdatum { get; set; }
        public bool Erledigt { get; set; }
        public bool IstGlobal { get; set; }
        public int? AzubiId { get; set; }
        public string? AzubiName { get; set; }
        public int AusbilderId { get; set; }
    }
}