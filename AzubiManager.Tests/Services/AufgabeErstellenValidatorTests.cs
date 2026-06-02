using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Validators;

namespace AzubiManager.Tests.Services
{
    public class AufgabeErstellenValidatorTests
    {
        private readonly AufgabeErstellenValidator _validator = new();

        [Fact]
        public async Task GueltigeAufgabe_IsValid()
        {
            var dto = new AufgabeErstellenDto
            {
                Titel = "Bericht schreiben",
                Prioritaet = "Hoch",
                Faelligkeitsdatum = DateOnly.FromDateTime(DateTime.Today.AddDays(7))
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.True(result.IsValid);
        }

        [Fact]
        public async Task LeererTitel_IsInvalid()
        {
            var dto = new AufgabeErstellenDto
            {
                Titel = "",
                Prioritaet = "Mittel",
                Faelligkeitsdatum = DateOnly.FromDateTime(DateTime.Today)
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.False(result.IsValid);
        }

        [Theory]
        [InlineData("Hoch")]
        [InlineData("Mittel")]
        [InlineData("Niedrig")]
        public async Task GueltigePrioritaet_IsValid(string prioritaet)
        {
            var dto = new AufgabeErstellenDto
            {
                Titel = "Test",
                Prioritaet = prioritaet,
                Faelligkeitsdatum = DateOnly.FromDateTime(DateTime.Today)
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.True(result.IsValid);
        }

        [Theory]
        [InlineData("")]
        [InlineData("Dringend")]
        [InlineData("Niedrige")]
        public async Task UngueltigePrioritaet_IsInvalid(string prioritaet)
        {
            var dto = new AufgabeErstellenDto
            {
                Titel = "Test",
                Prioritaet = prioritaet,
                Faelligkeitsdatum = DateOnly.FromDateTime(DateTime.Today)
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.False(result.IsValid);
        }

        [Fact]
        public async Task TitelZuLang_IsInvalid()
        {
            var dto = new AufgabeErstellenDto
            {
                Titel = new string('x', 201),
                Prioritaet = "Mittel",
                Faelligkeitsdatum = DateOnly.FromDateTime(DateTime.Today)
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.False(result.IsValid);
        }
    }
}
