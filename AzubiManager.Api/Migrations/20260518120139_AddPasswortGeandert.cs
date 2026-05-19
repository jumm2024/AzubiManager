using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzubiManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswortGeandert : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "PasswortGeandert",
                table: "Benutzer",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PasswortGeandert",
                table: "Benutzer");
        }
    }
}
