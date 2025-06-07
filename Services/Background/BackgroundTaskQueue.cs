using System.Collections.Concurrent;
using System.Text.Json;
using System.Threading.Channels;
using Foxel.Models.DataBase;
using Foxel.Services.Configuration;
using Foxel.Services.Background.Processors;
using Microsoft.EntityFrameworkCore;

namespace Foxel.Services.Background;

public sealed class BackgroundTaskQueue : IBackgroundTaskQueue, IDisposable
{
    private readonly Channel<Guid> _queue;
    private readonly IServiceProvider _serviceProvider;
    private readonly IDbContextFactory<MyDbContext> _contextFactory;
    private readonly List<Task> _processingTasks;
    private readonly SemaphoreSlim _signal;
    private readonly int _maxConcurrentTasks;
    private bool _isDisposed;
    private readonly ILogger<BackgroundTaskQueue> _logger;

    public BackgroundTaskQueue(
        IServiceProvider serviceProvider,
        IDbContextFactory<MyDbContext> contextFactory,
        IConfigService configuration,
        ILogger<BackgroundTaskQueue> logger)
    {
        _serviceProvider = serviceProvider; // Keep IServiceProvider to resolve processors
        _contextFactory = contextFactory;
        _logger = logger;
        _processingTasks = new List<Task>();
        _maxConcurrentTasks = configuration.GetValueAsync("BackgroundTasks:MaxConcurrentTasks", 10).Result; // 保持原有逻辑
        _signal = new SemaphoreSlim(_maxConcurrentTasks);
        var options = new BoundedChannelOptions(10000) // 保持原有逻辑
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _queue = Channel.CreateBounded<Guid>(options);

        // 启动处理器，确保在服务启动时就开始处理队列
        StartProcessor();
    }

