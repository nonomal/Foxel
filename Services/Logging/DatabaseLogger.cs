using System.Text.Json;
using Foxel.Models.DataBase;
using Microsoft.EntityFrameworkCore;

namespace Foxel.Services.Logging;

public class DatabaseLogger(string categoryName, IServiceProvider serviceProvider, DatabaseLoggerConfiguration config)
    : ILogger
{
    private static volatile bool _isDatabaseReady;

    public static void SetDatabaseReady(bool isReady)
    {
        _isDatabaseReady = isReady;
    }

    public IDisposable BeginScope<TState>(TState state) where TState : notnull => null!;

    public bool IsEnabled(LogLevel logLevel) => logLevel >= config.MinLevel;

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        if (!IsEnabled(logLevel) || !_isDatabaseReady)
            return;

        var message = formatter(state, exception);
        if (string.IsNullOrEmpty(message))
            return;

        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = serviceProvider.CreateScope();
                var contextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<MyDbContext>>();
                var httpContextAccessor = scope.ServiceProvider.GetService<IHttpContextAccessor>();

                await using var context = await contextFactory.CreateDbContextAsync();

                if (!await IsDatabaseAvailableAsync(context))
                    return;

                var httpContext = httpContextAccessor?.HttpContext;

                var log = new Log
                {
                    Level = logLevel,
                    Message = message.Length > 4000 ? message[..4000] : message,
                    Category = categoryName,
                    EventId = eventId.Id,
                    Timestamp = DateTime.UtcNow,
                    Exception = exception?.ToString(),
                    RequestPath = httpContext?.Request.Path.ToString(),
                    RequestMethod = httpContext?.Request.Method,
                    StatusCode = httpContext?.Response.StatusCode,
                    IPAddress = httpContext?.Connection.RemoteIpAddress?.ToString(),
                    Properties = SerializeState(state)
                };
                if (httpContext?.User.Identity?.IsAuthenticated == true)
                {
                    var userIdClaim = httpContext.User.FindFirst("UserId");
                    if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
                    {
                        log.UserId = userId;
                    }
                }

                context.Logs.Add(log);
                await context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"写入数据库日志时出错: {ex.Message}");
            }
        });
    }

    private static async Task<bool> IsDatabaseAvailableAsync(MyDbContext context)
    {
        try
        {
            await context.Database.ExecuteSqlRawAsync("SELECT 1 FROM \"Logs\" LIMIT 1");
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string? SerializeState<TState>(TState state)
    {
        if (state is string)
            return null;

        try
        {
            var options = new JsonSerializerOptions
            {
                WriteIndented = false,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            };

            return JsonSerializer.Serialize(state, options);
        }
        catch
        {
            return state?.ToString();
        }
    }
}