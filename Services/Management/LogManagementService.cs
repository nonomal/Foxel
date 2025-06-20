using Microsoft.EntityFrameworkCore;
using Foxel.Models;
using Foxel.Models.Response.Log;

namespace Foxel.Services.Management;

public class LogManagementService(IDbContextFactory<MyDbContext> contextFactory) : ILogManagementService
{
    public async Task<PaginatedResult<LogResponse>> GetLogsAsync(int page, int pageSize, string? searchQuery = null, LogLevel? level = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        
        var query = context.Logs.AsQueryable();

        if (!string.IsNullOrEmpty(searchQuery))
        {
            query = query.Where(l => l.Message.Contains(searchQuery) || 
                                   l.Category.Contains(searchQuery) ||
                                   (l.Exception != null && l.Exception.Contains(searchQuery)));
        }

        if (level.HasValue)
        {
            query = query.Where(l => l.Level == level.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(l => l.Timestamp >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(l => l.Timestamp <= endDate.Value);
        }

        var totalCount = await query.CountAsync();
        
        var logs = await query
            .OrderByDescending(l => l.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new LogResponse
            {
                Id = l.Id,
                Level = l.Level,
                Message = l.Message,
                Category = l.Category,
                EventId = l.EventId,
                Timestamp = l.Timestamp,
                Exception = l.Exception,
                RequestPath = l.RequestPath,
                RequestMethod = l.RequestMethod,
                StatusCode = l.StatusCode,
                IPAddress = l.IPAddress,
                UserId = l.UserId,
                Properties = l.Properties
            })
            .ToListAsync();

        return new PaginatedResult<LogResponse>
        {
            Data = logs,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<LogResponse> GetLogByIdAsync(int id)
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        
        var log = await context.Logs.FirstOrDefaultAsync(l => l.Id == id);
        if (log == null)
            throw new KeyNotFoundException($"找不到ID为 {id} 的日志");

        return new LogResponse
        {
            Id = log.Id,
            Level = log.Level,
            Message = log.Message,
            Category = log.Category,
            EventId = log.EventId,
            Timestamp = log.Timestamp,
            Exception = log.Exception,
            RequestPath = log.RequestPath,
            RequestMethod = log.RequestMethod,
            StatusCode = log.StatusCode,
            IPAddress = log.IPAddress,
            UserId = log.UserId,
            Properties = log.Properties
        };
    }

    public async Task<bool> DeleteLogAsync(int id)
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        
        var log = await context.Logs.FirstOrDefaultAsync(l => l.Id == id);
        if (log == null)
            throw new KeyNotFoundException($"找不到ID为 {id} 的日志");

        context.Logs.Remove(log);
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<BatchDeleteResult> BatchDeleteLogsAsync(List<int> ids)
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        
        var result = new BatchDeleteResult();
        
        var logs = await context.Logs.Where(l => ids.Contains(l.Id)).ToListAsync();
        result.SuccessCount = logs.Count;
        result.FailedCount = ids.Count - logs.Count;

        if (logs.Any())
        {
            context.Logs.RemoveRange(logs);
            await context.SaveChangesAsync();
        }

        return result;
    }

    public async Task<int> ClearLogsByDateAsync(DateTime beforeDate)
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        
        var logsToDelete = await context.Logs
            .Where(l => l.Timestamp < beforeDate)
            .ToListAsync();

        if (logsToDelete.Any())
        {
            context.Logs.RemoveRange(logsToDelete);
            await context.SaveChangesAsync();
        }

        return logsToDelete.Count;
    }

    public async Task<int> ClearAllLogsAsync()
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        
        var totalCount = await context.Logs.CountAsync();
        
        if (totalCount > 0)
        {
            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"Logs\"");
        }

        return totalCount;
    }

    public async Task<LogStatistics> GetLogStatisticsAsync()
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        
        // 使用UTC时间避免PostgreSQL时区问题
        var todayUtc = DateTime.UtcNow.Date;
        var tomorrowUtc = todayUtc.AddDays(1);
        
        var totalCount = await context.Logs.CountAsync();
        var todayCount = await context.Logs.CountAsync(l => l.Timestamp >= todayUtc && l.Timestamp < tomorrowUtc);
        var errorCount = await context.Logs.CountAsync(l => l.Level == LogLevel.Error || l.Level == LogLevel.Critical);
        var warningCount = await context.Logs.CountAsync(l => l.Level == LogLevel.Warning);
        
        return new LogStatistics
        {
            TotalCount = totalCount,
            TodayCount = todayCount,
            ErrorCount = errorCount,
            WarningCount = warningCount
        };
    }
}
