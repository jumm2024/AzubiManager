using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models.DTOs
{
    public class LoginDto
    {
        [Required(ErrorMessage = "Benutzername ist erforderlich")]
        public string Benutzername { get; set; } = string.Empty;

        [Required(ErrorMessage = "Passwort ist erforderlich")]
        public string Passwort { get; set; } = string.Empty;
    }
}