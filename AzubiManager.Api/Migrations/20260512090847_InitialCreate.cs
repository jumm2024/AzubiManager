using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzubiManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Benutzer",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Benutzername = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PasswortHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Vorname = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Nachname = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Rolle = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ErstelltAm = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Benutzer", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Teilnehmer",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Vorname = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Nachname = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Geburtsdatum = table.Column<DateOnly>(type: "date", nullable: true),
                    Kurs = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Lehrjahr = table.Column<int>(type: "int", nullable: false),
                    Abteilung = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Gruppe = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Ausbildungsstart = table.Column<DateOnly>(type: "date", nullable: false),
                    Ausbildungsende = table.Column<DateOnly>(type: "date", nullable: false),
                    AusbilderId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Teilnehmer", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Teilnehmer_Benutzer_AusbilderId",
                        column: x => x.AusbilderId,
                        principalTable: "Benutzer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Aufgaben",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Titel = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Beschreibung = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Prioritaet = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Faelligkeitsdatum = table.Column<DateOnly>(type: "date", nullable: false),
                    Erledigt = table.Column<bool>(type: "bit", nullable: false),
                    AzubiId = table.Column<int>(type: "int", nullable: true),
                    AusbilderId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Aufgaben", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Aufgaben_Benutzer_AusbilderId",
                        column: x => x.AusbilderId,
                        principalTable: "Benutzer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Aufgaben_Teilnehmer_AzubiId",
                        column: x => x.AzubiId,
                        principalTable: "Teilnehmer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Notizen",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Titel = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Inhalt = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Kategorie = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AzubiId = table.Column<int>(type: "int", nullable: true),
                    AusbilderId = table.Column<int>(type: "int", nullable: false),
                    ErstelltAm = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notizen", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notizen_Benutzer_AusbilderId",
                        column: x => x.AusbilderId,
                        principalTable: "Benutzer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Notizen_Teilnehmer_AzubiId",
                        column: x => x.AzubiId,
                        principalTable: "Teilnehmer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TagesstatusListe",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AzubiId = table.Column<int>(type: "int", nullable: false),
                    Datum = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Bemerkung = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TagesstatusListe", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TagesstatusListe_Teilnehmer_AzubiId",
                        column: x => x.AzubiId,
                        principalTable: "Teilnehmer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Termine",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Titel = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Beschreibung = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Datum = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Endzeit = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Kategorie = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Ort = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AzubiId = table.Column<int>(type: "int", nullable: true),
                    AusbilderId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Termine", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Termine_Benutzer_AusbilderId",
                        column: x => x.AusbilderId,
                        principalTable: "Benutzer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Termine_Teilnehmer_AzubiId",
                        column: x => x.AzubiId,
                        principalTable: "Teilnehmer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Aufgaben_Ausbilder_Erledigt",
                table: "Aufgaben",
                columns: new[] { "AusbilderId", "Erledigt" });

            migrationBuilder.CreateIndex(
                name: "IX_Aufgaben_AusbilderId",
                table: "Aufgaben",
                column: "AusbilderId");

            migrationBuilder.CreateIndex(
                name: "IX_Aufgaben_AzubiId",
                table: "Aufgaben",
                column: "AzubiId");

            migrationBuilder.CreateIndex(
                name: "IX_Notizen_AusbilderId",
                table: "Notizen",
                column: "AusbilderId");

            migrationBuilder.CreateIndex(
                name: "IX_Notizen_AzubiId",
                table: "Notizen",
                column: "AzubiId");

            migrationBuilder.CreateIndex(
                name: "IX_Tagesstatus_Azubi_Datum",
                table: "TagesstatusListe",
                columns: new[] { "AzubiId", "Datum" });

            migrationBuilder.CreateIndex(
                name: "IX_Teilnehmer_AusbilderId",
                table: "Teilnehmer",
                column: "AusbilderId");

            migrationBuilder.CreateIndex(
                name: "IX_Termine_Ausbilder_Datum",
                table: "Termine",
                columns: new[] { "AusbilderId", "Datum" });

            migrationBuilder.CreateIndex(
                name: "IX_Termine_AusbilderId",
                table: "Termine",
                column: "AusbilderId");

            migrationBuilder.CreateIndex(
                name: "IX_Termine_AzubiId",
                table: "Termine",
                column: "AzubiId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Aufgaben");

            migrationBuilder.DropTable(
                name: "Notizen");

            migrationBuilder.DropTable(
                name: "TagesstatusListe");

            migrationBuilder.DropTable(
                name: "Termine");

            migrationBuilder.DropTable(
                name: "Teilnehmer");

            migrationBuilder.DropTable(
                name: "Benutzer");
        }
    }
}
