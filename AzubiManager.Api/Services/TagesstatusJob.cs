using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AzubiManager.Api.Services;

public class TagesstatusJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<TagesstatusJob> _logger;

    public TagesstatusJob(IServiceProvider services, ILogger<TagesstatusJob> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Tagesstatus-Hintergrundjob gestartet");

        while (!stoppingToken.IsCancellationRequested)
        {
            var jetzt = DateTime.Now;
            var naechsteAusfuehrung = heuteUm(5, 0);
            if (jetzt > naechsteAusfuehrung)
                naechsteAusfuehrung = naechsteAusfuehrung.AddDays(1);

            var wartezeit = naechsteAusfuehrung - jetzt;
            _logger.LogInformation("Nächste Ausführung um {Zeit} (in {Minuten} Minuten)",
                naechsteAusfuehrung.ToString("dd.MM.yyyy HH:mm"), (int)wartezeit.TotalMinutes);

            await Task.Delay(wartezeit, stoppingToken);
            if (stoppingToken.IsCancellationRequested) break;

            await AktualisiereHeuteAsync(stoppingToken);
        }
    }

    private static DateTime heuteUm(int stunde, int minute)
    {
        var jetzt = DateTime.Now;
        return new DateTime(jetzt.Year, jetzt.Month, jetzt.Day, stunde, minute, 0);
    }

    private async Task AktualisiereHeuteAsync(CancellationToken ct)
    {
        try
        {
            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
            var datei = Directory.GetFiles(uploadsDir, "*.xlsx").OrderByDescending(f => f).FirstOrDefault();
            if (datei == null) { _logger.LogWarning("Keine Excel-Datei in uploads/ gefunden"); return; }

            _logger.LogInformation("Lade {Datei} für tägliches Update", datei);
            var data = await File.ReadAllBytesAsync(datei, ct);

            using var scope = _services.CreateScope();
            var service = scope.ServiceProvider.GetRequiredService<TagesstatusService>();
            var imported = await service.ExcelImportAsync(data, DateTime.Now.Year, DateTime.Now.Month);
            _logger.LogInformation("Tägliches Update: {Count} Einträge aktualisiert/importiert", imported);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fehler beim täglichen Tagesstatus-Update");
        }
    }
}
