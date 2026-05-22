namespace AzubiManager.Api.Services
{
    public static class LehrjahrBerechner
    {
        public static int Berechne(DateOnly? start, DateOnly? ende)
        {
            if (start == null || ende == null) return 1;

            var heute = DateOnly.FromDateTime(DateTime.Now);

            if (heute < start) return 1;

            var gesamteMonate = ((ende.Value.Year - start.Value.Year) * 12) + (ende.Value.Month - start.Value.Month);
            var vergangeneMonate = ((heute.Year - start.Value.Year) * 12) + (heute.Month - start.Value.Month);

            if (gesamteMonate <= 0) return 1;

            var maxJahre = Math.Max(1, (int)Math.Ceiling(gesamteMonate / 12.0));
            var aktuellesJahr = Math.Max(1, (vergangeneMonate / 12) + 1);

            return Math.Min(aktuellesJahr, maxJahre);
        }
    }
}
