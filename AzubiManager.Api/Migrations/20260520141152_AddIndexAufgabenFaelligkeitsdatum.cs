using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzubiManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIndexAufgabenFaelligkeitsdatum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Aufgaben_Faelligkeitsdatum",
                table: "Aufgaben",
                column: "Faelligkeitsdatum");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Aufgaben_Faelligkeitsdatum",
                table: "Aufgaben");
        }
    }
}
