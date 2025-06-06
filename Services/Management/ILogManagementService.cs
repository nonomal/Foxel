using Foxel.Models;
using Foxel.Models.Response.Log;

namespace Foxel.Services.Management;

public interface ILogManagementService
{
    Task<PaginatedResult<LogResponse>> GetLogsAsync(int page, int pageSize, string? searchQuery = null, LogLevel? level = null, DateTime? startDate = null, DateTime? endDate = null);
    Task<LogResponse> GetLogByIdAsync(int id);
    Task<bool> DeleteLogAsync(int id);
    Task<BatchDeleteResult> BatchDeleteLogsAsync(List<int> ids);
    Task<int> ClearLogsByDateAsync(DateTime beforeDate);
    Task<int> ClearAllLogsAsync();

    /// <summary>
    /// 获取日志统计信息
    /// </summary>
    /// <returns>日志统计数据</returns>
    Task<LogStatistics> GetLogStatisticsAsync();
}
