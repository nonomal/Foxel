using Microsoft.EntityFrameworkCore;
using Foxel.Services.Initializer;

namespace Foxel.Extensions;

public static class DatabaseExtensions
{
    /// <summary>
    /// 配置应用程序数据库上下文
    /// </summary>
    public static IServiceCollection AddApplicationDbContext(this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = GetConnectionString(configuration);
        Console.WriteLine($"数据库连接: {connectionString}");

        services.AddDbContextFactory<MyDbContext>(options =>
            options.UseNpgsql(connectionString));

        return services;
    }

    /// <summary>
    /// 初始化数据库
    /// </summary>
    public static async Task InitializeDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var initializer = scope.ServiceProvider.GetRequiredService<DatabaseInitializer>();
        await initializer.InitializeAsync();
    }

    private static string GetConnectionString(IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrEmpty(connectionString))
        {
            connectionString = Environment.GetEnvironmentVariable("DEFAULT_CONNECTION");
        }

        if (string.IsNullOrEmpty(connectionString))
        {
            throw new InvalidOperationException("数据库连接字符串未配置");
        }

        return connectionString;
    }
}