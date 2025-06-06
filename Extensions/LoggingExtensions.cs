using Foxel.Services.Logging;

namespace Foxel.Extensions;

public static class LoggingExtensions
{
    public static ILoggingBuilder AddDatabaseLogging(this ILoggingBuilder builder, Action<DatabaseLoggerConfiguration>? configure = null)
    {
        var config = new DatabaseLoggerConfiguration();
        configure?.Invoke(config);
        
        builder.Services.Configure<DatabaseLoggerConfiguration>(options =>
        {
            options.MinLevel = config.MinLevel;
            options.Enabled = config.Enabled;
        });
        
        builder.Services.AddSingleton<ILoggerProvider, DatabaseLoggerProvider>();
        return builder;
    }
}
