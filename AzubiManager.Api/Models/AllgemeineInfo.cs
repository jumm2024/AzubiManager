using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models
{
    public class AllgemeineInfo
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Bezeichnung { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Wert { get; set; }

        public int Sortierung { get; set; }
    }
}
