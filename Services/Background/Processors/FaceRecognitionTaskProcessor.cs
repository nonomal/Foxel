using Foxel.Models.DataBase;
using Foxel.Services.Configuration;
using Foxel.Services.Storage;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Foxel.Services.Background.Processors
{
    public class FaceRecognitionPayload
    {
        public int PictureId { get; set; }
        public int? UserIdForPicture { get; set; }
    }

    public class FaceRecognitionResponse
    {
        [JsonPropertyName("detector_backend")]
        public string DetectorBackend { get; set; } = string.Empty;

        [JsonPropertyName("recognition_model")]
        public string RecognitionModel { get; set; } = string.Empty;

        [JsonPropertyName("result")]
        public List<FaceResult> Result { get; set; } = new();
    }

    public class FaceResult
    {
        [JsonPropertyName("embedding")]
        public float[] Embedding { get; set; } = Array.Empty<float>();

        [JsonPropertyName("facial_area")]
        public FacialAreaResponse FacialArea { get; set; } = new();

        [JsonPropertyName("face_confidence")]
        public double FaceConfidence { get; set; }
    }

    public class FacialAreaResponse
    {
        [JsonPropertyName("x")]
        public int X { get; set; }

        [JsonPropertyName("y")]
        public int Y { get; set; }

        [JsonPropertyName("w")]
        public int W { get; set; }

        [JsonPropertyName("h")]
        public int H { get; set; }
    }

    public class FaceRecognitionTaskProcessor : ITaskProcessor
    {
        private readonly IDbContextFactory<MyDbContext> _contextFactory;
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfigService _configService;
        private readonly ILogger<FaceRecognitionTaskProcessor> _logger;
        private readonly HttpClient _httpClient;


        public FaceRecognitionTaskProcessor(
            IDbContextFactory<MyDbContext> contextFactory,
            IServiceProvider serviceProvider,
            IConfigService configService,
            ILogger<FaceRecognitionTaskProcessor> logger,
            HttpClient httpClient)
        {
            _contextFactory = contextFactory;
            _serviceProvider = serviceProvider;
            _logger = logger;
            _httpClient = httpClient;
            _configService = configService;
        }

        public async Task ProcessAsync(BackgroundTask backgroundTask)
        {
            if (backgroundTask.Payload == null)
            {
                await UpdateTaskStatusInDb(backgroundTask.Id, TaskExecutionStatus.Failed, 0, "任务 Payload 为空。");
                _logger.LogError("人脸识别任务 Payload 为空: TaskId={TaskId}", backgroundTask.Id);
                return;
            }

            FaceRecognitionPayload? payload;
            try
            {
                payload = JsonSerializer.Deserialize<FaceRecognitionPayload>(backgroundTask.Payload);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "无法解析人脸识别任务的 Payload: TaskId={TaskId}", backgroundTask.Id);
                await UpdateTaskStatusInDb(backgroundTask.Id, TaskExecutionStatus.Failed, 0, "Payload 解析失败。");
                return;
            }

            if (payload == null || payload.PictureId == 0)
            {
                _logger.LogError("人脸识别任务的 Payload 无效或缺少 PictureId: TaskId={TaskId}", backgroundTask.Id);
                await UpdateTaskStatusInDb(backgroundTask.Id, TaskExecutionStatus.Failed, 0, "Payload 无效或缺少 PictureId。");
                return;
            }

            var pictureId = payload.PictureId;
            string tempImagePath = string.Empty;
            bool isTempFile = false;

            await using var dbContext = await _contextFactory.CreateDbContextAsync();
            var currentBackgroundTaskState = await dbContext.BackgroundTasks.FindAsync(backgroundTask.Id);
            if (currentBackgroundTaskState == null)
            {
                _logger.LogError("在 FaceRecognitionTaskProcessor 中找不到后台任务: TaskId={TaskId}", backgroundTask.Id);
                return;
            }

            var picture = await dbContext.Pictures
                .Include(p => p.StorageMode)
                .FirstOrDefaultAsync(p => p.Id == pictureId);

            try
            {
                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 10,
                    currentBackgroundTaskState: currentBackgroundTaskState);

                if (picture == null)
                {
                    throw new Exception($"找不到ID为{pictureId}的图片。");
                }

                if (picture.StorageMode == null || picture.StorageModeId < 0)
                {
                    throw new Exception($"图片ID {pictureId} 缺少有效的 StorageMode 配置。");
                }

                using var scope = _serviceProvider.CreateScope();
                var storageService = scope.ServiceProvider.GetRequiredService<IStorageService>();

                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 20,
                    currentBackgroundTaskState: currentBackgroundTaskState);

                // 下载图片文件用于人脸识别
                tempImagePath = await storageService.ExecuteAsync(picture.StorageModeId,
                    provider => provider.DownloadFileAsync(picture.Path));
                isTempFile = true;

                if (string.IsNullOrEmpty(tempImagePath) || !File.Exists(tempImagePath))
                {
                    throw new Exception($"找不到用于人脸识别的图片文件: {tempImagePath}");
                }

                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 40,
                    currentBackgroundTaskState: currentBackgroundTaskState);

                // 调用人脸识别 API
                var faceRecognitionResult = await CallFaceRecognitionApiAsync(tempImagePath);

                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Processing, 70,
                    currentBackgroundTaskState: currentBackgroundTaskState);

                // 保存人脸数据到数据库
                if (faceRecognitionResult?.Result != null && faceRecognitionResult.Result.Any())
                {
                    foreach (var faceResult in faceRecognitionResult.Result)
                    {
                        var face = new Face
                        {
                            PictureId = pictureId,
                            Embedding = faceResult.Embedding,
                            X = faceResult.FacialArea.X,
                            Y = faceResult.FacialArea.Y,
                            W = faceResult.FacialArea.W,
                            H = faceResult.FacialArea.H,
                            FaceConfidence = faceResult.FaceConfidence
                        };

                        dbContext.Faces.Add(face);
                    }

                    await dbContext.SaveChangesAsync();
                    _logger.LogInformation("为图片 {PictureId} 检测到 {FaceCount} 个人脸", pictureId, faceRecognitionResult.Result.Count);
                }
                else
                {
                    _logger.LogInformation("图片 {PictureId} 未检测到人脸", pictureId);
                }

                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Completed, 100,
                    completedAt: DateTime.UtcNow, currentBackgroundTaskState: currentBackgroundTaskState);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "人脸识别任务失败: TaskId={TaskId}, PictureId={PictureId}",
                    currentBackgroundTaskState.Id, pictureId);
                await UpdateTaskStatusInDb(currentBackgroundTaskState.Id, TaskExecutionStatus.Failed,
                    currentBackgroundTaskState.Progress, ex.Message,
                    currentBackgroundTaskState: currentBackgroundTaskState);
            }
            finally
            {
                if (isTempFile && File.Exists(tempImagePath))
                {
                    try
                    {
                        File.Delete(tempImagePath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "删除临时人脸识别图片文件失败: {FilePath}", tempImagePath);
                    }
                }
            }
        }

        private async Task<FaceRecognitionResponse?> CallFaceRecognitionApiAsync(string imagePath)
        {
            string FaceApiUrl = _configService["FaceRecognition:ApiEndpoint"];
            string ApiKey = _configService["FaceRecognition:ApiKey"];
            using var form = new MultipartFormDataContent();
            using var fileStream = new FileStream(imagePath, FileMode.Open, FileAccess.Read);
            using var fileContent = new StreamContent(fileStream);

            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
            form.Add(fileContent, "file", Path.GetFileName(imagePath));

            using var request = new HttpRequestMessage(HttpMethod.Post, FaceApiUrl);
            request.Headers.Add("api-key", ApiKey);
            request.Content = form;

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                throw new Exception($"人脸识别 API 调用失败: {response.StatusCode}, {errorContent}");
            }

            var jsonContent = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<FaceRecognitionResponse>(jsonContent);
        }

        private async Task UpdateTaskStatusInDb(Guid taskId, TaskExecutionStatus status, int progress,
            string? error = null, DateTime? startedAt = null, DateTime? completedAt = null,
            BackgroundTask? currentBackgroundTaskState = null)
        {
            await using var dbContext = await _contextFactory.CreateDbContextAsync();
            var taskToUpdate = currentBackgroundTaskState ?? await dbContext.BackgroundTasks.FindAsync(taskId);

            if (taskToUpdate != null)
            {
                if (currentBackgroundTaskState != null &&
                    dbContext.Entry(currentBackgroundTaskState).State == EntityState.Detached)
                {
                    dbContext.BackgroundTasks.Attach(currentBackgroundTaskState);
                }

                taskToUpdate.Status = status;
                taskToUpdate.Progress = progress;
                taskToUpdate.ErrorMessage = string.IsNullOrEmpty(error) ? taskToUpdate.ErrorMessage : error;
                if (startedAt.HasValue) taskToUpdate.StartedAt = startedAt;
                if (completedAt.HasValue) taskToUpdate.CompletedAt = completedAt;

                if ((status == TaskExecutionStatus.Completed || status == TaskExecutionStatus.Failed) &&
                    !taskToUpdate.StartedAt.HasValue)
                {
                    taskToUpdate.StartedAt = taskToUpdate.CreatedAt;
                }

                if (status == TaskExecutionStatus.Completed || status == TaskExecutionStatus.Failed)
                {
                    taskToUpdate.CompletedAt ??= DateTime.UtcNow;
                }

                await dbContext.SaveChangesAsync();
                _logger.LogInformation(
                    "任务状态更新 (FaceRecognitionProcessor): TaskId={TaskId}, Status={Status}, Progress={Progress}%",
                    taskId, status, progress);
            }
            else
            {
                _logger.LogWarning("尝试在 FaceRecognitionProcessor 中更新不存在的任务状态: TaskId={TaskId}", taskId);
            }
        }
    }
}
