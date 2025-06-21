using Foxel.Services.Logging;

namespace Foxel.Extensions;

public static class LoggingExtensions
{
    /// <summary>
    /// 添加数据库日志记录支持
    /// </summary>
    /// <param name="builder">日志构建器</param>
    /// <param name="configure">配置选项</param>
    /// <returns>日志构建器</returns>
    public static ILoggingBuilder AddDatabaseLogging(this ILoggingBuilder builder, Action<DatabaseLoggerConfiguration>? configure = null)
    {
        ArgumentNullException.ThrowIfNull(builder);
        
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
