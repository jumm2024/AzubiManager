namespace AzubiManager.Api.Models
{
    public class RefreshToken
    {
        public int Id { get; set; }
        public int BenutzerId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime ErstelltAm { get; set; } = DateTime.UtcNow;
        public DateTime LaeuftAb { get; set; }
        public DateTime? VerwendetAm { get; set; }
        public string? IpAdresse { get; set; }
        public string? UserAgent { get; set; }
        public bool IstAktiv => VerwendetAm == null && LaeuftAb > DateTime.UtcNow;
    }
}
