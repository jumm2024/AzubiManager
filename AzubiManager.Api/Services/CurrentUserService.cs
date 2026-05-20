using System.Security.Claims;

namespace AzubiManager.Api.Services
{
    public class CurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Gibt die ID des aktuell eingeloggten Benutzers zurück.
        /// </summary>
        public int BenutzerId
        {
            get
            {
                var claim = _httpContextAccessor.HttpContext?.User
                    ?.FindFirst(ClaimTypes.NameIdentifier);
                return claim != null && int.TryParse(claim.Value, out var id) ? id : throw new UnauthorizedAccessException("Nicht authentifiziert");
            }
        }

        /// <summary>
        /// Gibt die Rolle des aktuellen Benutzers zurück.
        /// </summary>
        public string Rolle
        {
            get
            {
                var claim = _httpContextAccessor.HttpContext?.User
                    ?.FindFirst(ClaimTypes.Role);
                return claim?.Value ?? "Ausbilder";
            }
        }

        /// <summary>
        /// Prüft, ob der aktuelle Benutzer Admin ist.
        /// </summary>
        public bool IstAdmin => Rolle == "Admin";
    }
}