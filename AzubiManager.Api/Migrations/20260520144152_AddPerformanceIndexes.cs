using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzubiManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Termine_Datum",
                table: "Termine",
                column: "Datum");

            migrationBuilder.CreateIndex(
                name: "IX_Notizen_ErstelltAm",
                table: "Notizen",
                column: "ErstelltAm");

            migrationBuilder.CreateIndex(
                name: "IX_Benutzer_Benutzername",
                table: "Benutzer",
                column: "Benutzername",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Termine_Datum",
                table: "Termine");

            migrationBuilder.DropIndex(
                name: "IX_Notizen_ErstelltAm",
                table: "Notizen");

            migrationBuilder.DropIndex(
                name: "IX_Benutzer_Benutzername",
                table: "Benutzer");
        }
    }
}
