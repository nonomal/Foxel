namespace Foxel.Models.Response.Log;

public class LogResponse
{
    public int Id { get; set; }
    public LogLevel Level { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int? EventId { get; set; }
    public DateTime Timestamp { get; set; }
    public string? Exception { get; set; }
    public string? RequestPath { get; set; }
    public string? RequestMethod { get; set; }
    public int? StatusCode { get; set; }
    public string? IPAddress { get; set; }
    public int? UserId { get; set; }
    public string? Properties { get; set; }
}
