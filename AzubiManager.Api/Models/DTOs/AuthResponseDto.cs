namespace AzubiManager.Api.Models.DTOs
{
    public class AuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public string Benutzername { get; set; } = string.Empty;
        public string Rolle { get; set; } = string.Empty;
        public string? Vorname { get; set; }
        public int BenutzerId { get; set; }
        public bool PasswortGeandert { get; set; }
    }
}