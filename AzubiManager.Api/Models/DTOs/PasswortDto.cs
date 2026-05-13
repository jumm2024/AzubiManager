using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models.DTOs
{
    public class PasswortDto
    {
        [Required, MinLength(6)]
        public string Passwort { get; set; } = string.Empty;
    }
}