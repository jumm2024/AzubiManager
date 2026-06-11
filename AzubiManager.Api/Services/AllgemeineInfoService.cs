using Microsoft.EntityFrameworkCore;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Api.Services
{
    public class AllgemeineInfoService
    {
        private readonly AppDbContext _db;

        public AllgemeineInfoService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<AllgemeineInfoDto>> AlleAbrufenAsync()
        {
            return await _db.AllgemeineInfos
                .AsNoTracking()
                .OrderBy(a => a.Sortierung)
                .Select(a => new AllgemeineInfoDto
                {
                    Id = a.Id,
                    Bezeichnung = a.Bezeichnung,
                    Wert = a.Wert,
                    Sortierung = a.Sortierung
                })
                .ToListAsync();
        }

        public async Task<AllgemeineInfoDto> ErstellenAsync(AllgemeineInfoErstellenDto dto)
        {
            var info = new AllgemeineInfo
            {
                Bezeichnung = dto.Bezeichnung,
                Wert = dto.Wert,
                Sortierung = dto.Sortierung
            };
            _db.AllgemeineInfos.Add(info);
            await _db.SaveChangesAsync();

            return new AllgemeineInfoDto
            {
                Id = info.Id,
                Bezeichnung = info.Bezeichnung,
                Wert = info.Wert,
                Sortierung = info.Sortierung
            };
        }

        public async Task<AllgemeineInfoDto?> AktualisierenAsync(int id, AllgemeineInfoErstellenDto dto)
        {
            var info = await _db.AllgemeineInfos.FindAsync(id);
            if (info == null) return null;

            info.Bezeichnung = dto.Bezeichnung;
            info.Wert = dto.Wert;
            info.Sortierung = dto.Sortierung;

            await _db.SaveChangesAsync();

            return new AllgemeineInfoDto
            {
                Id = info.Id,
                Bezeichnung = info.Bezeichnung,
                Wert = info.Wert,
                Sortierung = info.Sortierung
            };
        }

        public async Task<bool> LoeschenAsync(int id)
        {
            var info = await _db.AllgemeineInfos.FindAsync(id);
            if (info == null) return false;

            _db.AllgemeineInfos.Remove(info);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
