using FluentValidation;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Validators
{
    public class TeilnehmerErstellenValidator : AbstractValidator<TeilnehmerErstellenDto>
    {
        public TeilnehmerErstellenValidator()
        {
            RuleFor(x => x.Vorname)
                .NotEmpty().WithMessage("Vorname ist erforderlich")
                .MaximumLength(100);

            RuleFor(x => x.Nachname)
                .NotEmpty().WithMessage("Nachname ist erforderlich")
                .MaximumLength(100);

            RuleFor(x => x.Gruppe)
                .NotEmpty()
                .Must(g => new[] { "Ausbildung", "BVB", "Erprober", "Praktikant" }.Contains(g))
                .WithMessage("Gruppe muss Ausbildung, BVB, Erprober oder Praktikant sein");

            RuleFor(x => x.Lehrjahr)
                .InclusiveBetween(1, 4).WithMessage("Lehrjahr muss zwischen 1 und 4 liegen");

            RuleFor(x => x.Ausbildungsende)
                .GreaterThan(x => x.Ausbildungsstart)
                .When(x => x.Ausbildungsstart != default && x.Ausbildungsende != default)
                .WithMessage("Ausbildungsende muss nach dem Ausbildungsstart liegen");
        }
    }
}