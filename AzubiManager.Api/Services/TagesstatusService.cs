using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;
using ClosedXML.Excel;

namespace AzubiManager.Api.Services
{
    public class TagesstatusService
    {
        private readonly AppDbContext _db;
        private readonly CurrentUserService _currentUser;

        public TagesstatusService(AppDbContext db, CurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Alle Status für ein bestimmtes Datum abrufen
        /// </summary>
        public async Task<List<TagesstatusDto>> AlleFuerDatumAsync(DateOnly datum)
        {
            var query = _db.TagesstatusListe
                .AsNoTracking()
                .Where(s => s.Datum == datum);

            // Datenisolation
            if (!_currentUser.IstAdmin)
                query = query.Where(s => s.Azubi.AusbilderId == _currentUser.BenutzerId);

            return await query
                .OrderBy(s => s.Azubi.Nachname).ThenBy(s => s.Azubi.Vorname)
                .Select(s => new TagesstatusDto
                {
                    Id = s.Id,
                    AzubiId = s.AzubiId,
                    AzubiName = s.Azubi.Vorname + " " + s.Azubi.Nachname,
                    Datum = s.Datum,
                    Status = s.Status,
                    Bemerkung = s.Bemerkung
                }).ToListAsync();
        }

        /// <summary>
        /// Status setzen oder aktualisieren (Upsert)
        /// </summary>
        public async Task<TagesstatusDto> SetzenAsync(TagesstatusErstellenDto dto)
        {
            // Prüfen, ob Teilnehmer existiert und Zugriff erlaubt
            var azubi = await _db.Teilnehmer
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == dto.AzubiId);

            if (azubi == null)
                throw new KeyNotFoundException("Teilnehmer nicht gefunden");

            if (!_currentUser.IstAdmin && azubi.AusbilderId != _currentUser.BenutzerId)
                throw new UnauthorizedAccessException("Keine Berechtigung");

            // Existierenden Eintrag für Azubi + Datum suchen
            var status = await _db.TagesstatusListe
                .FirstOrDefaultAsync(s => s.AzubiId == dto.AzubiId && s.Datum == dto.Datum);

            if (status != null)
            {
                // Update
                status.Status = dto.Status;
                status.Bemerkung = dto.Bemerkung;
            }
            else
            {
                // Neu erstellen
                status = new Tagesstatus
                {
                    AzubiId = dto.AzubiId,
                    Datum = dto.Datum,
                    Status = dto.Status,
                    Bemerkung = dto.Bemerkung
                };
                _db.TagesstatusListe.Add(status);
            }

            await _db.SaveChangesAsync();

            return new TagesstatusDto
            {
                Id = status.Id,
                AzubiId = status.AzubiId,
                AzubiName = azubi.Vorname + " " + azubi.Nachname,
                Datum = status.Datum,
                Status = status.Status,
                Bemerkung = status.Bemerkung
            };
        }

        private static readonly Dictionary<string, string> StatusMapping = new(StringComparer.OrdinalIgnoreCase)
        {
            ["A"] = "Anwesend",
            ["S"] = "Schule",
            ["P"] = "Praktikum",
            ["T"] = "Termin",
            ["U"] = "Urlaub",
            ["K"] = "Krank",
            ["KK"] = "Kind krank",
            ["FD"] = "Freigestellt",
            ["FE"] = "Entschuldigt",
            ["FU"] = "Unentschuldigt",
        };

        private static string MapStatus(string? raw)
        {
            if (string.IsNullOrEmpty(raw)) return "";
            return StatusMapping.TryGetValue(raw.Trim(), out var mapped) ? mapped : "";
        }

