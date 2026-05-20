using FluentValidation;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Validators
{
    public class TagesstatusErstellenValidator : AbstractValidator<TagesstatusErstellenDto>
    {
        private static readonly string[] ErlaubteStatus = new[]
        {
            "Anwesend", "Schule", "Praktikum", "Termin", "Urlaub",
            "Krank", "Kind krank", "Freigestellt", "Entschuldigt",
            "Unentschuldigt", "Ungeklärt", "Feiertag", "Wochenende"
        };

        public TagesstatusErstellenValidator()
        {
            RuleFor(x => x.AzubiId)
                .GreaterThan(0).WithMessage("AzubiId ist erforderlich");

            RuleFor(x => x.Datum)
                .NotEmpty().WithMessage("Datum ist erforderlich");

            RuleFor(x => x.Status)
                .NotEmpty().WithMessage("Status ist erforderlich")
                .Must(s => ErlaubteStatus.Contains(s))
                .WithMessage("Ungültiger Status. Erlaubt: " + string.Join(", ", ErlaubteStatus));
        }
    }
}