    public async Task<Guid> QueuePictureProcessingTaskAsync(int pictureId, string originalFilePath)
    {
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        var picture = await dbContext.Pictures.FindAsync(pictureId);
        if (picture == null)
        {
            _logger.LogError("无法为不存在的图片 PictureId: {PictureId} 创建处理任务", pictureId);
            throw new KeyNotFoundException($"找不到 PictureId: {pictureId} 的图片");
        }

        var payload = new PictureProcessingPayload
        {
            PictureId = pictureId,
            OriginalFilePath = originalFilePath,
            UserIdForPicture = picture.UserId
        };

        var backgroundTask = new BackgroundTask
        {
            Type = TaskType.PictureProcessing,
            Payload = JsonSerializer.Serialize(payload),
            UserId = picture.UserId,
            RelatedEntityId = pictureId,
            Status = TaskExecutionStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.BackgroundTasks.Add(backgroundTask);
        await dbContext.SaveChangesAsync();

        await _queue.Writer.WriteAsync(backgroundTask.Id);
        _logger.LogInformation("图片处理任务已加入队列: TaskId={TaskId}, PictureId={PictureId}", backgroundTask.Id, pictureId);

        StartProcessor();

        return backgroundTask.Id;
    }

    public async Task<List<TaskDetailsDto>> GetUserTasksStatusAsync(int userId)
    {
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        var tasks = await dbContext.BackgroundTasks
            .Where(bt => bt.UserId == userId)
            .OrderByDescending(bt => bt.CreatedAt)
            .ToListAsync();

        var statusList = new List<TaskDetailsDto>();
        foreach (var task in tasks)
        {
            string taskName = $"任务: {task.Id}";
            if (task.Type == TaskType.PictureProcessing && task.RelatedEntityId.HasValue)
            {
                var picture = await dbContext.Pictures.FindAsync(task.RelatedEntityId.Value);
                if (picture != null)
                {
                    taskName = picture.Name; 
                }
                else
                {
                    taskName = "图片处理 (图片信息丢失)";
                }
            }

            statusList.Add(new TaskDetailsDto
            {
                TaskId = task.Id,
                TaskName = taskName,
                TaskType = task.Type,
                Status = task.Status,
                Progress = task.Progress,
                Error = task.ErrorMessage,
                CreatedAt = task.CreatedAt,
                CompletedAt = task.CompletedAt,
                RelatedEntityId = task.RelatedEntityId
            });
        }
        return statusList;
    }

    public async Task<TaskDetailsDto?> GetPictureProcessingStatusAsync(int pictureId)
    {
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        var task = await dbContext.BackgroundTasks
            .FirstOrDefaultAsync(bt => bt.RelatedEntityId == pictureId && bt.Type == TaskType.PictureProcessing);

        if (task == null)
            return null;

        var pictureName = "未知图片";
        var picture = await dbContext.Pictures.FindAsync(pictureId);
        if (picture != null)
        {
            pictureName = picture.Name;
        }

        return new TaskDetailsDto
        {
            TaskId = task.Id,
            TaskName = pictureName, // Picture name as task name
            TaskType = task.Type,
            Status = task.Status,
            Progress = task.Progress,
            Error = task.ErrorMessage,
            CreatedAt = task.CreatedAt,
            CompletedAt = task.CompletedAt,
            RelatedEntityId = task.RelatedEntityId
        };
    }

    public async Task RestoreUnfinishedTasksAsync()
    {
        try
        {
            await using var dbContext = await _contextFactory.CreateDbContextAsync();
            var unfinishedTasks = await dbContext.BackgroundTasks
                .Where(bt => bt.Type == TaskType.PictureProcessing &&
                             (bt.Status == TaskExecutionStatus.Pending || bt.Status == TaskExecutionStatus.Processing))
                .ToListAsync();

            if (unfinishedTasks.Any())
            {
                _logger.LogInformation("正在恢复 {Count} 个未完成的图片处理任务", unfinishedTasks.Count);
                foreach (var task in unfinishedTasks)
                {
                    // 确保任务状态在数据库中被重置为 Pending，以防上次运行时停在 Processing 状态
                    if (task.Status == TaskExecutionStatus.Processing)
                    {
                        task.Status = TaskExecutionStatus.Pending;
                        task.StartedAt = null; // 重置开始时间
                        // 保留 Progress 和 ErrorMessage 以供参考
                    }
                    await _queue.Writer.WriteAsync(task.Id);
                    _logger.LogInformation("已恢复图片处理任务到队列: TaskId={TaskId}, RelatedEntityId={RelatedEntityId}", task.Id, task.RelatedEntityId);
                }
                await dbContext.SaveChangesAsync(); // 保存状态更改
            }
            else
            {
                _logger.LogInformation("没有需要恢复的图片处理任务");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "恢复未完成的任务时发生错误");
        }
    }

    private void StartProcessor()
    {
        lock (_processingTasks) // 确保线程安全地访问 _processingTasks
        {
            // 清理已完成的任务
            _processingTasks.RemoveAll(t => t.IsCompleted);

            // 添加新的处理任务，如果当前任务数量小于最大并发数
            while (_processingTasks.Count < _maxConcurrentTasks && _queue.Reader.Count > 0)
            {
                _processingTasks.Add(Task.Run(ProcessTasksAsync));
            }
        }
    }

    private async Task ProcessTasksAsync()
    {
        while (await _queue.Reader.WaitToReadAsync())
        {
            if (_queue.Reader.TryRead(out var taskId))
            {
                await _signal.WaitAsync();
                try
                {
                    await using var checkDbContext = await _contextFactory.CreateDbContextAsync();
                    var taskToCheck = await checkDbContext.BackgroundTasks.FindAsync(taskId);

                    if (taskToCheck == null)
                    {
                        _logger.LogWarning("任务 TaskId={TaskId} 在开始处理前未找到，可能已被删除。", taskId);
                        continue; // Skip this task
                    }

                    if (taskToCheck.Status != TaskExecutionStatus.Pending && taskToCheck.Status != TaskExecutionStatus.Processing)
                    {
                        _logger.LogInformation("任务 TaskId={TaskId} 状态为 {Status}，跳过处理。", taskId, taskToCheck.Status);
                        continue; // Skip this task, already completed or failed by another process
                    }

                    taskToCheck.Status = TaskExecutionStatus.Processing;
                    taskToCheck.StartedAt = DateTime.UtcNow;
                    await checkDbContext.SaveChangesAsync();

                    _logger.LogInformation("开始处理任务: TaskId={TaskId}, Type={TaskType}", taskToCheck.Id, taskToCheck.Type);

                    try
                    {
                        ITaskProcessor processor;
                        // Processors are typically scoped, so we create a scope here.
                        using var scope = _serviceProvider.CreateScope();
                        switch (taskToCheck.Type)
                        {
                            case TaskType.PictureProcessing:
                                processor = scope.ServiceProvider.GetRequiredService<PictureTaskProcessor>();
                                break;
                            // Future task types can be added here
                            default:
                                _logger.LogError("未找到任务类型 {TaskType} 的处理器: TaskId={TaskId}", taskToCheck.Type, taskToCheck.Id);
                                await MarkTaskAsFailedByQueue(taskToCheck.Id, $"未找到任务类型 {taskToCheck.Type} 的处理器。");
                                continue; // Continue to next task in queue
                        }
                        await processor.ProcessAsync(taskToCheck); // Processor handles its own final status update
                    }
                    catch (Exception procEx)
                    {
                        _logger.LogError(procEx, "处理器执行任务 TaskId={TaskId} 时发生错误。", taskToCheck.Id);
                        await MarkTaskAsFailedByQueue(taskToCheck.Id, $"处理器执行时发生错误: {procEx.Message}");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "处理任务 TaskId={TaskId} 时发生未捕获的异常。", taskId);
                    await MarkTaskAsFailedByQueue(taskId, $"处理过程中发生未捕获的异常: {ex.Message}");
                }
                finally
                {
                    _signal.Release();
                    StartProcessor();
                }
            }
        }
    }

    private async Task MarkTaskAsFailedByQueue(Guid taskId, string errorMessage)
    {
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        var task = await dbContext.BackgroundTasks.FindAsync(taskId);
        if (task != null)
        {
            task.Status = TaskExecutionStatus.Failed;
            task.ErrorMessage = errorMessage;
            task.Progress = task.Progress; // Keep existing progress or reset to 0
            task.CompletedAt = DateTime.UtcNow;
            if (!task.StartedAt.HasValue) // Ensure StartedAt is set if not already
            {
                task.StartedAt = task.CreatedAt;
            }
            await dbContext.SaveChangesAsync();
            _logger.LogWarning("任务由队列标记为失败: TaskId={TaskId}, Error='{Error}'", taskId, errorMessage);
        }
        else
        {
            _logger.LogWarning("尝试由队列标记为失败，但未找到任务: TaskId={TaskId}", taskId);
        }
    }

    public void Dispose()
    {
        if (_isDisposed) return;

        _queue.Writer.TryComplete(); // 尝试完成队列写入

        // 等待所有处理任务完成，设置超时
        var allProcessingTasksDone = Task.WhenAll(_processingTasks);
        try
        {
            if (!allProcessingTasksDone.Wait(TimeSpan.FromSeconds(10))) // 例如，等待10秒
            {
                _logger.LogWarning("并非所有后台任务都在 Dispose 超时内完成。");
            }
        }
        catch (AggregateException ae)
        {
            ae.Handle(ex =>
            {
                _logger.LogError(ex, "后台任务在 Dispose 期间抛出异常。");
                return true; // 标记为已处理
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "等待处理任务完成时发生错误。");
        }

        _signal.Dispose();
        _isDisposed = true;
        GC.SuppressFinalize(this);
    }
}