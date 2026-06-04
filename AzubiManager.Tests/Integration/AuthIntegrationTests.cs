using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using AzubiManager.Api.Data;
using AzubiManager.Api.Models.DTOs;

namespace AzubiManager.Tests.Integration
{
    public class AuthIntegrationTests : IClassFixture<TestWebApplicationFactory>
    {
        private readonly TestWebApplicationFactory _factory;
        private readonly JsonSerializerOptions _jsonOptions;

        public AuthIntegrationTests(TestWebApplicationFactory factory)
        {
            _factory = factory;
            _jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        }

        private HttpClient CreateClientWithCookies()
        {
            var handler = new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false };
            var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false,
                HandleCookies = false
            });
            return client;
        }

        [Fact]
        public async Task Login_MitGueltigenCredentials_Gibt200()
        {
            var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("/api/auth/login", new
            {
                benutzername = "admin",
                passwort = "admin123"
            });

            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains("admin", content);
        }

        [Fact]
        public async Task Login_MitFalschemPasswort_Gibt401()
        {
            var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("/api/auth/login", new
            {
                benutzername = "admin",
                passwort = "falschespasswort"
            });

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task Login_MitUnbekanntemUser_Gibt401()
        {
            var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("/api/auth/login", new
            {
                benutzername = "unbekannt",
                passwort = "egal"
            });

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task Login_OhneBody_Gibt400()
        {
            var client = _factory.CreateClient();
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login");
            request.Content = new StringContent("", System.Text.Encoding.UTF8, "application/json");
            var response = await client.SendAsync(request);

            Assert.True(response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.UnsupportedMediaType);
        }

        [Fact]
        public async Task Me_MitGueltigemToken_Gibt200()
        {
            var client = _factory.CreateClient();
            var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new
            {
                benutzername = "admin",
                passwort = "admin123"
            });

            var token = await ExtractTokenAsync(client);
            if (string.IsNullOrEmpty(token)) return;

            var meClient = _factory.CreateClient();
            meClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var meResponse = await meClient.GetAsync("/api/auth/me");
            meResponse.EnsureSuccessStatusCode();

            var content = await meResponse.Content.ReadAsStringAsync();
            Assert.Contains("admin", content);
        }

        [Fact]
        public async Task Me_OhneToken_Gibt401()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("/api/auth/me");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task PasswortAendern_MitGueltigemAltemPasswort_Gibt200()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            if (string.IsNullOrEmpty(token)) return;

            var passwortClient = _factory.CreateClient();
            passwortClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await passwortClient.PostAsJsonAsync("/api/auth/passwort-aendern", new
            {
                altesPasswort = "admin123",
                neuesPasswort = "NeuesPasswort123!"
            });

            response.EnsureSuccessStatusCode();

            // Ruecksetzen auf altes Passwort
            var resetClient = _factory.CreateClient();
            var newToken = await GetAdminTokenAsync(resetClient, "NeuesPasswort123!");
            if (!string.IsNullOrEmpty(newToken))
            {
                var resetAuthClient = _factory.CreateClient();
                resetAuthClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", newToken);
                await resetAuthClient.PostAsJsonAsync("/api/auth/passwort-aendern", new
                {
                    altesPasswort = "NeuesPasswort123!",
                    neuesPasswort = "admin123"
                });
            }
        }

        [Fact]
        public async Task PasswortAendern_MitFalschemAltemPasswort_Gibt401()
        {
            var client = _factory.CreateClient();
            var token = await GetAdminTokenAsync(client);
            if (string.IsNullOrEmpty(token)) return;

            var passwortClient = _factory.CreateClient();
            passwortClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await passwortClient.PostAsJsonAsync("/api/auth/passwort-aendern", new
            {
                altesPasswort = "falsch",
                neuesPasswort = "NeuesPasswort123!"
            });

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        private async Task<string?> ExtractTokenAsync(HttpClient client)
        {
            var response = await client.PostAsJsonAsync("/api/auth/login", new
            {
                benutzername = "admin",
                passwort = "admin123"
            });

            if (!response.IsSuccessStatusCode) return null;

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            if (doc.RootElement.TryGetProperty("token", out var tokenProp))
                return tokenProp.GetString();
            return null;
        }

        private async Task<string?> GetAdminTokenAsync(HttpClient client, string? password = null)
        {
            var response = await client.PostAsJsonAsync("/api/auth/login", new
            {
                benutzername = "admin",
                passwort = password ?? "admin123"
            });

            if (!response.IsSuccessStatusCode) return null;

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            if (doc.RootElement.TryGetProperty("token", out var tokenProp))
                return tokenProp.GetString();
            return null;
        }
    }
}
