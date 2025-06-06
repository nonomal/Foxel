using Microsoft.Extensions.Options;

namespace Foxel.Services.Logging;

[ProviderAlias("Database")]
public class DatabaseLoggerProvider : ILoggerProvider
{
    private readonly IServiceProvider _serviceProvider;
    private readonly DatabaseLoggerConfiguration _config;

    public DatabaseLoggerProvider(IServiceProvider serviceProvider, IOptions<DatabaseLoggerConfiguration> config)
    {
        _serviceProvider = serviceProvider;
        _config = config.Value;
    }

    public ILogger CreateLogger(string categoryName)
    {
        return new DatabaseLogger(categoryName, _serviceProvider, _config);
    }

    public void Dispose() { }
}
