using AzubiManager.Api.Data;
using AzubiManager.Api.Services;
using AzubiManager.Api.Validators;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 0. KONFIGURATION AUS UMGEBUNGSVARIABLEN LADEN (für Docker)
// ==========================================
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
    if (!string.IsNullOrEmpty(connectionString))
    {
        builder.Configuration["ConnectionStrings:DefaultConnection"] = connectionString;
    }
    else
    {
        throw new InvalidOperationException("Kein ConnectionString gefunden! Setze ConnectionStrings__DefaultConnection als Umgebungsvariable.");
    }
}

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrEmpty(jwtKey))
{
    jwtKey = Environment.GetEnvironmentVariable("Jwt__Key");
    if (!string.IsNullOrEmpty(jwtKey))
    {
        builder.Configuration["Jwt:Key"] = jwtKey;
        builder.Configuration["Jwt:Issuer"] = Environment.GetEnvironmentVariable("Jwt__Issuer") ?? "AzubiManager";
        builder.Configuration["Jwt:Audience"] = Environment.GetEnvironmentVariable("Jwt__Audience") ?? "AzubiManagerUsers";
    }
    else
    {
        throw new InvalidOperationException("JWT-Key nicht konfiguriert!");
    }
}

// ==========================================
// 1. DATENBANK (Connection Pooling für 1000 User)
// ==========================================
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorNumbersToAdd: null)));

// ==========================================
// 2. JWT-AUTHENTIFIZIERUNG (30 Min Lifetime für Sicherheit)
// ==========================================
var finalJwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT-Key fehlt");
var key = Encoding.UTF8.GetBytes(finalJwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (string.IsNullOrEmpty(context.Token) && context.Request.Cookies.ContainsKey("token"))
            {
                context.Token = context.Request.Cookies["token"];
            }
            return Task.CompletedTask;
        }
    };
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.Zero
    };
});

// ==========================================
// 3. EIGENE SERVICES REGISTRIEREN
// ==========================================
builder.Services.AddScoped<AuthService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<CurrentUserService>();

// Teilnehmer
builder.Services.AddScoped<TeilnehmerService>();
builder.Services.AddScoped<TeilnehmerErstellenValidator>();
builder.Services.AddScoped<TeilnehmerAktualisierenValidator>();

// Tagesstatus
builder.Services.AddScoped<TagesstatusService>();
builder.Services.AddScoped<TagesstatusErstellenValidator>();

// Aufgaben
builder.Services.AddScoped<AufgabeService>();
builder.Services.AddScoped<AufgabeErstellenValidator>();

// Termine
builder.Services.AddScoped<TerminService>();

// Notizen
builder.Services.AddScoped<NotizService>();

// Dashboard
builder.Services.AddScoped<DashboardService>();

// Hintergrund-Job für tägliches Tagesstatus-Update
builder.Services.AddHostedService<TagesstatusJob>();

// ==========================================
// 4. IMemoryCache für Performance (1000 User)
// ==========================================
builder.Services.AddMemoryCache();

// ==========================================
// 5. RATE LIMITING (Schutz vor Überlastung)
// ==========================================
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("fixed", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 10;
    });
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 2;
    });
});

// ==========================================
// 6. RESPONSE COMPRESSION
// ==========================================
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

// ==========================================
// 7. HEALTH CHECKS
// ==========================================
builder.Services.AddHealthChecks();

// ==========================================
// 8. CONTROLLER & JSON-KONFIGURATION
// ==========================================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// ==========================================
// 9. SWAGGER MIT JWT-UNTERSTÜTZUNG
// ==========================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "AzubiManager API",
        Version = "v1",
        Description = "API zur Verwaltung von Auszubildenden, Aufgaben, Terminen und Notizen."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT-Token hier einfügen: <strong>Bearer {token}</strong>",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new List<string>()
        }
    });
});

// ==========================================
// 10. CORS
// ==========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ==========================================
// 11. APPLICATION BUILD
// ==========================================
var app = builder.Build();

// ==========================================
// 12. MIDDLEWARE-PIPELINE
// ==========================================
app.UseResponseCompression();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "AzubiManager API v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

// ==========================================
// 13. DATENBANK-MIGRATION & SEED-DATEN
// ==========================================
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Aufgaben') AND name = 'IstGlobal') ALTER TABLE Aufgaben ADD IstGlobal bit NOT NULL DEFAULT 0");
    await db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Aufgaben') AND name = 'AzubiIds') ALTER TABLE Aufgaben ADD AzubiIds nvarchar(max) NULL");
    await db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Termine') AND name = 'AzubiIds') ALTER TABLE Termine ADD AzubiIds nvarchar(max) NULL");
    await db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Notizen') AND name = 'AzubiIds') ALTER TABLE Notizen ADD AzubiIds nvarchar(max) NULL");
    await SeedData.InitialisierenAsync(db);
}

// ==========================================
// 14. ANWENDUNG STARTEN
// ==========================================
app.Run();