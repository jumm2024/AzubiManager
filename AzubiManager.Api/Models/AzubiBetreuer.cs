using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models
{
    public class AzubiBetreuer
    {
        public int Id { get; set; }

        public int TeilnehmerId { get; set; }
        public Teilnehmer Teilnehmer { get; set; } = null!;

        public int BenutzerId { get; set; }
        public Benutzer Benutzer { get; set; } = null!;
    }
}
