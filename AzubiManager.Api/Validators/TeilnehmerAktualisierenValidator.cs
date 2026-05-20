using FluentValidation;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Validators
{
    public class TeilnehmerAktualisierenValidator : AbstractValidator<TeilnehmerAktualisierenDto>
    {
        public TeilnehmerAktualisierenValidator()
        {
            RuleFor(x => x.Vorname).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Nachname).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Gruppe).NotEmpty()
                .Must(g => new[] { "Ausbildung", "BVB", "Erprober", "Praktikant" }.Contains(g));
            RuleFor(x => x.Lehrjahr)
                .InclusiveBetween(1, 4)
                .When(x => x.Gruppe == "Ausbildung");
            RuleFor(x => x.Lehrjahr)
                .Equal(0)
                .When(x => x.Gruppe != "Ausbildung");
            RuleFor(x => x.Ausbildungsende)
                .GreaterThan(x => x.Ausbildungsstart)
                .When(x => x.Ausbildungsstart.HasValue && x.Ausbildungsende.HasValue);
        }
    }
}