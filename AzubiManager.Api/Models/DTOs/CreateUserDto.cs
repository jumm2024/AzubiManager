using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models.DTOs
{
    public class CreateUserDto
    {
        [Required, MaxLength(100)]
        public string Benutzername { get; set; } = string.Empty;

        [Required, MinLength(6)]
        public string Passwort { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Vorname { get; set; }

        [MaxLength(100)]
        public string? Nachname { get; set; }

        [Required]
        public string Rolle { get; set; } = "Ausbilder";
    }
}