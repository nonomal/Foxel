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
    public class PictureTaskProcessor : ITaskProcessor
    {
        private readonly IDbContextFactory<MyDbContext> _contextFactory;
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<PictureTaskProcessor> _logger;
        private readonly IWebHostEnvironment _environment;

        public PictureTaskProcessor(
            IDbContextFactory<MyDbContext> contextFactory,
            IServiceProvider serviceProvider,
            ILogger<PictureTaskProcessor> logger,
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
                _logger.LogError("任务 Payload 为空: TaskId={TaskId}", backgroundTask.Id);
                return;
            }

            PictureProcessingPayload? payload;
            try
            {
                payload = JsonSerializer.Deserialize<PictureProcessingPayload>(backgroundTask.Payload);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "无法解析图片处理任务的 Payload: TaskId={TaskId}", backgroundTask.Id);
                await UpdateTaskStatusInDb(backgroundTask.Id, TaskExecutionStatus.Failed, 0, "Payload 解析失败。");
                return;
            }

            if (payload == null || payload.PictureId == 0)
            {
                _logger.LogError("图片处理任务的 Payload 无效或缺少 PictureId: TaskId={TaskId}", backgroundTask.Id);
                await UpdateTaskStatusInDb(backgroundTask.Id, TaskExecutionStatus.Failed, 0, "Payload 无效或缺少 PictureId。");
                return;
            }

            var pictureId = payload.PictureId;
            var originalFilePathFromPayload = payload.OriginalFilePath;
            string localFilePath = "";
            bool isTempFile = false;
            string thumbnailForAI = string.Empty;

            await using var dbContext = await _contextFactory.CreateDbContextAsync();
            var currentBackgroundTaskState = await dbContext.BackgroundTasks.FindAsync(backgroundTask.Id);
            if (currentBackgroundTaskState == null)
            {
                _logger.LogError("在 PictureTaskProcessor 中找不到后台任务: TaskId={TaskId}", backgroundTask.Id);
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

                using var scope = _serviceProvider.CreateScope();
                var aiService = scope.ServiceProvider.GetRequiredService<IAiService>();
                var storageService = scope.ServiceProvider.GetRequiredService<IStorageService>();

                string contentRootPath = _environment.ContentRootPath; 

                if (picture.StorageType == StorageType.Local)
                {
                    localFilePath = Path.Combine(contentRootPath, originalFilePathFromPayload.TrimStart('/'));
                }
                else
                {
                    await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 15, currentBackgroundTaskState: currentBackgroundTaskState);
                    localFilePath = await storageService.ExecuteAsync(picture.StorageType,
                        provider => provider.DownloadFileAsync(originalFilePathFromPayload));
                    isTempFile = true;
                }

                if (string.IsNullOrEmpty(localFilePath) || !File.Exists(localFilePath))
                {
                    throw new Exception($"找不到图片文件: {localFilePath} (源路径: {originalFilePathFromPayload})");
                }

                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 20, currentBackgroundTaskState: currentBackgroundTaskState);
                thumbnailForAI = localFilePath;

                if (string.IsNullOrEmpty(picture.ThumbnailPath))
                {
                    var tempThumbContainer = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
                    Directory.CreateDirectory(tempThumbContainer);
                    var thumbnailDiskPath = Path.Combine(tempThumbContainer, Path.GetFileNameWithoutExtension(Path.GetFileName(localFilePath)) + "_thumb.webp");

                    await ImageHelper.CreateThumbnailAsync(localFilePath, thumbnailDiskPath, 500);
                    thumbnailForAI = thumbnailDiskPath;

                    await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 25, currentBackgroundTaskState: currentBackgroundTaskState);

                    await using var thumbnailFileStream = new FileStream(thumbnailDiskPath, FileMode.Open, FileAccess.Read);
                    var thumbnailStorageFileName = Path.GetFileNameWithoutExtension(picture.Path.Split('/').LastOrDefault() ?? picture.Name) + "_thumb.webp";

                    string storedThumbnailPath = await storageService.ExecuteAsync(
                        picture.StorageType,
                        provider => provider.SaveAsync(thumbnailFileStream, thumbnailStorageFileName, "image/webp"));
                    picture.ThumbnailPath = storedThumbnailPath;

                    if (Directory.Exists(tempThumbContainer)) Directory.Delete(tempThumbContainer, true);
                }
                else
                {
                    if (picture.StorageType != StorageType.Local && !string.IsNullOrEmpty(picture.ThumbnailPath))
                    {
                        thumbnailForAI = await storageService.ExecuteAsync(picture.StorageType,
                            provider => provider.DownloadFileAsync(picture.ThumbnailPath));
                    }
                    else if (!string.IsNullOrEmpty(picture.ThumbnailPath))
                    {
                        // 对于本地存储的缩略图，也基于 ContentRootPath 构建路径
                        thumbnailForAI = Path.Combine(contentRootPath, picture.ThumbnailPath.TrimStart('/'));
                    }
                }

                if (!File.Exists(thumbnailForAI) && isTempFile) // If thumbnailForAI was meant to be a temp file but doesn't exist, re-download or handle
                {
                    _logger.LogWarning("AI分析所需的缩略图文件不存在: {ThumbnailPath}", thumbnailForAI);
                    // Fallback or error handling if thumbnailForAI is critical
                    if (string.IsNullOrEmpty(picture.ThumbnailPath) || picture.StorageType == StorageType.Local)
                    {
                        thumbnailForAI = localFilePath; // Fallback to original if thumbnail is missing and was supposed to be local or not generated
                    }
                    else
                    {
                        // Attempt to re-download if it was from remote storage
                        thumbnailForAI = await storageService.ExecuteAsync(picture.StorageType, provider => provider.DownloadFileAsync(picture.ThumbnailPath!));
                        if (!File.Exists(thumbnailForAI)) throw new Exception($"无法获取用于AI分析的缩略图: {picture.ThumbnailPath}");
                    }
                }


                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 30, currentBackgroundTaskState: currentBackgroundTaskState);
                var exifInfo = await ImageHelper.ExtractExifInfoAsync(localFilePath);
                picture.ExifInfo = exifInfo;
                picture.TakenAt = ImageHelper.ParseExifDateTime(exifInfo.DateTimeOriginal);
                await dbContext.SaveChangesAsync();

                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 50, currentBackgroundTaskState: currentBackgroundTaskState);
                string base64Image = await ImageHelper.ConvertImageToBase64(thumbnailForAI);
                var (title, description) = await aiService.AnalyzeImageAsync(base64Image);

                string finalTitle = !string.IsNullOrWhiteSpace(title) && title != "AI生成的标题" ? title : Path.GetFileNameWithoutExtension(picture.Name);
                string finalDescription = !string.IsNullOrWhiteSpace(description) && description != "AI生成的描述" ? description : picture.Description;
                picture.Name = finalTitle;
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

                await dbContext.SaveChangesAsync();
                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Completed, 100, completedAt: DateTime.UtcNow, currentBackgroundTaskState: currentBackgroundTaskState);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "图片处理任务失败: TaskId={TaskId}, PictureId={PictureId}", currentBackgroundTaskState.Id, pictureId);
                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Failed, currentBackgroundTaskState.Progress, ex.Message, currentBackgroundTaskState: currentBackgroundTaskState);
                if (picture != null)
                {
                    // Potentially update picture entity itself if needed, though task failure is primary
                    await dbContext.SaveChangesAsync();
                }
            }
            finally
            {
                if (isTempFile && File.Exists(localFilePath))
                {
                    try { File.Delete(localFilePath); } catch (Exception ex) { _logger.LogWarning(ex, "删除临时主图片文件失败: {FilePath}", localFilePath); }
                }
                bool thumbnailIsTemp = thumbnailForAI.StartsWith(Path.GetTempPath());
                if (thumbnailIsTemp && thumbnailForAI != localFilePath && File.Exists(thumbnailForAI))
                {
                    try { File.Delete(thumbnailForAI); } catch (Exception ex) { _logger.LogWarning(ex, "删除临时缩略图文件失败: {FilePath}", thumbnailForAI); }
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
                taskToUpdate.ErrorMessage = string.IsNullOrEmpty(error) ? taskToUpdate.ErrorMessage : error;
                if (startedAt.HasValue) taskToUpdate.StartedAt = startedAt;
                if (completedAt.HasValue) taskToUpdate.CompletedAt = completedAt;

                if ((status == TaskExecutionStatus.Completed || status == TaskExecutionStatus.Failed) && !taskToUpdate.StartedAt.HasValue)
                {
                    taskToUpdate.StartedAt = taskToUpdate.CreatedAt;
                }
                if (status == TaskExecutionStatus.Completed || status == TaskExecutionStatus.Failed)
                {
                    taskToUpdate.CompletedAt ??= DateTime.UtcNow;
                }


                await dbContext.SaveChangesAsync();
                _logger.LogInformation("任务状态更新 (Processor): TaskId={TaskId}, Status={Status}, Progress={Progress}%", taskId, status, progress);
            }
            else
            {
                _logger.LogWarning("尝试在 Processor 中更新不存在的任务状态: TaskId={TaskId}", taskId);
            }
        }
    }
}
