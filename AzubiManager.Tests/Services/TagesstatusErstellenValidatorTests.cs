using AzubiManager.Api.Models.DTOs;
using AzubiManager.Api.Validators;

namespace AzubiManager.Tests.Services
{
    public class TagesstatusErstellenValidatorTests
    {
        private readonly TagesstatusErstellenValidator _validator = new();

        [Fact]
        public async Task VAmB_IsValidStatus()
        {
            var dto = new TagesstatusErstellenDto
            {
                AzubiId = 1,
                Datum = DateOnly.FromDateTime(DateTime.Today),
                Status = "VAmB"
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.True(result.IsValid);
        }

        [Theory]
        [InlineData("Anwesend")]
        [InlineData("Schule")]
        [InlineData("Praktikum")]
        [InlineData("Termin")]
        [InlineData("Urlaub")]
        [InlineData("Krank")]
        [InlineData("Kind krank")]
        [InlineData("VAmB")]
        [InlineData("Freigestellt")]
        [InlineData("Entschuldigt")]
        [InlineData("Unentschuldigt")]
        [InlineData("Ungeklärt")]
        [InlineData("Feiertag")]
        [InlineData("Wochenende")]
        public async Task AlleErlaubtenStatus_SindValide(string status)
        {
            var dto = new TagesstatusErstellenDto
            {
                AzubiId = 1,
                Datum = DateOnly.FromDateTime(DateTime.Today),
                Status = status
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.True(result.IsValid);
        }

        [Theory]
        [InlineData("")]
        [InlineData("Ungültig")]
        [InlineData("Anwesen")]
        [InlineData("VAMB")]
        public async Task UngueltigeStatus_SindInvalide(string status)
        {
            var dto = new TagesstatusErstellenDto
            {
                AzubiId = 1,
                Datum = DateOnly.FromDateTime(DateTime.Today),
                Status = status
            };

            var result = await _validator.ValidateAsync(dto);

            Assert.False(result.IsValid);
        }
    }
}