        /// <summary>
        /// Excel-Import: Überschreibt alle Status für den Monat
        /// </summary>
        public async Task<int> ExcelImportAsync(byte[] fileData)
        {
            using var stream = new MemoryStream(fileData);
            using var workbook = new XLWorkbook(stream);
            var ws = workbook.Worksheet(1);

            var ersteZeile = ws.Row(1);
            Console.WriteLine($"=== Excel Import ===");
            Console.WriteLine($"Erste Zelle A1: '{ersteZeile.Cell(1).GetString()}'");

            // Spalten-Header parsen: "Fr. 1", "Sa. 2", ... → Tag-Nummer extrahieren
            var tage = new List<(int Col, int Tag)>();
            for (int col = 1; col <= ersteZeile.LastCellUsed().Address.ColumnNumber; col++)
            {
                var zellenwert = ersteZeile.Cell(col).GetString().Trim();
                Console.WriteLine($"Spalte {col}: '{zellenwert}'");
                // Extrahiere Zahl aus z.B. "Fr. 1", "Mo. 11", "1"
                var match = System.Text.RegularExpressions.Regex.Match(zellenwert, @"\b(\d{1,2})\b");
                if (match.Success)
                {
                    var tag = int.Parse(match.Groups[1].Value);
                    if (tag >= 1 && tag <= 31)
                        tage.Add((col, tag));
                }
            }

            if (tage.Count == 0) return 0;

            // Monat/Jahr ermitteln (aus dem Datepicker oder aktuell)
            var monat = DateTime.Now.Month;
            var jahr = DateTime.Now.Year;

            Console.WriteLine($"Gefundene Tage: {tage.Count} (Monat {monat}/{jahr})");
            Console.WriteLine($"Erste Tag-Spalte: {tage[0].Col}, Letzte: {tage[^1].Col}");

            var imported = 0;

            var alleAzubis = await _db.Teilnehmer.AsNoTracking().ToListAsync();

            var lastRow = ws.LastRowUsed();
            for (int row = 2; lastRow != null && row <= lastRow.RowNumber(); row++)
            {
                var nameZelle = ws.Cell(row, 1).GetString().Trim();
                if (string.IsNullOrEmpty(nameZelle)) continue;

                // Geburtsdatum entfernen: "Dillner, Louis Robin *24.10.2007" -> "Dillner, Louis Robin"
                var sternIdx = nameZelle.IndexOf(" *");
                if (sternIdx > 0) nameZelle = nameZelle[..sternIdx].Trim();

                Teilnehmer? azubi = null;

                // Format 1: "Nachname, Vorname"
                if (nameZelle.Contains(','))
                {
                    var teile = nameZelle.Split(',');
                    var nachname = teile[0].Trim();
                    var vorname = teile.Length > 1 ? teile[1].Trim() : "";
                    azubi = alleAzubis.FirstOrDefault(a =>
                        a.Nachname.Equals(nachname, StringComparison.OrdinalIgnoreCase) &&
                        a.Vorname.Equals(vorname, StringComparison.OrdinalIgnoreCase));
                }

                // Format 2: "Vorname Nachname"
                if (azubi == null)
                {
                    var teile = nameZelle.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (teile.Length >= 2)
                    {
                        var vorname = teile[0];
                        var nachname = string.Join(" ", teile.Skip(1));
                        azubi = alleAzubis.FirstOrDefault(a =>
                            a.Vorname.Equals(vorname, StringComparison.OrdinalIgnoreCase) &&
                            a.Nachname.Equals(nachname, StringComparison.OrdinalIgnoreCase));
                    }
                }

                // Format 3: genauer String-Match "Vorname Nachname"
                if (azubi == null)
                {
                    azubi = alleAzubis.FirstOrDefault(a =>
                        (a.Vorname + " " + a.Nachname).Equals(nameZelle, StringComparison.OrdinalIgnoreCase) ||
                        (a.Nachname + " " + a.Vorname).Equals(nameZelle, StringComparison.OrdinalIgnoreCase));
                }

                if (azubi == null)
                {
                    // Automatisch anlegen – Gruppe aus Spalte "Kurs" (Col 2)
                    var kursWert = ws.Cell(row, 2).GetString().Trim();
                    if (kursWert.Length > 50) kursWert = kursWert[..50];
                    var nameTeile = nameZelle.Split(',');
                    var nnachname = nameTeile[0].Trim();
                    var nvorname = nameTeile.Length > 1 ? nameTeile[1].Trim() : nameZelle;
                        // Buchungsbeginn/-ende aus Spalten 3 und 4
                    DateOnly buchStart = default, buchEnde = default;
                    var cell3 = ws.Cell(row, 3);
                    var cell4 = ws.Cell(row, 4);
                    var datStr3 = cell3.GetString().Trim();
                    var datStr4 = cell4.GetString().Trim();

                    // Excel serial date number
                    if (cell3.Value.IsNumber) { var serial = (int)cell3.Value.GetNumber(); buchStart = DateOnly.FromDateTime(new DateTime(1900, 1, 1).AddDays(serial - 2)); }
                    if (cell4.Value.IsNumber) { var serial = (int)cell4.Value.GetNumber(); buchEnde = DateOnly.FromDateTime(new DateTime(1900, 1, 1).AddDays(serial - 2)); }

                // Remove trailing time if present: "09/02/2025 00:00:00" -> "09/02/2025"
                var datStr3c = datStr3.Contains(' ') ? datStr3[..datStr3.IndexOf(' ')] : datStr3;
                var datStr4c = datStr4.Contains(' ') ? datStr4[..datStr4.IndexOf(' ')] : datStr4;
                var buchFormats = new[] { "MM/dd/yyyy", "M/dd/yyyy", "MM/d/yyyy", "M/d/yyyy", "dd.MM.yyyy", "dd.MM.yy", "yyyy-MM-dd", "d.M.yyyy", "d.M.yy" };
                if (buchStart == default) DateOnly.TryParseExact(datStr3c, buchFormats, null, System.Globalization.DateTimeStyles.None, out buchStart);
                if (buchEnde == default) DateOnly.TryParseExact(datStr4c, buchFormats, null, System.Globalization.DateTimeStyles.None, out buchEnde);
                    Console.WriteLine($"Buchungsdaten Row{row}: raw={cell3.Value}/{cell4.Value} str='{datStr3}'/'{datStr4}' parsed={buchStart}/{buchEnde}");

                    // Gruppe abkürzen und Lehrjahr berechnen
                    var importGruppe = !string.IsNullOrEmpty(kursWert) && kursWert != "Kurs" ? kursWert : "Ausbildung";
                    if (importGruppe.StartsWith("Fachinformatiker", StringComparison.OrdinalIgnoreCase)) importGruppe = "Ausbildung";
                    else if (importGruppe.StartsWith("BvB", StringComparison.OrdinalIgnoreCase)) importGruppe = "BVB";

                    Console.WriteLine($"Neu: BuBeginn={buchStart}, BuEnde={buchEnde}");
                    var importLehrjahr = 1;
                    if (buchStart != default && buchEnde != default && buchEnde > buchStart)
                    {
                    var gesamtTage = (buchEnde.ToDateTime(TimeOnly.MinValue) - buchStart.ToDateTime(TimeOnly.MinValue)).TotalDays;
                    var vergangenTage = (DateTime.Now - buchStart.ToDateTime(TimeOnly.MinValue)).TotalDays;
                    var maxJahre = Math.Max(1, (int)Math.Round(gesamtTage / 365.0));
                    importLehrjahr = Math.Max(1, Math.Min(maxJahre, (int)(vergangenTage / gesamtTage * maxJahre) + 1));
                        Console.WriteLine($"Gesamt={gesamtTage}, Vergangen={vergangenTage} -> Lehrjahr={importLehrjahr}");
                    }
                    else Console.WriteLine($"Lehrjahr=1 (keine gueltigen Daten)");

                    azubi = new Teilnehmer
                    {
                        Vorname = nvorname,
                        Nachname = nnachname,
                        Gruppe = importGruppe,
                        Lehrjahr = importLehrjahr,
                        Ausbildungsstart = buchStart,
                        Ausbildungsende = buchEnde,
                        AusbilderId = _currentUser.BenutzerId
                    };
                    _db.Teilnehmer.Add(azubi);
                    await _db.SaveChangesAsync();
                    Console.WriteLine($"Neuer Teilnehmer angelegt: {nvorname} {nnachname} (Gruppe: {azubi.Gruppe})");
                }

                // Gruppe und Daten aus Excel aktualisieren
                var kursWert2 = ws.Cell(row, 2).GetString().Trim();
                if (kursWert2.Length > 50) kursWert2 = kursWert2[..50];
                DateOnly buchStart2 = default, buchEnde2 = default;
                var cell3b = ws.Cell(row, 3);
                var cell4b = ws.Cell(row, 4);
                var datStr3b = cell3b.GetString().Trim();
                var datStr4b = cell4b.GetString().Trim();
                Console.WriteLine($"Update: {nameZelle} - raw3='{cell3b.Value}' raw4='{cell4b.Value}' str3='{datStr3b}' str4='{datStr4b}'");

                var importGruppe2 = kursWert2;
                if (importGruppe2.StartsWith("Fachinformatiker", StringComparison.OrdinalIgnoreCase)) importGruppe2 = "Ausbildung";
                else if (importGruppe2.StartsWith("BvB", StringComparison.OrdinalIgnoreCase)) importGruppe2 = "BVB";

                if (cell3b.Value.IsNumber) { var serial = (int)cell3b.Value.GetNumber(); buchStart2 = DateOnly.FromDateTime(new DateTime(1900, 1, 1).AddDays(serial - 2)); }
                if (cell4b.Value.IsNumber) { var serial = (int)cell4b.Value.GetNumber(); buchEnde2 = DateOnly.FromDateTime(new DateTime(1900, 1, 1).AddDays(serial - 2)); }

                var datStr3d = datStr3b.Contains(' ') ? datStr3b[..datStr3b.IndexOf(' ')] : datStr3b;
                var datStr4d = datStr4b.Contains(' ') ? datStr4b[..datStr4b.IndexOf(' ')] : datStr4b;
                var buchFormats2 = new[] { "MM/dd/yyyy", "M/dd/yyyy", "MM/d/yyyy", "M/d/yyyy", "dd.MM.yyyy", "dd.MM.yy", "yyyy-MM-dd", "d.M.yyyy", "d.M.yy" };
                if (buchStart2 == default) DateOnly.TryParseExact(datStr3d, buchFormats2, null, System.Globalization.DateTimeStyles.None, out buchStart2);
                if (buchEnde2 == default) DateOnly.TryParseExact(datStr4d, buchFormats2, null, System.Globalization.DateTimeStyles.None, out buchEnde2);
                var importLehrjahr2 = 1;
                if (buchStart2 != default && buchEnde2 != default && buchEnde2 > buchStart2)
                {
                    var gesamtTage2 = (buchEnde2.ToDateTime(TimeOnly.MinValue) - buchStart2.ToDateTime(TimeOnly.MinValue)).TotalDays;
                    var vergangenTage2 = (DateTime.Now - buchStart2.ToDateTime(TimeOnly.MinValue)).TotalDays;
                    var maxJahre2 = Math.Max(1, (int)Math.Round(gesamtTage2 / 365.0));
                    importLehrjahr2 = Math.Max(1, Math.Min(maxJahre2, (int)(vergangenTage2 / gesamtTage2 * maxJahre2) + 1));
                    Console.WriteLine($"  Gesamt={gesamtTage2}, Vergangen={vergangenTage2} -> Lehrjahr={importLehrjahr2}");
                }

                if (!string.IsNullOrEmpty(importGruppe2) && importGruppe2 != "Kurs" || buchStart2 != default || buchEnde2 != default)
                {
                    var dbAzubi = await _db.Teilnehmer.FindAsync(azubi.Id);
                    if (dbAzubi != null)
                    {
                        if (!string.IsNullOrEmpty(importGruppe2) && importGruppe2 != "Kurs") dbAzubi.Gruppe = importGruppe2;
                        dbAzubi.Lehrjahr = importLehrjahr2;
                        if (buchStart2 != default) dbAzubi.Ausbildungsstart = buchStart2;
                        if (buchEnde2 != default) dbAzubi.Ausbildungsende = buchEnde2;
                    }
                }

                Console.WriteLine($"Match: {azubi.Vorname} {azubi.Nachname} (Gruppe: {azubi.Gruppe})");
                foreach (var (col, tag) in tage)
                {
                    var statusRaw = ws.Cell(row, col).GetString().Trim();
                    var statusWert = MapStatus(statusRaw);
                    if (string.IsNullOrEmpty(statusWert)) continue;

                    var datum = new DateOnly(jahr, monat, tag);
                    var existing = await _db.TagesstatusListe
                        .FirstOrDefaultAsync(s => s.AzubiId == azubi.Id && s.Datum == datum);

                    if (existing != null)
                        existing.Status = statusWert;
                    else
                        _db.TagesstatusListe.Add(new Tagesstatus
                        {
                            AzubiId = azubi.Id,
                            Datum = datum,
                            Status = statusWert,
                        });

                    imported++;
                }
            }

            await _db.SaveChangesAsync();
            Console.WriteLine($"Import fertig: {imported} Eintraege");
            return imported;
        }

