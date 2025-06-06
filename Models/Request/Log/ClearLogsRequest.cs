namespace Foxel.Models.Request.Log;

public class ClearLogsRequest
{
    public DateTime? BeforeDate { get; set; }
    public bool ClearAll { get; set; } = false;
}
