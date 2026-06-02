using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Validators;

namespace AzubiManager.Tests.Services
{
    public class TeilnehmerErstellenValidatorTests
    {
        private readonly TeilnehmerErstellenValidator _validator = new();

        [Fact]
        public async Task GueltigerTeilnehmer_IsValid()
        {
            var dto = new TeilnehmerErstellenDto
            {
                Vorname = "Max",
                Nachname = "Mustermann",
                Gruppe = "Ausbildung",
                Lehrjahr = 1,
                Ausbildungsstart = new DateOnly(2024, 9, 1),
                Ausbildungsende = new DateOnly(2027, 8, 31)
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.True(result.IsValid);
        }

        [Fact]
        public async Task LeererVorname_IsInvalid()
        {
            var dto = new TeilnehmerErstellenDto
            {
                Vorname = "",
                Nachname = "Mustermann",
                Gruppe = "Ausbildung",
                Lehrjahr = 1
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.False(result.IsValid);
        }

        [Fact]
        public async Task LeererNachname_IsInvalid()
        {
            var dto = new TeilnehmerErstellenDto
            {
                Vorname = "Max",
                Nachname = "",
                Gruppe = "Ausbildung",
                Lehrjahr = 1
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.False(result.IsValid);
        }

        [Theory]
        [InlineData("Ausbildung")]
        [InlineData("BVB")]
        [InlineData("Erprober")]
        [InlineData("Praktikant")]
        public async Task GueltigeGruppe_IsValid(string gruppe)
        {
            var dto = new TeilnehmerErstellenDto
            {
                Vorname = "Max",
                Nachname = "Muster",
                Gruppe = gruppe,
                Lehrjahr = gruppe == "Ausbildung" ? 1 : 0
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.True(result.IsValid);
        }

        [Theory]
        [InlineData("")]
        [InlineData("Invalid")]
        public async Task UngueltigeGruppe_IsInvalid(string gruppe)
        {
            var dto = new TeilnehmerErstellenDto
            {
                Vorname = "Max",
                Nachname = "Muster",
                Gruppe = gruppe
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.False(result.IsValid);
        }

        [Theory]
        [InlineData("Ausbildung", 0)]
        [InlineData("Ausbildung", 5)]
        public async Task UngueltigesLehrjahr_FuerAusbildung_IsInvalid(string gruppe, int lehrjahr)
        {
            var dto = new TeilnehmerErstellenDto
            {
                Vorname = "Max",
                Nachname = "Muster",
                Gruppe = gruppe,
                Lehrjahr = lehrjahr
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.False(result.IsValid);
        }

        [Theory]
        [InlineData("BVB", 1)]
        [InlineData("Erprober", 2)]
        public async Task LehrjahrGroesser0_FuerNichtAusbildung_IsInvalid(string gruppe, int lehrjahr)
        {
            var dto = new TeilnehmerErstellenDto
            {
                Vorname = "Max",
                Nachname = "Muster",
                Gruppe = gruppe,
                Lehrjahr = lehrjahr
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.False(result.IsValid);
        }

        [Fact]
        public async Task AusbildungsendeVorStart_IsInvalid()
        {
            var dto = new TeilnehmerErstellenDto
            {
                Vorname = "Max",
                Nachname = "Muster",
                Gruppe = "Ausbildung",
                Lehrjahr = 1,
                Ausbildungsstart = new DateOnly(2027, 9, 1),
                Ausbildungsende = new DateOnly(2024, 8, 31)
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.False(result.IsValid);
        }
    }
}
