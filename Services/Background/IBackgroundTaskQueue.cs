using Foxel.Models.DataBase;
using Foxel.Services.Background.Processors; // For VisualRecognitionPayload

namespace Foxel.Services.Background;

/// <summary>
/// 后台任务队列接口
/// </summary>
public interface IBackgroundTaskQueue
{
    /// <summary>
    /// 将图片处理任务（元数据和缩略图）添加到队列
    /// </summary>
    /// <param name="pictureId">图片ID</param>
    /// <param name="originalFilePath">原始图片路径</param>
    /// <returns>任务ID</returns>
    Task<Guid> QueuePictureProcessingTaskAsync(int pictureId, string originalFilePath);

    /// <summary>
    /// 将视觉识别任务添加到队列
    /// </summary>
    /// <param name="payload">视觉识别任务的Payload</param>
    /// <returns>任务ID</returns>
    Task<Guid> QueueVisualRecognitionTaskAsync(VisualRecognitionPayload payload);

    /// <summary>
    /// 获取用户的所有任务状态 (目前主要指图片处理任务)
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>该用户的任务状态列表</returns>
    Task<List<TaskDetailsDto>> GetUserTasksStatusAsync(int userId);

    /// <summary>
    /// 获取特定图片的处理状态 (实际获取的是与该图片关联的任务状态)
    /// </summary>
    /// <param name="pictureId">图片ID, 将作为 RelatedEntityId 查询</param>
    /// <returns>处理状态 DTO</returns>
    Task<TaskDetailsDto?> GetPictureProcessingStatusAsync(int pictureId);

    /// <summary>
    /// 恢复未完成的任务
    /// </summary>
    Task RestoreUnfinishedTasksAsync();
}

/// <summary>
/// 通用任务状态 DTO (用于API响应)
/// </summary>
public class TaskDetailsDto
{
    public Guid TaskId { get; set; }
    public string TaskName { get; set; } = string.Empty; // 任务的描述性名称
    public TaskType TaskType { get; set; } // 任务类型
    public TaskExecutionStatus Status { get; set; }
    public int Progress { get; set; }  // 0-100
    public string? Error { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? RelatedEntityId { get; set; } // 关联实体的ID，例如 PictureId
}
