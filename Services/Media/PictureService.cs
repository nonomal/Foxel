using System.Text.Json;
using Foxel.Models;
using Foxel.Models.DataBase;
using Foxel.Models.Enums;
using Foxel.Models.Response.Picture;
using Foxel.Services.AI;
using Foxel.Services.Background;
using Foxel.Services.Configuration;
using Foxel.Services.Storage;
using Foxel.Services.Mapping;
using Foxel.Services.VectorDb;
using Foxel.Repositories;
using Foxel.Utils;

namespace Foxel.Services.Media;

public class PictureService(
    PictureRepository pictureRepository,
    FavoriteRepository favoriteRepository,
    AlbumRepository albumRepository,
    UserRepository userRepository,
    TagRepository tagRepository,
    StorageModeRepository storageModeRepository,
    AiService embeddingService,
    ConfigService configuration,
    IBackgroundTaskQueue backgroundTaskQueue,
    IVectorDbService vectorDbService,
    IStorageService storageService,
    MappingService mappingService,
    ILogger<PictureService> logger)
    : IPictureService
{

    public async Task<PaginatedResult<PictureResponse>> GetPicturesAsync(
        int page = 1,
        int pageSize = 8,
        string? searchQuery = null,
        List<string>? tags = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? userId = null,
        string? sortBy = "newest",
        bool? onlyWithGps = false,
        bool useVectorSearch = false,
        double similarityThreshold = 0.36,
        int? excludeAlbumId = null,
        int? albumId = null,
        bool onlyFavorites = false,
        int? ownerId = null,
        bool includeAllPublic = false
    )
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 8;

        if (useVectorSearch && !string.IsNullOrWhiteSpace(searchQuery))
        {
            try
            {
                return await PerformVectorSearchAsync(
                    page, pageSize, searchQuery, userId);
            }
            catch (Exception ex)
            {
                logger.LogWarning("向量搜索失败，回退到标准搜索: {Message}", ex.Message);
                if (ex.Message.Contains("请检查嵌入模型配置"))
                {
                    throw;
                }
            }
        }

        return await PerformStandardSearchAsync(
            page, pageSize, searchQuery, tags,
            startDate, endDate, userId, sortBy, onlyWithGps,
            excludeAlbumId, albumId, onlyFavorites, ownerId, includeAllPublic);
    }

    private async Task<PaginatedResult<PictureResponse>> PerformVectorSearchAsync(
        int page,
        int pageSize,
        string searchQuery,
        int? userId)
    {
        var queryEmbedding = await embeddingService.GetEmbeddingAsync(searchQuery);
        var res = await vectorDbService.SearchAsync(queryEmbedding, userId);

        var ids = res.Select(r => r.Id).ToList();
        var picturesData = await pictureRepository.GetPicturesByIdsAsync(ids.Select(id => (int)id));

        var picturesOrdered = ids
            .Select(id => picturesData.FirstOrDefault(p => p.Id == (int)id))
            .Where(p => p != null)
            .ToList();

        var paginatedResults = picturesOrdered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => mappingService.MapPictureToResponse(p!))
            .ToList();

        var totalCount = picturesOrdered.Count;

        await PopulateFavoriteInfo(paginatedResults, userId);

        if (userId.HasValue)
        {
            await PopulateAlbumInfo(paginatedResults, userId.Value);
        }

        return new PaginatedResult<PictureResponse>
        {
            Data = paginatedResults,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    // 执行标准搜索
    private async Task<PaginatedResult<PictureResponse>> PerformStandardSearchAsync(
        int page,
        int pageSize,
        string? searchQuery,
        List<string>? tags,
        DateTime? startDate,
        DateTime? endDate,
        int? userId,
        string? sortBy,
        bool? onlyWithGps,
        int? excludeAlbumId,
        int? albumId,
        bool onlyFavorites,
        int? ownerId,
        bool includeAllPublic)
    {
        var (picturesData, totalCount) = await pictureRepository.GetPicturesWithFiltersAsync(
            page, pageSize, searchQuery, tags, startDate, endDate, userId, sortBy,
            onlyWithGps, excludeAlbumId, albumId, onlyFavorites, ownerId, includeAllPublic);

        // 转换为响应格式
        var pictures = picturesData
            .Select(p => mappingService.MapPictureToResponse(p))
            .ToList();

        // 处理收藏信息和相册信息
        await PopulateAdditionalInfo(pictures, userId);

        return new PaginatedResult<PictureResponse>
        {
            Data = pictures,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    // 统一处理附加信息（收藏和相册）
    private async Task PopulateAdditionalInfo(List<PictureResponse> pictures, int? userId)
    {
        await PopulateFavoriteInfo(pictures, userId);

        if (userId.HasValue)
        {
            await PopulateAlbumInfo(pictures, userId.Value);
        }
    }

    // 填充收藏信息
    private async Task PopulateFavoriteInfo(List<PictureResponse> pictures, int? userId)
    {
        if (!pictures.Any())
            return;

        var pictureIds = pictures.Select(p => p.Id).ToList();

        if (userId.HasValue)
        {
            // 获取用户收藏的图片ID
            var favoritedPictureIds = await favoriteRepository.GetUserFavoritedPictureIdsAsync(userId.Value, pictureIds);

            foreach (var picture in pictures)
            {
                picture.IsFavorited = favoritedPictureIds.Contains(picture.Id);
            }
        }
        else
        {
            foreach (var picture in pictures)
            {
                picture.IsFavorited = false; // 用户未登录，不可能收藏
            }
        }

        // 获取所有图片的收藏总数
        var favoriteCounts = await favoriteRepository.GetFavoriteCountsAsync(pictureIds);
        foreach (var picture in pictures)
        {
            picture.FavoriteCount = favoriteCounts.GetValueOrDefault(picture.Id, 0);
        }
    }

    // 填充相册信息
    private async Task PopulateAlbumInfo(List<PictureResponse> pictures, int userId)
    {
        if (!pictures.Any())
            return;

        // 获取当前用户拥有的图片ID列表
        var userPictureIds = pictures
            .Where(p => p.UserId == userId)
            .Select(p => p.Id)
            .ToList();

        if (!userPictureIds.Any())
            return;

        // 获取相册信息
        var pictureAlbums = await pictureRepository.GetPictureAlbumInfoAsync(userId, userPictureIds);

        // 填充相册信息到图片响应中
        foreach (var picture in pictures)
        {
            if (picture.UserId == userId && pictureAlbums.TryGetValue(picture.Id, out var albumInfo))
            {
                picture.AlbumId = albumInfo.AlbumId;
                picture.AlbumName = albumInfo.AlbumName;
            }
        }
    }

    public async Task<(PictureResponse Picture, int Id)> UploadPictureAsync(
        string fileName,
        Stream fileStream,
        string contentType,
        int? userId,
        PermissionType permission = PermissionType.Public,
        int? albumId = null,
        int? storageModeId = null)
    {
        if (!storageModeId.HasValue)
        {
            string configKey = userId == null
                ? "Storage:DefaultStorageModeId"
                : "Storage:DefaultStorageModeId";
            string? defaultMode = configuration[configKey];

            if (string.IsNullOrEmpty(defaultMode))
            {
                logger.LogError("未配置默认存储模式ID: {ConfigKey}", configKey);
                throw new InvalidOperationException($"未配置默认存储模式: {configKey}");
            }

            var defaultStorageMode = await storageModeRepository.GetEnabledByIdAsync(int.Parse(defaultMode));
            if (defaultStorageMode == null)
            {
                logger.LogError("根据ID '{DefaultModeId}' 找不到已启用的默认存储模式。", defaultMode);
                throw new InvalidOperationException($"找不到默认存储模式 '{defaultMode}'。");
            }

            storageModeId = defaultStorageMode.Id;
        }
        else
        {
            var specifiedMode = await storageModeRepository.GetEnabledByIdAsync(storageModeId.Value);
            if (specifiedMode == null)
            {
                throw new ArgumentException($"找不到或未启用 ID 为 {storageModeId.Value} 的存储模式。");
            }
        }

        ImageFormat convertToFormat = ImageFormat.WebP;

        // 高清图片压缩质量
        int quality = 100; // 默认值
        string hdQualityConfigKey = "Upload:HighQualityImageCompressionQuality";
        string? hdQualityConfig = configuration[hdQualityConfigKey];
        if (!string.IsNullOrEmpty(hdQualityConfig) && int.TryParse(hdQualityConfig, out int parsedHdQuality))
        {
            quality = Math.Clamp(parsedHdQuality, 50, 100); // 限制在 50-100 之间
        }
        else
        {
            logger.LogWarning("配置项 '{ConfigKey}' 未找到或无效，使用默认压缩质量: {DefaultQuality}", hdQualityConfigKey, quality);
        }

        string baseName = Guid.NewGuid().ToString();
        string originalFileExtension = Path.GetExtension(fileName);
        string originalStorageFileName = $"{baseName}{originalFileExtension}";

        string? tempOriginalLocalPath = null;
        string? tempConvertedHdLocalPath = null;
        string? tempThumbnailLocalPath = null;

        string? storedThumbnailPath = null;

        try
        {
            tempOriginalLocalPath = Path.GetTempFileName() + originalFileExtension;
            File.Move(Path.GetTempFileName(), tempOriginalLocalPath);
            await using (var tempFileStream = new FileStream(tempOriginalLocalPath, FileMode.Create))
            {
                await fileStream.CopyToAsync(tempFileStream);
            }

            string storedOriginalPath;
            await using (var originalLocalStream =
                         new FileStream(tempOriginalLocalPath, FileMode.Open, FileAccess.Read))
            {
                storedOriginalPath = await storageService.ExecuteAsync(storageModeId.Value,
                    provider => provider.SaveAsync(originalLocalStream, originalStorageFileName, contentType));
            }

            string sourceForHdProcessing = tempOriginalLocalPath;

            string convertedExtension = ImageHelper.GetFileExtensionFromFormat(convertToFormat);
            var hdStorageFileName = $"{baseName}-high-definition{convertedExtension}";
            var hdContentType = ImageHelper.GetMimeTypeFromFormat(convertToFormat);

            tempConvertedHdLocalPath = Path.GetTempFileName() + convertedExtension;
            File.Move(Path.GetTempFileName(), tempConvertedHdLocalPath);

            await ImageHelper.ConvertImageFormatAsync(sourceForHdProcessing, tempConvertedHdLocalPath, convertToFormat,
                quality);

            await using var convertedHdStream =
                new FileStream(tempConvertedHdLocalPath!, FileMode.Open, FileAccess.Read);
            var storedHdPath = await storageService.ExecuteAsync(storageModeId.Value,
                provider => provider.SaveAsync(convertedHdStream, hdStorageFileName!, hdContentType!));

            try
            {
                // 缩略图最大宽度
                int thumbnailMaxWidth = 500; // 默认值
                string thumbnailMaxWidthConfigKey = "Upload:ThumbnailMaxWidth";
                string? thumbnailMaxWidthConfig = configuration[thumbnailMaxWidthConfigKey];
                if (!string.IsNullOrEmpty(thumbnailMaxWidthConfig) && int.TryParse(thumbnailMaxWidthConfig, out int parsedMaxWidth))
                {
                    thumbnailMaxWidth = Math.Max(100, parsedMaxWidth); // 最小宽度 100
                }
                else
                {
                    logger.LogWarning("配置项 '{ConfigKey}' 未找到或无效，使用默认缩略图最大宽度: {DefaultMaxWidth}", thumbnailMaxWidthConfigKey, thumbnailMaxWidth);
                }

                // 缩略图压缩质量
                int thumbnailQuality = 75; // 默认值
                string thumbnailQualityConfigKey = "Upload:ThumbnailCompressionQuality";
                string? thumbnailQualityConfig = configuration[thumbnailQualityConfigKey];
                if (!string.IsNullOrEmpty(thumbnailQualityConfig) && int.TryParse(thumbnailQualityConfig, out int parsedThumbQuality))
                {
                    thumbnailQuality = Math.Clamp(parsedThumbQuality, 30, 90); // 限制在 30-90 之间
                }
                else
                {
                    logger.LogWarning("配置项 '{ConfigKey}' 未找到或无效，使用默认缩略图压缩质量: {DefaultThumbQuality}", thumbnailQualityConfigKey, thumbnailQuality);
                }

                tempThumbnailLocalPath = Path.GetTempFileName() + ".webp";
                File.Move(Path.GetTempFileName(), tempThumbnailLocalPath);
                await ImageHelper.CreateThumbnailAsync(tempOriginalLocalPath, tempThumbnailLocalPath, thumbnailMaxWidth, thumbnailQuality);

                string thumbnailUploadFileName = $"{baseName}-thumbnail.webp";
                await using var thumbnailFileStream =
                    new FileStream(tempThumbnailLocalPath!, FileMode.Open, FileAccess.Read);
                storedThumbnailPath = await storageService.ExecuteAsync(storageModeId.Value,
                    provider => provider.SaveAsync(thumbnailFileStream, thumbnailUploadFileName!, "image/webp"));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "生成和上传缩略图失败 during initial upload");
            }

            string initialTitle = Path.GetFileNameWithoutExtension(fileName);
            string initialDescription = $"Uploaded on {DateTime.UtcNow}";

            User? user = null;
            if (userId is not null)
            {
                user = await userRepository.GetByIdAsync(userId.Value);
                if (user == null) throw new Exception("找不到指定的用户");
            }

            if (albumId.HasValue)
            {
                var album = await albumRepository.GetByIdWithIncludesAsync(albumId.Value);

                if (album == null)
                {
                    throw new KeyNotFoundException($"找不到ID为{albumId.Value}的相册");
                }

                if (album.User?.Id != userId)
                {
                    throw new Exception("您无权将图片添加到此相册");
                }
            }

            // 创建图片对象并保存到数据库
            var picture = new Picture
            {
                Name = initialTitle,
                Description = initialDescription,
                OriginalPath = storedOriginalPath,
                Path = storedHdPath,
                ThumbnailPath = storedThumbnailPath,
                User = user,
                Permission = permission,
                AlbumId = albumId,
                StorageModeId = storageModeId.Value,
            };

            await pictureRepository.AddAsync(picture);
            await pictureRepository.SaveChangesAsync();

            if (userId != null)
            {
                await backgroundTaskQueue.QueuePictureProcessingTaskAsync(picture.Id, picture.OriginalPath);
                var visualRecognitionPayload = new Background.Processors.VisualRecognitionPayload
                {
                    PictureId = picture.Id,
                    UserIdForPicture = picture.UserId
                };
                await backgroundTaskQueue.QueueVisualRecognitionTaskAsync(visualRecognitionPayload);

                // 添加人脸识别任务
                var faceRecognitionPayload = new Background.Processors.FaceRecognitionPayload
                {
                    PictureId = picture.Id,
                    UserIdForPicture = picture.UserId
                };
                await backgroundTaskQueue.QueueFaceRecognitionTaskAsync(faceRecognitionPayload);
            }

            var pictureResponse = mappingService.MapPictureToResponse(picture);
            return (pictureResponse, picture.Id);
        }
        finally
        {
            if (!string.IsNullOrEmpty(tempOriginalLocalPath) && File.Exists(tempOriginalLocalPath))
            {
                try
                {
                    File.Delete(tempOriginalLocalPath);
                    Console.WriteLine(tempOriginalLocalPath);
                }
                catch
                {
                    /* ignored */
                }
            }

            if (!string.IsNullOrEmpty(tempConvertedHdLocalPath) && File.Exists(tempConvertedHdLocalPath))
            {
                try
                {
                    File.Delete(tempConvertedHdLocalPath);
                    Console.WriteLine(tempConvertedHdLocalPath);
                }
                catch
                {
                    /* ignored */
                }
            }

            if (!string.IsNullOrEmpty(tempThumbnailLocalPath) && File.Exists(tempThumbnailLocalPath))
            {
                try
                {
                    File.Delete(tempThumbnailLocalPath);
                    Console.WriteLine(tempThumbnailLocalPath);


                }
                catch
                {
                    /* ignored */
                }
            }
        }
    }

    public async Task<ExifInfo> GetPictureExifInfoAsync(int pictureId)
    {
        var picture = await pictureRepository.GetByIdAsync(pictureId);

        if (picture == null)
            throw new KeyNotFoundException($"找不到ID为{pictureId}的图片");

        // 如果已有保存的EXIF信息，则直接返回
        if (!string.IsNullOrEmpty(picture.ExifInfoJson))
        {
            var exifInfo = JsonSerializer.Deserialize<ExifInfo>(picture.ExifInfoJson);
            return exifInfo ?? new ExifInfo { ErrorMessage = "无法解析EXIF信息" };
        }

        // 否则从文件中提取
        string fullPath = Path.Combine(Directory.GetCurrentDirectory(), picture.Path.TrimStart('/'));
        if (!File.Exists(fullPath))
        {
            return new ExifInfo { ErrorMessage = "找不到图片文件" };
        }

        return await ImageHelper.ExtractExifInfoAsync(fullPath);
    }

    public async Task<Dictionary<int, (bool Success, string? ErrorMessage, int? UserId)>> DeleteMultiplePicturesAsync(
        List<int> pictureIds)
    {
        var results = new Dictionary<int, (bool Success, string? ErrorMessage, int? UserId)>();
        if (pictureIds.Count == 0)
            return results;

        // 获取要删除的图片信息
        var picturesToDelete = await pictureRepository.GetPicturesByIdsAsync(pictureIds);
        var pictureInfos = picturesToDelete.Select(p => new
        {
            p.Id,
            p.Path,
            p.ThumbnailPath,
            p.OriginalPath,
            UserId = p.User?.Id,
            p.StorageModeId
        }).ToList();

        var foundPictureIds = pictureInfos.Select(p => p.Id).ToHashSet();
        foreach (var id in pictureIds.Where(id => !foundPictureIds.Contains(id)))
        {
            results[id] = (false, "找不到此图片", null);
        }

        // 从数据库中删除记录
        if (pictureInfos.Any())
        {
            var idsToRemove = pictureInfos.Select(p => p.Id).ToList();
            await pictureRepository.DeletePicturesByIdsAsync(idsToRemove);
        }

        // 从存储中删除文件
        foreach (var picInfo in pictureInfos)
        {
            try
            {
                string? errorMsg = null;
                if (picInfo.StorageModeId <= 0)
                {
                    results[picInfo.Id] = (false, "图片记录缺少有效的StorageModeId，无法删除文件。", picInfo.UserId);
                    logger.LogWarning("图片 {PictureId} 缺少 StorageModeId，跳过文件删除。", picInfo.Id);
                    continue;
                }

                try
                {
                    if (!string.IsNullOrEmpty(picInfo.OriginalPath))
                    {
                        await storageService.ExecuteAsync(picInfo.StorageModeId,
                            provider => provider.DeleteAsync(picInfo.OriginalPath));
                    }

                    if (!string.IsNullOrEmpty(picInfo.Path) && picInfo.Path != picInfo.OriginalPath)
                    {
                        await storageService.ExecuteAsync(picInfo.StorageModeId,
                            provider => provider.DeleteAsync(picInfo.Path));
                    }

                    if (!string.IsNullOrEmpty(picInfo.ThumbnailPath))
                    {
                        await storageService.ExecuteAsync(picInfo.StorageModeId,
                            provider => provider.DeleteAsync(picInfo.ThumbnailPath));
                    }
                }
                catch (Exception ex)
                {
                    errorMsg = $"数据库记录已删除，但删除文件失败: {ex.Message}";
                    logger.LogError(ex, "删除图片文件时出错 (ID: {PictureId})", picInfo.Id);
                }

                results[picInfo.Id] = (true, errorMsg, picInfo.UserId);
            }
            catch (Exception ex)
            {
                results[picInfo.Id] = (false, $"处理图片删除时出错: {ex.Message}", picInfo.UserId);
                logger.LogError(ex, "处理图片删除的外部循环出错 (ID: {PictureId})", picInfo.Id);
            }
        }

        return results;
    }

    public async Task<(PictureResponse Picture, int? UserId)> UpdatePictureAsync(
        int pictureId,
        string? name = null,
        string? description = null,
        List<string>? tags = null,
        PermissionType? permission = null)
    {
        var picture = await pictureRepository.GetPictureWithIncludesAsync(pictureId);

        if (picture == null)
            throw new KeyNotFoundException($"找不到ID为{pictureId}的图片");

        var userId = picture.User?.Id;

        if (!string.IsNullOrWhiteSpace(name))
        {
            picture.Name = name.Trim();
        }

        if (!string.IsNullOrWhiteSpace(description))
        {
            picture.Description = description.Trim();
        }

        if (permission.HasValue)
        {
            picture.Permission = permission.Value;
        }

        // 只有当名称或描述发生变化时才更新嵌入向量
        if (!string.IsNullOrWhiteSpace(name) || !string.IsNullOrWhiteSpace(description))
        {
            try
            {
                var combinedText = $"{picture.Name}. {picture.Description}";
                var embedding = await embeddingService.GetEmbeddingAsync(combinedText);

                // 只有在成功获取到非空嵌入向量时才更新
                if (embedding != null && embedding.Length > 0)
                {
                    picture.Embedding = embedding;
                }
                else
                {
                    // 记录获取到空向量的警告
                    logger.LogWarning("图片 {PictureId} 的嵌入向量为空，跳过向量更新", pictureId);
                }
            }
            catch (Exception ex)
            {
                // 记录错误但不抛出异常，允许其他字段的更新继续进行
                logger.LogError(ex, "更新图片 {PictureId} 的嵌入向量时出错", pictureId);
                // 不设置 picture.Embedding，保持原值不变
            }
        }

        if (tags != null)
        {
            picture.Tags?.Clear();

            foreach (var tagName in tags.Where(t => !string.IsNullOrWhiteSpace(t)))
            {
                var tag = await tagRepository.GetOrCreateTagAsync(tagName.Trim());
                picture.Tags?.Add(tag);
            }
        }

        picture.UpdatedAt = DateTime.UtcNow;

        await pictureRepository.UpdateAsync(picture);
        await pictureRepository.SaveChangesAsync();

        var pictureResponse = mappingService.MapPictureToResponse(picture);
        return (pictureResponse, userId);
    }

    public async Task<bool> FavoritePictureAsync(int pictureId, int userId)
    {
        // 检查图片是否存在
        var picture = await pictureRepository.GetByIdAsync(pictureId);
        if (picture == null)
            throw new KeyNotFoundException($"找不到ID为{pictureId}的图片");

        // 检查用户是否存在
        var user = await userRepository.GetByIdAsync(userId);
        if (user == null)
            throw new KeyNotFoundException($"找不到ID为{userId}的用户");

        // 尝试添加收藏
        var success = await favoriteRepository.AddFavoriteAsync(pictureId, userId);
        if (!success)
            throw new InvalidOperationException("您已经收藏过此图片");

        await favoriteRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UnfavoritePictureAsync(int pictureId, int userId)
    {
        var success = await favoriteRepository.RemoveFavoriteAsync(pictureId, userId);
        if (!success)
            throw new KeyNotFoundException($"未找到该图片的收藏记录");

        await favoriteRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> IsPictureFavoritedByUserAsync(int pictureId, int userId)
    {
        return await favoriteRepository.IsFavoritedByUserAsync(pictureId, userId);
    }

    public async Task<Picture?> GetPictureByIdAsync(int pictureId)
    {
        var picture = await pictureRepository.GetPictureWithIncludesAsync(pictureId);

        if (picture == null)
        {
            logger.LogWarning("GetPictureByIdAsync: Picture with ID {PictureId} not found.", pictureId);
            return null;
        }

        return picture;
    }
}