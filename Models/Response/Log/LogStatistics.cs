namespace Foxel.Models.Response.Log;

public class LogStatistics
{
    /// <summary>
    /// 总日志数
    /// </summary>
    public int TotalCount { get; set; }
    
    /// <summary>
    /// 今日日志数
    /// </summary>
    public int TodayCount { get; set; }
    
    /// <summary>
    /// 错误日志数（Error + Critical）
    /// </summary>
    public int ErrorCount { get; set; }
    
    /// <summary>
    /// 警告日志数
    /// </summary>
    public int WarningCount { get; set; }
}
