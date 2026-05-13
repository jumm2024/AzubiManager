using AzubiManager.Api.Models;
using DocumentFormat.OpenXml.InkML;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;

namespace AzubiManager.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Benutzer> Benutzer { get; set; } = null!;
        public DbSet<Teilnehmer> Teilnehmer { get; set; } = null!;
        public DbSet<Tagesstatus> TagesstatusListe { get; set; } = null!;
        public DbSet<Aufgabe> Aufgaben { get; set; } = null!;
        public DbSet<Termin> Termine { get; set; } = null!;
        public DbSet<Notiz> Notizen { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ========== Beziehungen ==========

            // Benutzer -> Teilnehmer (1:n) – ein Ausbilder hat viele Teilnehmer
            modelBuilder.Entity<Teilnehmer>()
                .HasOne(t => t.Ausbilder)
                .WithMany(b => b.Teilnehmer)
                .HasForeignKey(t => t.AusbilderId)
                .OnDelete(DeleteBehavior.SetNull); // Wenn Benutzer gelöscht, Azubi bleibt

            // Teilnehmer -> Tagesstatus (1:n)
            modelBuilder.Entity<Tagesstatus>()
                .HasOne(ts => ts.Azubi)
                .WithMany(t => t.TagesstatusListe)
                .HasForeignKey(ts => ts.AzubiId)
                .OnDelete(DeleteBehavior.Cascade);

            // Teilnehmer -> Aufgabe (1:n) - SetNull
            modelBuilder.Entity<Aufgabe>()
                .HasOne(a => a.Azubi)
                .WithMany(t => t.Aufgaben)
                .HasForeignKey(a => a.AzubiId)
                .OnDelete(DeleteBehavior.SetNull);

            // Teilnehmer -> Termin (1:n) - SetNull
            modelBuilder.Entity<Termin>()
                .HasOne(t => t.Azubi)
                .WithMany(tn => tn.Termine)
                .HasForeignKey(t => t.AzubiId)
                .OnDelete(DeleteBehavior.SetNull);

            // Teilnehmer -> Notiz (1:n) - SetNull
            modelBuilder.Entity<Notiz>()
                .HasOne(n => n.Azubi)
                .WithMany(t => t.Notizen)
                .HasForeignKey(n => n.AzubiId)
                .OnDelete(DeleteBehavior.SetNull);

            // Besitzer-Beziehungen für Aufgaben, Termine, Notizen
            modelBuilder.Entity<Aufgabe>()
                .HasOne(a => a.Ausbilder)
                .WithMany()
                .HasForeignKey(a => a.AusbilderId)
                .OnDelete(DeleteBehavior.Restrict); // Benutzer nicht löschbar, wenn noch Aufgaben

            modelBuilder.Entity<Termin>()
                .HasOne(t => t.Ausbilder)
                .WithMany()
                .HasForeignKey(t => t.AusbilderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Notiz>()
                .HasOne(n => n.Ausbilder)
                .WithMany()
                .HasForeignKey(n => n.AusbilderId)
                .OnDelete(DeleteBehavior.Restrict);

            // ========== Indizes für Performance ==========
            modelBuilder.Entity<Teilnehmer>()
                .HasIndex(t => t.AusbilderId)
                .HasDatabaseName("IX_Teilnehmer_AusbilderId");

            modelBuilder.Entity<Tagesstatus>()
                .HasIndex(ts => new { ts.AzubiId, ts.Datum })
                .HasDatabaseName("IX_Tagesstatus_Azubi_Datum");

            modelBuilder.Entity<Aufgabe>()
                .HasIndex(a => a.AusbilderId)
                .HasDatabaseName("IX_Aufgaben_AusbilderId");

            modelBuilder.Entity<Aufgabe>()
                .HasIndex(a => new { a.AusbilderId, a.Erledigt })
                .HasDatabaseName("IX_Aufgaben_Ausbilder_Erledigt");

            modelBuilder.Entity<Termin>()
                .HasIndex(t => t.AusbilderId)
                .HasDatabaseName("IX_Termine_AusbilderId");

            modelBuilder.Entity<Termin>()
                .HasIndex(t => new { t.AusbilderId, t.Datum })
                .HasDatabaseName("IX_Termine_Ausbilder_Datum");

            modelBuilder.Entity<Notiz>()
                .HasIndex(n => n.AusbilderId)
                .HasDatabaseName("IX_Notizen_AusbilderId");
        }
    }
}
