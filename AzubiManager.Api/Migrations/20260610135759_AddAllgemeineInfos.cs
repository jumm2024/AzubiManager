using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzubiManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAllgemeineInfos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AllgemeineInfos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Bezeichnung = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Wert = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Sortierung = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AllgemeineInfos", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AllgemeineInfos");
        }
    }
}
