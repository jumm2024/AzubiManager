namespace AzubiManager.Api.Models.DTOs
{
    public class AzubiBerichtDto
    {
        public string Name { get; set; } = "";
        public string Gruppe { get; set; } = "";
        public int Lehrjahr { get; set; }
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
        public int GesamtTage { get; set; }
    }
}
