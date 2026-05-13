using System.ComponentModel.DataAnnotations;

namespace AzubiManager.Api.Models.DTOs
{
    public class PasswortAendernDto
    {
        [Required, MinLength(1)]
        public string AltesPasswort { get; set; } = string.Empty;

        [Required, MinLength(6)]
        public string NeuesPasswort { get; set; } = string.Empty;
    }
}
