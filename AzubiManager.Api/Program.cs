using AzubiManager.Api.Data;
using AzubiManager.Api.Middleware;
using AzubiManager.Api.Services;
using AzubiManager.Api.Validators;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/azubi-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 30)
    .Enrich.FromLogContext()
    .CreateLogger();

try
{
    Log.Information("Starting AzubiManager API");
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog();

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
    // 1. DATENBANK (Connection Pooling für 500 User)
    // ==========================================
    var dbConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrEmpty(dbConnectionString) && !dbConnectionString.Contains("Max Pool Size", StringComparison.OrdinalIgnoreCase))
    {
        dbConnectionString += ";Max Pool Size=500;Connection Timeout=30";
        builder.Configuration["ConnectionStrings:DefaultConnection"] = dbConnectionString;
    }
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
            sql => sql.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorNumbersToAdd: null)));

    // ==========================================
    // 2. JWT-AUTHENTIFIZIERUNG (60 Min Lifetime)
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
        options.RequireHttpsMetadata = builder.Environment.IsProduction();
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

    // Allgemeine Info
    builder.Services.AddScoped<AllgemeineInfoService>();

    // Dashboard
    builder.Services.AddScoped<DashboardService>();

    // Hintergrund-Job für tägliches Tagesstatus-Update
    builder.Services.AddHostedService<TagesstatusJob>();

    // ==========================================
    // 4. IMemoryCache für Performance (256 MB für viele User)
    // ==========================================
    builder.Services.AddMemoryCache(options =>
    {
        options.SizeLimit = 256 * 1024 * 1024; // 256 MB
        options.CompactionPercentage = 0.25;
    });

    // ==========================================
    // 5. RATE LIMITING (global + spezifisch)
    // ==========================================
    builder.Services.AddRateLimiter(options =>
    {
        options.AddFixedWindowLimiter("login", opt =>
        {
            opt.PermitLimit = 5;
            opt.Window = TimeSpan.FromMinutes(1);
            opt.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
            opt.QueueLimit = 2;
        });

        options.AddFixedWindowLimiter("api", opt =>
        {
            opt.PermitLimit = 120;
            opt.Window = TimeSpan.FromMinutes(1);
            opt.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
            opt.QueueLimit = 10;
        });

        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
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
            options.JsonSerializerOptions.DefaultIgnoreCondition =
                System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
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
    app.UseMiddleware<GlobalExceptionHandler>();

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
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        
        // Warten bis die DB bereit ist (max 30 Sekunden)
        for (int i = 0; i < 30; i++)
        {
            try
            {
                await db.Database.CanConnectAsync();
                logger.LogInformation("Database connection established after {Seconds}s", i);
                break;
            }
            catch
            {
                if (i == 29)
                {
                    logger.LogError("Could not connect to database after 30 seconds");
                    throw;
                }
                await Task.Delay(1000);
            }
        }
        
        try
        {
            await db.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Migration warning: {Message}", ex.Message);
        }
        
        try
        {
            await db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Aufgaben') AND name = 'IstGlobal') ALTER TABLE Aufgaben ADD IstGlobal bit NOT NULL DEFAULT 0");
            await db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Aufgaben') AND name = 'AzubiIds') ALTER TABLE Aufgaben ADD AzubiIds nvarchar(max) NULL");
            await db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Termine') AND name = 'AzubiIds') ALTER TABLE Termine ADD AzubiIds nvarchar(max) NULL");
            await db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Notizen') AND name = 'AzubiIds') ALTER TABLE Notizen ADD AzubiIds nvarchar(max) NULL");
            await db.Database.ExecuteSqlRawAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RefreshTokens')
                BEGIN
                    CREATE TABLE RefreshTokens (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        BenutzerId INT NOT NULL,
                        Token NVARCHAR(500) NOT NULL,
                        ErstelltAm DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        LaeuftAb DATETIME2 NOT NULL,
                        VerwendetAm DATETIME2 NULL,
                        IpAdresse NVARCHAR(100) NULL,
                        UserAgent NVARCHAR(500) NULL
                    );
                    CREATE UNIQUE INDEX IX_RefreshTokens_Token ON RefreshTokens(Token);
                    CREATE INDEX IX_RefreshTokens_BenutzerId ON RefreshTokens(BenutzerId);
                END
            ");
            await SeedData.InitialisierenAsync(db, builder.Configuration, logger);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during database initialization");
        }
    }

    // ==========================================
    // 14. ANWENDUNG STARTEN
    // ==========================================
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program { }
