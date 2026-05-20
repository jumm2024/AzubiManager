namespace AzubiManager.Api.Models.DTOs
{
    public class DashboardDto
    {
        // Status-Statistik für heute
        public int Anwesend { get; set; }
        public int Schule { get; set; }
        public int Praktikum { get; set; }
        public int Termin { get; set; }
        public int Urlaub { get; set; }
        public int Krank { get; set; }
        public int KindKrank { get; set; }
        public int Freigestellt { get; set; }
        public int Entschuldigt { get; set; }
        public int Unentschuldigt { get; set; }
        public int Ungeklaert { get; set; }

        // Aufgaben
        public int OffeneAufgaben { get; set; }
        public int UeberfaelligeAufgaben { get; set; }
        public List<AufgabeDto> AufgabenHeute { get; set; } = new();

        // Badges
        public int RoterBadge { get; set; }
        public int OrangerBadge { get; set; }
        public int PinkerBadge { get; set; }

        // Sonstiges
        public int StatusFehlt { get; set; }
        public int TeilnehmerGesamt { get; set; }
        public int BetreuteTeilnehmer { get; set; }
    }
}