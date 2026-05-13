using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models
{
    public class Tagesstatus
    {
        public int Id { get; set; }

        public int AzubiId { get; set; }
        public Teilnehmer Azubi { get; set; } = null!;

        public DateOnly Datum { get; set; }

        [Required, MaxLength(50)]
        public string Status { get; set; } = "Ungeklärt";

        [MaxLength(500)]
        public string? Bemerkung { get; set; }
    }
}
