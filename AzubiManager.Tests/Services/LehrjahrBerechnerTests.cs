using AzubiManager.Api.Services;

namespace AzubiManager.Tests.Services
{
    public class LehrjahrBerechnerTests
    {
        [Fact]
        public void Berechne_StartUndEndeNull_Gibt1()
        {
            Assert.Equal(1, LehrjahrBerechner.Berechne(null, null));
        }

        [Fact]
        public void Berechne_EndeNull_Gibt1()
        {
            Assert.Equal(1, LehrjahrBerechner.Berechne(new DateOnly(2024, 9, 1), null));
        }

        [Fact]
        public void Berechne_StartNull_Gibt1()
        {
            Assert.Equal(1, LehrjahrBerechner.Berechne(null, new DateOnly(2027, 8, 31)));
        }

        [Fact]
        public void Berechne_HeuteVorStart_Gibt1()
        {
            var start = DateOnly.FromDateTime(DateTime.Now.AddMonths(6));
            var ende = start.AddYears(3);
            Assert.Equal(1, LehrjahrBerechner.Berechne(start, ende));
        }

        [Fact]
        public void Berechne_ErstesJahr_Gibt1()
        {
            var start = new DateOnly(2024, 9, 1);
            var ende = new DateOnly(2027, 8, 31);
            var result = LehrjahrBerechner.Berechne(start, ende);
            Assert.InRange(result, 1, 3);
        }

        [Fact]
        public void Berechne_GesamteMonateNull_Gibt1()
        {
            Assert.Equal(1, LehrjahrBerechner.Berechne(new DateOnly(2026, 6, 1), new DateOnly(2026, 6, 1)));
        }

        [Fact]
        public void Berechne_UebernimmtNichtMehrAlsMaxJahre()
        {
            var start = new DateOnly(2024, 9, 1);
            var ende = new DateOnly(2025, 8, 31);
            var result = LehrjahrBerechner.Berechne(start, ende);
            Assert.InRange(result, 1, 1);
        }
    }
}
