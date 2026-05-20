using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzubiManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddErledigtVonToAufgaben : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ErledigtVonId",
                table: "Aufgaben",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Aufgaben_ErledigtVonId",
                table: "Aufgaben",
                column: "ErledigtVonId");

            migrationBuilder.AddForeignKey(
                name: "FK_Aufgaben_Benutzer_ErledigtVonId",
                table: "Aufgaben",
                column: "ErledigtVonId",
                principalTable: "Benutzer",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Aufgaben_Benutzer_ErledigtVonId",
                table: "Aufgaben");

            migrationBuilder.DropIndex(
                name: "IX_Aufgaben_ErledigtVonId",
                table: "Aufgaben");

            migrationBuilder.DropColumn(
                name: "ErledigtVonId",
                table: "Aufgaben");
        }
    }
}
