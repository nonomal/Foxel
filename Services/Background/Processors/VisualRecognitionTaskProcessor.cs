using Foxel.Models.DataBase;
using Foxel.Services.AI;
using Foxel.Services.Storage;
using Foxel.Services.VectorDB;
using Foxel.Utils;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Foxel.Services.Attributes;

namespace Foxel.Services.Background.Processors
{

    public class VisualRecognitionTaskProcessor : ITaskProcessor
    {
        private readonly IDbContextFactory<MyDbContext> _contextFactory;
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<VisualRecognitionTaskProcessor> _logger;
        private readonly IWebHostEnvironment _environment;

        public VisualRecognitionTaskProcessor(
            IDbContextFactory<MyDbContext> contextFactory,
            IServiceProvider serviceProvider,
            ILogger<VisualRecognitionTaskProcessor> logger,
            IWebHostEnvironment environment)
        {
            _contextFactory = contextFactory;
            _serviceProvider = serviceProvider;
            _logger = logger;
            _environment = environment;
        }

        public async Task ProcessAsync(BackgroundTask backgroundTask)
        {
            if (backgroundTask.Payload == null)
            {
                await UpdateTaskStatusInDb(backgroundTask.Id, TaskExecutionStatus.Failed, 0, "任务 Payload 为空。");
                _logger.LogError("视觉识别任务 Payload 为空: TaskId={TaskId}", backgroundTask.Id);
                return;
            }

            VisualRecognitionPayload? payload;
            try
            {
                payload = JsonSerializer.Deserialize<VisualRecognitionPayload>(backgroundTask.Payload);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "无法解析视觉识别任务的 Payload: TaskId={TaskId}", backgroundTask.Id);
                await UpdateTaskStatusInDb(backgroundTask.Id, TaskExecutionStatus.Failed, 0, "Payload 解析失败。");
                return;
            }

            if (payload == null || payload.PictureId == 0)
            {
                _logger.LogError("视觉识别任务的 Payload 无效或缺少 PictureId: TaskId={TaskId}", backgroundTask.Id);
                await UpdateTaskStatusInDb(backgroundTask.Id, TaskExecutionStatus.Failed, 0, "Payload 无效或缺少 PictureId。");
                return;
            }

            var pictureId = payload.PictureId;
            string thumbnailForAIDownloadPath = string.Empty; // Path if thumbnail needs to be downloaded
            bool isTempThumbnailFile = false;

            await using var dbContext = await _contextFactory.CreateDbContextAsync();
            var currentBackgroundTaskState = await dbContext.BackgroundTasks.FindAsync(backgroundTask.Id);
            if (currentBackgroundTaskState == null)
            {
                _logger.LogError("在 VisualRecognitionTaskProcessor 中找不到后台任务: TaskId={TaskId}", backgroundTask.Id);
                return;
            }

            var picture = await dbContext.Pictures.Include(p => p.User).ThenInclude(u => u.Tags).FirstOrDefaultAsync(p => p.Id == pictureId);

            try
            {
                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 10, currentBackgroundTaskState: currentBackgroundTaskState);

                if (picture == null)
                {
                    throw new Exception($"找不到ID为{pictureId}的图片。");
                }
                if (string.IsNullOrEmpty(picture.ThumbnailPath))
                {
                    throw new Exception($"图片ID {pictureId} 的缩略图路径为空，无法进行AI分析。");
                }

                using var scope = _serviceProvider.CreateScope();
                var aiService = scope.ServiceProvider.GetRequiredService<IAiService>();
                var storageService = scope.ServiceProvider.GetRequiredService<IStorageService>();
                string contentRootPath = _environment.ContentRootPath;
                string actualThumbnailPathForAI;

                if (picture.StorageType == StorageType.Local)
                {
                    actualThumbnailPathForAI = Path.Combine(contentRootPath, picture.ThumbnailPath.TrimStart('/'));
                }
                else // Remote storage
                {
                    await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 15, currentBackgroundTaskState: currentBackgroundTaskState);
                    thumbnailForAIDownloadPath = await storageService.ExecuteAsync(picture.StorageType,
                        provider => provider.DownloadFileAsync(picture.ThumbnailPath));
                    actualThumbnailPathForAI = thumbnailForAIDownloadPath;
                    isTempThumbnailFile = true;
                }

