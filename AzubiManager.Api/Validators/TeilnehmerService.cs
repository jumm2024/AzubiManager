using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace AzubiManager.Api.Services
{
    public class TeilnehmerService
    {
        private readonly AppDbContext _db;
        private readonly CurrentUserService _currentUser;
        private readonly IMemoryCache _cache;

        public TeilnehmerService(AppDbContext db, CurrentUserService currentUser, IMemoryCache cache)
        {
            _db = db;
            _currentUser = currentUser;
            _cache = cache;
        }

        public async Task<List<TeilnehmerDto>> AlleAbrufenAsync(string? gruppe = null, int? skip = null, int? take = null)
        {
            var query = _db.Teilnehmer.AsNoTracking();

            if (!string.IsNullOrEmpty(gruppe))
            {
                if (gruppe == "Ausbildung")
                    query = query.Where(t => t.Gruppe == null || (t.Gruppe != "BVB" && t.Gruppe != "Erprober" && t.Gruppe != "Praktikant"));
                else
                    query = query.Where(t => t.Gruppe == gruppe);
            }

            var betreuteIds = await GetBetreuteIdsAsync();

            var resultQuery = query
                .OrderBy(t => t.Nachname).ThenBy(t => t.Vorname)
                .Select(t => new TeilnehmerDto
                {
                    Id = t.Id,
                    Vorname = t.Vorname,
                    Nachname = t.Nachname,
                    Geburtsdatum = t.Geburtsdatum,
                    Kurs = t.Kurs,
                    Lehrjahr = t.Lehrjahr,
                    Abteilung = t.Abteilung,
                    Gruppe = t.Gruppe,
                    Ausbildungsstart = t.Ausbildungsstart,
                    Ausbildungsende = t.Ausbildungsende,
                    AusbilderId = t.AusbilderId,
                    AusbilderName = t.Ausbilder != null ? t.Ausbilder.Vorname + " " + t.Ausbilder.Nachname : null,
                    IstBetreut = betreuteIds.Contains(t.Id)
                });

            if (skip.HasValue) resultQuery = resultQuery.Skip(skip.Value);
            if (take.HasValue) resultQuery = resultQuery.Take(take.Value);

            return await resultQuery.ToListAsync();
        }

        public async Task<TeilnehmerDto?> EinzelnenAbrufenAsync(int id)
        {
            var t = await _db.Teilnehmer.AsNoTracking().Include(x => x.Ausbilder).FirstOrDefaultAsync(x => x.Id == id);
            if (t == null) return null;

            return new TeilnehmerDto
            {
                Id = t.Id,
                Vorname = t.Vorname,
                Nachname = t.Nachname,
                Geburtsdatum = t.Geburtsdatum,
                Kurs = t.Kurs,
                Lehrjahr = t.Lehrjahr,
                Abteilung = t.Abteilung,
                Gruppe = t.Gruppe,
                Ausbildungsstart = t.Ausbildungsstart,
                Ausbildungsende = t.Ausbildungsende,
                AusbilderId = t.AusbilderId,
                AusbilderName = t.Ausbilder?.Vorname + " " + t.Ausbilder?.Nachname
            };
        }

        public async Task<TeilnehmerDto> ErstellenAsync(TeilnehmerErstellenDto dto)
        {
            var teilnehmer = new Teilnehmer
            {
                Vorname = dto.Vorname,
                Nachname = dto.Nachname,
                Geburtsdatum = dto.Geburtsdatum,
                Kurs = dto.Kurs,
                Lehrjahr = dto.Lehrjahr,
                Abteilung = dto.Abteilung,
                Gruppe = dto.Gruppe,
                Ausbildungsstart = dto.Ausbildungsstart,
                Ausbildungsende = dto.Ausbildungsende,
                AusbilderId = _currentUser.BenutzerId
            };

            _db.Teilnehmer.Add(teilnehmer);
            await _db.SaveChangesAsync();

            _cache.Remove($"betreuteIds_{_currentUser.BenutzerId}");

            return new TeilnehmerDto
            {
                Id = teilnehmer.Id,
                Vorname = teilnehmer.Vorname,
                Nachname = teilnehmer.Nachname,
                Geburtsdatum = teilnehmer.Geburtsdatum,
                Kurs = teilnehmer.Kurs,
                Lehrjahr = teilnehmer.Lehrjahr,
                Abteilung = teilnehmer.Abteilung,
                Gruppe = teilnehmer.Gruppe,
                Ausbildungsstart = teilnehmer.Ausbildungsstart,
                Ausbildungsende = teilnehmer.Ausbildungsende,
                AusbilderId = teilnehmer.AusbilderId
            };
        }

        public async Task<TeilnehmerDto?> AktualisierenAsync(int id, TeilnehmerAktualisierenDto dto)
        {
            var teilnehmer = await _db.Teilnehmer.FindAsync(id);
            if (teilnehmer == null) return null;

            teilnehmer.Vorname = dto.Vorname;
            teilnehmer.Nachname = dto.Nachname;
            teilnehmer.Geburtsdatum = dto.Geburtsdatum;
            teilnehmer.Kurs = dto.Kurs;
            teilnehmer.Lehrjahr = dto.Lehrjahr;
            teilnehmer.Abteilung = dto.Abteilung;
            teilnehmer.Gruppe = dto.Gruppe;
            teilnehmer.Ausbildungsstart = dto.Ausbildungsstart;
            teilnehmer.Ausbildungsende = dto.Ausbildungsende;

            await _db.SaveChangesAsync();

            return new TeilnehmerDto
            {
                Id = teilnehmer.Id,
                Vorname = teilnehmer.Vorname,
                Nachname = teilnehmer.Nachname,
                Geburtsdatum = teilnehmer.Geburtsdatum,
                Kurs = teilnehmer.Kurs,
                Lehrjahr = teilnehmer.Lehrjahr,
                Abteilung = teilnehmer.Abteilung,
                Gruppe = teilnehmer.Gruppe,
                Ausbildungsstart = teilnehmer.Ausbildungsstart,
                Ausbildungsende = teilnehmer.Ausbildungsende,
                AusbilderId = teilnehmer.AusbilderId
            };
        }

        public async Task<bool> LoeschenAsync(int id)
        {
            var teilnehmer = await _db.Teilnehmer.FindAsync(id);
            if (teilnehmer == null) return false;

            _db.Teilnehmer.Remove(teilnehmer);
            await _db.SaveChangesAsync();

            _cache.Remove($"betreuteIds_{_currentUser.BenutzerId}");

            return true;
        }

        public async Task<List<int>> MeineBetreuteIdsAsync()
        {
            return await GetBetreuteIdsAsync();
        }

        public async Task AddBetreuungAsync(int teilnehmerId)
        {
            var existiert = await _db.AzubiBetreuer
                .AnyAsync(ab => ab.TeilnehmerId == teilnehmerId && ab.BenutzerId == _currentUser.BenutzerId);

            if (existiert) return;

            _db.AzubiBetreuer.Add(new AzubiBetreuer
            {
                TeilnehmerId = teilnehmerId,
                BenutzerId = _currentUser.BenutzerId
            });
            await _db.SaveChangesAsync();

            _cache.Remove($"betreuteIds_{_currentUser.BenutzerId}");
        }

        public async Task RemoveBetreuungAsync(int teilnehmerId)
        {
            var eintrag = await _db.AzubiBetreuer
                .FirstOrDefaultAsync(ab => ab.TeilnehmerId == teilnehmerId && ab.BenutzerId == _currentUser.BenutzerId);

            if (eintrag == null) return;

            _db.AzubiBetreuer.Remove(eintrag);
            await _db.SaveChangesAsync();

            _cache.Remove($"betreuteIds_{_currentUser.BenutzerId}");
        }

        private async Task<List<int>> GetBetreuteIdsAsync()
        {
            var cacheKey = $"betreuteIds_{_currentUser.BenutzerId}";

            if (_cache.TryGetValue(cacheKey, out List<int>? cached))
            {
                return cached!;
            }

            var ids = await _db.AzubiBetreuer
                .AsNoTracking()
                .Where(ab => ab.BenutzerId == _currentUser.BenutzerId)
                .Select(ab => ab.TeilnehmerId)
                .ToListAsync();

            _cache.Set(cacheKey, ids, TimeSpan.FromMinutes(5));

            return ids;
        }
    }
}