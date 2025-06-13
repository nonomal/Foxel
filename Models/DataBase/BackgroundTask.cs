using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Foxel.Models.DataBase
{
    public enum TaskType
    {
        PictureProcessing = 0,
        VisualRecognition = 1,
        FaceRecognition = 2,
    }

    public enum TaskExecutionStatus
    {
        Pending,    // 等待处理
        Processing, // 处理中
        Completed,  // 处理完成
        Failed      // 处理失败
    }

    public class BackgroundTask : BaseModel
    {
        [Key]
        public new Guid Id { get; set; } // 任务的唯一标识符

        public TaskType Type { get; set; } // 任务类型

        public TaskExecutionStatus Status { get; set; } // 当前状态

        public int Progress { get; set; } // 进度 (0-100)

        [Column(TypeName = "jsonb")]
        public string? Payload { get; set; } // JSON 字符串，存储任务特定数据

        public string? ErrorMessage { get; set; } // 错误信息（如果任务失败）

        public DateTime? StartedAt { get; set; } // 开始处理时间

        public DateTime? CompletedAt { get; set; } // 完成时间

        public int? UserId { get; set; } // 关联的用户ID
        public User? User { get; set; }

        public int? RelatedEntityId { get; set; }

        public BackgroundTask()
        {
            Id = Guid.NewGuid();
            CreatedAt = DateTime.UtcNow;
            Status = TaskExecutionStatus.Pending;
            Progress = 0;
        }
    }

    public class PictureProcessingPayload
    {
        public int PictureId { get; set; }
        public required string OriginalFilePath { get; set; }
        public int? UserIdForPicture { get; set; }
    }
}
