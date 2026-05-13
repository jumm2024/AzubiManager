using FluentValidation;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Validators
{
    public class AufgabeErstellenValidator : AbstractValidator<AufgabeErstellenDto>
    {
        private static readonly string[] Prioritaeten = { "Hoch", "Mittel", "Niedrig" };

        public AufgabeErstellenValidator()
        {
            RuleFor(x => x.Titel).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Prioritaet)
                .Must(p => Prioritaeten.Contains(p))
                .WithMessage("Priorität muss Hoch, Mittel oder Niedrig sein");
        }
    }
}