        /// <summary>
        /// Excel-Export für einen ganzen Monat
        /// </summary>
        public async Task<byte[]> ExcelExportAsync(int year, int month)
        {
            var tage = DateTime.DaysInMonth(year, month);
            var start = new DateOnly(year, month, 1);
            var ende = new DateOnly(year, month, tage);

            IQueryable<Teilnehmer> azubiQuery = _db.Teilnehmer.AsNoTracking();

            if (!_currentUser.IstAdmin)
                azubiQuery = azubiQuery.Where(a => a.AusbilderId == _currentUser.BenutzerId);

            var azubis = await azubiQuery
                .OrderBy(a => a.Nachname).ThenBy(a => a.Vorname)
                .ToListAsync();

            var statusListe = await _db.TagesstatusListe
                .AsNoTracking()
                .Where(s => s.Datum >= start && s.Datum <= ende)
                .ToListAsync();

            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("Tagesstatus");

            // Header: Name | Tag 1 | Tag 2 | ... | Tag N
            ws.Cell(1, 1).Value = "Name";
            for (int tag = 1; tag <= tage; tag++)
            {
                var datum = new DateOnly(year, month, tag);
                ws.Cell(1, tag + 1).Value = datum.ToString("dd.MM.");
                ws.Cell(1, tag + 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }

            // Daten
            for (int i = 0; i < azubis.Count; i++)
            {
                var azubi = azubis[i];
                ws.Cell(i + 2, 1).Value = $"{azubi.Nachname}, {azubi.Vorname}";
                ws.Cell(i + 2, 1).Style.Font.Bold = true;

                for (int tag = 1; tag <= tage; tag++)
                {
                    var datum = new DateOnly(year, month, tag);
                    var status = statusListe.FirstOrDefault(s => s.AzubiId == azubi.Id && s.Datum == datum);
                    if (status != null)
                    {
                        ws.Cell(i + 2, tag + 1).Value = status.Status;
                        ws.Cell(i + 2, tag + 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    }
                }
            }

            // Formatierung
            ws.Columns().AdjustToContents();
            var headerRange = ws.Range(1, 1, 1, tage + 1);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        /// <summary>
        /// Azubi-Bericht als Excel-Export mit Status-Zusammenfassung
        /// </summary>
        public async Task<byte[]> AzubiBerichtExportAsync(int year, int month)
        {
            var tage = DateTime.DaysInMonth(year, month);
            var start = new DateOnly(year, month, 1);
            var ende = new DateOnly(year, month, tage);

            IQueryable<Teilnehmer> azubiQuery = _db.Teilnehmer.AsNoTracking();

            if (!_currentUser.IstAdmin)
                azubiQuery = azubiQuery.Where(a => a.AusbilderId == _currentUser.BenutzerId);

            var azubis = await azubiQuery
                .OrderBy(a => a.Nachname).ThenBy(a => a.Vorname)
                .ToListAsync();

            var statusListe = await _db.TagesstatusListe
                .AsNoTracking()
                .Where(s => s.Datum >= start && s.Datum <= ende)
                .ToListAsync();

            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("Azubi-Bericht");

            // Header
            var header = new[] { "Name", "Gruppe", "LJ", "Anwesend", "Schule", "Praktikum", "Termin", "Urlaub", "Krank", "Kind krank", "Freigestellt", "Entschuldigt", "Unentschuldigt", "Ungeklärt", "Gesamt" };
            for (int i = 0; i < header.Length; i++)
            {
                ws.Cell(1, i + 1).Value = header[i];
                ws.Cell(1, i + 1).Style.Font.Bold = true;
                ws.Cell(1, i + 1).Style.Fill.BackgroundColor = XLColor.LightGray;
                ws.Cell(1, i + 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }

            // Daten
            for (int i = 0; i < azubis.Count; i++)
            {
                var azubi = azubis[i];
                var azubiStatus = statusListe.Where(s => s.AzubiId == azubi.Id).ToList();

                ws.Cell(i + 2, 1).Value = $"{azubi.Nachname}, {azubi.Vorname}";
                ws.Cell(i + 2, 2).Value = azubi.Gruppe ?? "";
                ws.Cell(i + 2, 3).Value = azubi.Lehrjahr;
                ws.Cell(i + 2, 4).Value = azubiStatus.Count(s => s.Status == "Anwesend");
                ws.Cell(i + 2, 5).Value = azubiStatus.Count(s => s.Status == "Schule");
                ws.Cell(i + 2, 6).Value = azubiStatus.Count(s => s.Status == "Praktikum");
                ws.Cell(i + 2, 7).Value = azubiStatus.Count(s => s.Status == "Termin");
                ws.Cell(i + 2, 8).Value = azubiStatus.Count(s => s.Status == "Urlaub");
                ws.Cell(i + 2, 9).Value = azubiStatus.Count(s => s.Status == "Krank");
                ws.Cell(i + 2, 10).Value = azubiStatus.Count(s => s.Status == "Kind krank");
                ws.Cell(i + 2, 11).Value = azubiStatus.Count(s => s.Status == "Freigestellt");
                ws.Cell(i + 2, 12).Value = azubiStatus.Count(s => s.Status == "Entschuldigt");
                ws.Cell(i + 2, 13).Value = azubiStatus.Count(s => s.Status == "Unentschuldigt");
                ws.Cell(i + 2, 14).Value = azubiStatus.Count(s => s.Status == "Ungeklärt");
                ws.Cell(i + 2, 15).Value = azubiStatus.Count;
            }

            ws.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        /// <summary>
        /// Status für ein Datum + Azubi löschen
        /// </summary>
        public async Task<bool> LoeschenAsync(int id)
        {
            var status = await _db.TagesstatusListe
                .Include(s => s.Azubi)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (status == null) return false;

            if (!_currentUser.IstAdmin && status.Azubi.AusbilderId != _currentUser.BenutzerId)
                throw new UnauthorizedAccessException();

            _db.TagesstatusListe.Remove(status);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}