                if (string.IsNullOrEmpty(actualThumbnailPathForAI) || !File.Exists(actualThumbnailPathForAI))
                {
                    throw new Exception($"找不到用于AI分析的缩略图文件: {actualThumbnailPathForAI} (源路径: {picture.ThumbnailPath})");
                }
                
                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 20, currentBackgroundTaskState: currentBackgroundTaskState);
                string base64Image = await ImageHelper.ConvertImageToBase64(actualThumbnailPathForAI);

                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 40, currentBackgroundTaskState: currentBackgroundTaskState);
                var (title, description) = await aiService.AnalyzeImageAsync(base64Image);

                string finalTitle = !string.IsNullOrWhiteSpace(title) && title != "AI生成的标题" ? title : Path.GetFileNameWithoutExtension(picture.Name);
                string finalDescription = !string.IsNullOrWhiteSpace(description) && description != "AI生成的描述" ? description : picture.Description;
                picture.Name = finalTitle; // Potentially overwrites name set from filename
                picture.Description = finalDescription;

                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 60, currentBackgroundTaskState: currentBackgroundTaskState);
                var combinedText = $"{finalTitle}. {finalDescription}";
                var embedding = await aiService.GetEmbeddingAsync(combinedText);
                picture.Embedding = embedding;

                if (picture.UserId.HasValue && embedding != null && embedding.Length > 0)
                {
                    var vectorDbService = scope.ServiceProvider.GetRequiredService<IVectorDbService>();
                    await vectorDbService.AddPictureToUserCollectionAsync(picture.UserId.Value, new Models.Vector.PictureVector
                    {
                        Id = (ulong)picture.Id,
                        Name = picture.Name,
                        Embedding = embedding
                    });
                }

                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 70, currentBackgroundTaskState: currentBackgroundTaskState);
                var availableTagNames = await dbContext.Tags.Select(t => t.Name).ToListAsync();
                
                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 80, currentBackgroundTaskState: currentBackgroundTaskState);
                var matchedTagNames = await aiService.GenerateTagsFromImageAsync(base64Image, availableTagNames, true);

                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 90, currentBackgroundTaskState: currentBackgroundTaskState);
                if (picture.User != null && matchedTagNames.Any())
                {
                    picture.Tags ??= new List<Tag>();
                    foreach (var tagName in matchedTagNames)
                    {
                        var existingTag = await dbContext.Tags.FirstOrDefaultAsync(t => t.Name.ToLower() == tagName.ToLower());
                        if (existingTag == null)
                        {
                            existingTag = new Tag { Name = tagName.Trim(), Description = tagName.Trim() };
                            dbContext.Tags.Add(existingTag);
                        }
                        if (!picture.Tags.Any(t => t.Id == existingTag.Id)) picture.Tags.Add(existingTag);

                        picture.User.Tags ??= new List<Tag>();
                        if (!picture.User.Tags.Any(t => t.Id == existingTag.Id)) picture.User.Tags.Add(existingTag);
                    }
                }

                await dbContext.SaveChangesAsync(); // Save all AI-related changes to Picture
                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Completed, 100, completedAt: DateTime.UtcNow, currentBackgroundTaskState: currentBackgroundTaskState);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "视觉识别任务失败: TaskId={TaskId}, PictureId={PictureId}", currentBackgroundTaskState.Id, pictureId);
                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Failed, currentBackgroundTaskState.Progress, ex.Message, currentBackgroundTaskState: currentBackgroundTaskState);
                // dbContext.SaveChangesAsync() might be called in UpdateTaskStatusInDb or here if picture state needs saving on error
            }
            finally
            {
                if (isTempThumbnailFile && File.Exists(thumbnailForAIDownloadPath))
                {
                    try { File.Delete(thumbnailForAIDownloadPath); } catch (Exception ex) { _logger.LogWarning(ex, "删除临时AI缩略图文件失败: {FilePath}", thumbnailForAIDownloadPath); }
                }
            }
        }

        private async Task UpdateTaskStatusInDb(Guid taskId, TaskExecutionStatus status, int progress, string? error = null, DateTime? startedAt = null, DateTime? completedAt = null, BackgroundTask? currentBackgroundTaskState = null)
        {
            await using var dbContext = await _contextFactory.CreateDbContextAsync();
            var taskToUpdate = currentBackgroundTaskState ?? await dbContext.BackgroundTasks.FindAsync(taskId);

            if (taskToUpdate != null)
            {
                if (currentBackgroundTaskState != null && dbContext.Entry(currentBackgroundTaskState).State == EntityState.Detached)
                {
                    dbContext.BackgroundTasks.Attach(currentBackgroundTaskState);
                }

                taskToUpdate.Status = status;
                taskToUpdate.Progress = progress;
                taskToUpdate.ErrorMessage = string.IsNullOrEmpty(error) ? taskToUpdate.ErrorMessage : error; // Keep existing error if new one is null/empty
                if (startedAt.HasValue) taskToUpdate.StartedAt = startedAt;
                if (completedAt.HasValue) taskToUpdate.CompletedAt = completedAt;
                
                if ((status == TaskExecutionStatus.Completed || status == TaskExecutionStatus.Failed) && !taskToUpdate.StartedAt.HasValue)
                {
                     taskToUpdate.StartedAt = taskToUpdate.CreatedAt; // Ensure StartedAt is set
                }
                if (status == TaskExecutionStatus.Completed || status == TaskExecutionStatus.Failed)
                {
                    taskToUpdate.CompletedAt ??= DateTime.UtcNow; // Ensure CompletedAt is set
                }


                await dbContext.SaveChangesAsync();
                _logger.LogInformation("任务状态更新 (VisualRecognitionProcessor): TaskId={TaskId}, Status={Status}, Progress={Progress}%", taskId, status, progress);
            }
            else
            {
                _logger.LogWarning("尝试在 VisualRecognitionProcessor 中更新不存在的任务状态: TaskId={TaskId}", taskId);
            }
        }
    }
}
