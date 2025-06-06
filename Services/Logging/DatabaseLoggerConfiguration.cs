namespace Foxel.Services.Logging;

public class DatabaseLoggerConfiguration
{
    public LogLevel MinLevel { get; set; } = LogLevel.Information;
    public bool Enabled { get; set; } = true;
}
