using Foxel.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Foxel.Services.AI;
using Foxel.Services.Auth;
using Foxel.Services.Background;
using Foxel.Services.Configuration;
using Foxel.Services.Initializer;
using Foxel.Services.Management;
using Foxel.Services.Media;
using Foxel.Services.Storage;
using Foxel.Services.Background.Processors;
using Foxel.Services.Mapping;
using Foxel.Services.VectorDb;

namespace Foxel.Extensions;

public static class ServiceCollectionExtensions
{
    public static void AddCoreServices(this IServiceCollection services)
    {
        services.AddSingleton<IConfigService, ConfigService>();
        services.AddScoped<IAiService, AiService>();
        services.AddScoped<IPictureService, PictureService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ITagService, TagService>();
        services.AddScoped<IAlbumService, AlbumService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<IPictureManagementService, PictureManagementService>();
        services.AddScoped<IAlbumManagementService, AlbumManagementService>();
        services.AddScoped<ILogManagementService, LogManagementService>();
        services.AddScoped<IStorageManagementService, StorageManagementService>();
        services.AddScoped<IFaceManagementService, FaceManagementService>();
        services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();
        services.AddHostedService<QueuedHostedService>();
        services.AddSingleton<IStorageService, StorageService>();
        services.AddSingleton<PictureTaskProcessor>();
        services.AddSingleton<FaceRecognitionTaskProcessor>();
        services.AddSingleton<VisualRecognitionTaskProcessor>();
        services.AddTransient<IDatabaseInitializer, DatabaseInitializer>();
        services.AddScoped<IMappingService, MappingService>();
        services.AddScoped<IFaceClusteringService, FaceClusteringService>();
    }

    public static void AddApplicationDbContext(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrEmpty(connectionString))
        {
            connectionString = Environment.GetEnvironmentVariable("DEFAULT_CONNECTION");
        }

        Console.WriteLine($"数据库连接: {connectionString}");
        services.AddDbContextFactory<MyDbContext>(options =>
            options.UseNpgsql(connectionString));
    }

    public static void AddApplicationOpenApi(this IServiceCollection services)
    {
        services.AddOpenApi(opt => { opt.AddDocumentTransformer<BearerSecuritySchemeTransformer>(); });
    }

    public static void AddApplicationAuthentication(this IServiceCollection services)
    {
        IConfigService configuration = services.BuildServiceProvider().GetRequiredService<IConfigService>();
        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"],
                    ValidAudience = configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(configuration["Jwt:SecretKey"]))
                };
            });
    }

    public static void AddApplicationAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });
    }

    public static void AddApplicationCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy(name: "MyAllowSpecificOrigins",
                policy => { policy.WithOrigins().AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod(); });
        });
    }

    public static void AddVectorDbServices(this IServiceCollection services)
    {
        services.AddSingleton<VectorDbManager>();
        services.AddSingleton<IVectorDbService>(provider =>
            provider.GetRequiredService<VectorDbManager>());
    }
}