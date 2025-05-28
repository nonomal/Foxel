using System.Text.Json;
using Foxel.Models;
using Foxel.Models.DataBase;
using Foxel.Models.Enums;
using Foxel.Models.Response.Picture;
using Foxel.Services.AI;
using Foxel.Services.Attributes;
using Foxel.Services.Background;
using Foxel.Services.Configuration;
using Foxel.Services.Storage;
using Foxel.Utils;
using Microsoft.EntityFrameworkCore;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace Foxel.Services.Media;

public class PictureService(
    IDbContextFactory<MyDbContext> contextFactory,
    IAiService embeddingService,
    IConfigService configuration,
    IBackgroundTaskQueue backgroundTaskQueue,
    IStorageService storageService)
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

        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 决定是使用向量搜索还是普通搜索
        if (useVectorSearch && !string.IsNullOrWhiteSpace(searchQuery))
        {
            try
            {
                return await PerformVectorSearchAsync(
                    dbContext, page, pageSize, searchQuery, tags,
                    startDate, endDate, userId, onlyWithGps, similarityThreshold,
                    excludeAlbumId, albumId, onlyFavorites, ownerId, includeAllPublic);
            }
            catch (Exception ex)
            {
                // 如果向量搜索失败，记录错误并回退到标准搜索
                Console.WriteLine($"向量搜索失败，回退到标准搜索: {ex.Message}");
                
                // 如果是明确的配置错误，则向上抛出异常
                if (ex.Message.Contains("请检查嵌入模型配置"))
                {
                    throw;
                }
            }
        }
        
        // 执行标准搜索（作为默认方法或向量搜索的回退选项）
        return await PerformStandardSearchAsync(
            dbContext, page, pageSize, searchQuery, tags,
            startDate, endDate, userId, sortBy, onlyWithGps,
            excludeAlbumId, albumId, onlyFavorites, ownerId, includeAllPublic);
    }

    // 执行向量搜索
    private async Task<PaginatedResult<PictureResponse>> PerformVectorSearchAsync(
        MyDbContext dbContext,
        int page,
        int pageSize,
        string searchQuery,
        List<string>? tags,
        DateTime? startDate,
        DateTime? endDate,
        int? userId,
        bool? onlyWithGps,
        double similarityThreshold,
        int? excludeAlbumId,
        int? albumId,
        bool onlyFavorites,
        int? ownerId,
        bool includeAllPublic)
    {
        try
        {
            float[]? queryEmbedding = null;
            try
            {
                queryEmbedding = await embeddingService.GetEmbeddingAsync(searchQuery);
                
                // 检查嵌入向量是否有效
                if (queryEmbedding == null || queryEmbedding.Length == 0)
                {
                    throw new InvalidOperationException("嵌入模型返回了空向量");
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"向量搜索失败，请检查嵌入模型配置: {ex.Message}", ex);
            }
            
            var queryVector = new Vector(queryEmbedding);

            // 构建基础查询
            var query = dbContext.Pictures
                .Include(p => p.Tags)
                .Include(p => p.User)
                .Where(p => p.Embedding != null);

            // 应用共通的查询条件
            query = ApplyCommonFilters(query, tags, startDate, endDate, userId, onlyWithGps,
                excludeAlbumId, albumId, onlyFavorites, ownerId, includeAllPublic);

            // 执行向量搜索
            var allResults = await query
                .Select(p => new
                {
                    Picture = p,
                    Similarity = 1.0 - p.Embedding!.CosineDistance(queryVector)
                })
                .Where(p => p.Similarity >= similarityThreshold)
                .OrderByDescending(p => p.Similarity)
                .ToListAsync();

            // 计算总数并分页
            var totalCount = allResults.Count;

            var paginatedResults = allResults
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => MapPictureToResponse(r.Picture))
                .ToList();

            // 处理收藏信息
            await PopulateFavoriteInfo(dbContext, paginatedResults, userId);

            // 为当前用户的图片添加相册信息
            if (userId.HasValue)
            {
                await PopulateAlbumInfo(dbContext, paginatedResults, userId.Value);
            }

            return new PaginatedResult<PictureResponse>
            {
                Data = paginatedResults,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"向量搜索失败: {ex.Message}");
            throw new InvalidOperationException($"向量搜索失败: {ex.Message}", ex);
        }
    }

    // 执行标准搜索
    private async Task<PaginatedResult<PictureResponse>> PerformStandardSearchAsync(
        MyDbContext dbContext,
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
        // 构建基础查询
        IQueryable<Picture> query = dbContext.Pictures
            .Include(p => p.Tags)
            .Include(p => p.User);

        // 应用文本搜索条件
        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var searchTerm = searchQuery.ToLower();
            query = query.Where(p =>
                (p.Name.ToLower().Contains(searchTerm)) ||
                (p.Description.ToLower().Contains(searchTerm)));
        }

        // 应用共通的查询条件
        query = ApplyCommonFilters(query, tags, startDate, endDate, userId, onlyWithGps,
            excludeAlbumId, albumId, onlyFavorites, ownerId, includeAllPublic);

        // 应用排序
        query = ApplySorting(query, sortBy);

        // 获取总记录数
        var totalCount = await query.CountAsync();

        // 获取分页数据
        var picturesData = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // 转换为响应格式
        var pictures = picturesData
            .Select(p => MapPictureToResponse(p))
            .ToList();

        // 处理收藏信息
        await PopulateFavoriteInfo(dbContext, pictures, userId);

        // 为当前用户的图片添加相册信息
        if (userId.HasValue)
        {
            await PopulateAlbumInfo(dbContext, pictures, userId.Value);
        }

        return new PaginatedResult<PictureResponse>
        {
            Data = pictures,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    // 应用共通的过滤条件
    private IQueryable<Picture> ApplyCommonFilters(
        IQueryable<Picture> query,
        List<string>? tags,
        DateTime? startDate,
        DateTime? endDate,
        int? userId,
        bool? onlyWithGps,
        int? excludeAlbumId,
        int? albumId,
        bool onlyFavorites,
        int? ownerId,
        bool includeAllPublic)
    {
        // 应用标签筛选
        if (tags != null && tags.Any())
        {
            foreach (var tag in tags)
            {
                var tagName = tag.Trim();
                if (!string.IsNullOrEmpty(tagName))
                {
                    var normalizedTagName = tagName.ToLower();
                    query = query.Where(p => p.Tags!.Any(t => t.Name.ToLower().Equals(normalizedTagName)));
                }
            }
        }

        // 应用日期范围筛选
        if (startDate.HasValue)
        {
            DateTime utcStartDate = startDate.Value.ToUniversalTime();
            query = query.Where(p =>
                (p.TakenAt.HasValue && p.TakenAt >= utcStartDate) ||
                (!p.TakenAt.HasValue && p.CreatedAt >= utcStartDate));
        }

        if (endDate.HasValue)
        {
            DateTime utcEndDate = endDate.Value.ToUniversalTime().AddDays(1).AddMilliseconds(-1);
            query = query.Where(p =>
                (p.TakenAt.HasValue && p.TakenAt <= utcEndDate) ||
                (!p.TakenAt.HasValue && p.CreatedAt <= utcEndDate));
        }

        // 应用用户筛选和权限过滤逻辑
        if (ownerId.HasValue)
        {
            if (userId.HasValue && userId.Value == ownerId.Value)
            {
                query = query.Where(p => p.User != null && p.User.Id == ownerId.Value);
            }
            else
            {
                query = query.Where(p =>
                    p.User != null && p.User.Id == ownerId.Value && p.Permission == PermissionType.Public);
            }
        }
        else if (userId.HasValue)
        {
            if (includeAllPublic)
            {
                query = query.Where(p =>
                    (p.User != null && p.User.Id == userId.Value) ||
                    (p.User != null && p.User.Id != userId.Value &&
                     p.Permission == PermissionType.Public)
                );
            }
            else
            {
                query = query.Where(p => p.User != null && p.User.Id == userId.Value);
            }
        }
        else
        {
            query = query.Where(p => p.Permission == PermissionType.Public);
        }

        // 筛选有GPS信息的图片
        if (onlyWithGps == true)
        {
            query = query.Where(p =>
                p.ExifInfo != null &&
                !string.IsNullOrEmpty(p.ExifInfo.GpsLatitude) &&
                !string.IsNullOrEmpty(p.ExifInfo.GpsLongitude));
        }

        // 排除指定相册的图片
        if (excludeAlbumId.HasValue)
        {
            query = query.Where(p => p.AlbumId != excludeAlbumId.Value || p.AlbumId == null);
        }

        // 筛选指定相册的图片
        if (albumId.HasValue)
        {
            query = query.Where(p => p.AlbumId == albumId.Value);
        }

        // 筛选收藏的图片
        if (onlyFavorites && userId.HasValue)
        {
            query = query.Where(p => p.Favorites!.Any(f => f.User.Id == userId.Value));
        }

        return query;
    }

    // 应用排序
    private IQueryable<Picture> ApplySorting(IQueryable<Picture> query, string? sortBy)
    {
        return sortBy?.ToLower() switch
        {
            // 拍摄时间排序
            "takenat_desc" or "newest" => query.OrderByDescending(p => p.TakenAt ?? p.CreatedAt),
            "takenat_asc" or "oldest" => query.OrderBy(p => p.TakenAt ?? p.CreatedAt),

            // 上传时间排序
            "uploaddate_desc" => query.OrderByDescending(p => p.CreatedAt),
            "uploaddate_asc" => query.OrderBy(p => p.CreatedAt),

            // 名称排序
            "name_asc" or "name" => query.OrderBy(p => p.Name),
            "name_desc" => query.OrderByDescending(p => p.Name),

            // 默认排序
            _ => query.OrderByDescending(p => p.TakenAt ?? p.CreatedAt)
        };
    }

    // 将数据库实体映射到响应对象
    private PictureResponse MapPictureToResponse(Picture picture)
    {
        return new PictureResponse
        {
            Id = picture.Id,
            Name = picture.Name,
            Path = storageService.ExecuteAsync(picture.StorageType, provider => 
                Task.FromResult(provider.GetUrl(picture.Path ?? string.Empty))).Result,
            ThumbnailPath = storageService.ExecuteAsync(picture.StorageType, provider => 
                Task.FromResult(provider.GetUrl(picture.ThumbnailPath ?? string.Empty))).Result,
            Description = picture.Description,
            CreatedAt = picture.CreatedAt,
            Tags = picture.Tags != null ? picture.Tags.Select(t => t.Name).ToList() : new List<string>(),
            TakenAt = picture.TakenAt,
            ExifInfo = picture.ExifInfo ?? new ExifInfo(),
            UserId = picture.UserId,
            Username = picture.User?.UserName,
            AlbumId = picture.AlbumId,
            Permission = picture.Permission
        };
    }

    // 填充收藏信息
    private async Task PopulateFavoriteInfo(MyDbContext dbContext, List<PictureResponse> pictures, int? userId)
    {
        if (userId.HasValue && pictures.Any())
        {
            var pictureIds = pictures.Select(p => p.Id).ToList();

            // 获取用户收藏的图片ID
            var favoritedPictureIds = await dbContext.Favorites
                .Where(f => f.User.Id == userId.Value && pictureIds.Contains(f.PictureId))
                .Select(f => f.PictureId)
                .ToHashSetAsync(); // 使用 ToHashSetAsync 提高查找效率

            // 一次性获取所有相关图片的收藏总数
            var favoriteCounts = await dbContext.Favorites
                .Where(f => pictureIds.Contains(f.PictureId))
                .GroupBy(f => f.PictureId)
                .Select(g => new { PictureId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.PictureId, x => x.Count);

            foreach (var picture in pictures)
            {
                picture.IsFavorited = favoritedPictureIds.Contains(picture.Id);
                picture.FavoriteCount = favoriteCounts.GetValueOrDefault(picture.Id, 0);
            }
        }
        else if (pictures.Any()) // 如果用户未登录，仍然需要获取收藏总数
        {
            var pictureIds = pictures.Select(p => p.Id).ToList();
            var favoriteCounts = await dbContext.Favorites
                .Where(f => pictureIds.Contains(f.PictureId))
                .GroupBy(f => f.PictureId)
                .Select(g => new { PictureId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.PictureId, x => x.Count);

            foreach (var picture in pictures)
            {
                picture.IsFavorited = false; // 用户未登录，不可能收藏
                picture.FavoriteCount = favoriteCounts.GetValueOrDefault(picture.Id, 0);
            }
        }
    }

    // 填充相册信息
    private async Task PopulateAlbumInfo(MyDbContext dbContext, List<PictureResponse> pictures, int userId)
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
        var pictureAlbums = await dbContext.Pictures
            .Where(p => userPictureIds.Contains(p.Id) && p.AlbumId.HasValue)
            .Select(p => new { p.Id, p.AlbumId, AlbumName = p.Album!.Name })
            .ToDictionaryAsync(p => p.Id, p => new { p.AlbumId, p.AlbumName });

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
        StorageType? storageType = null)
    {
        StorageType GetConfigStorageType(string configKey)
        {
            string? configValue = configuration[configKey];
            return !string.IsNullOrEmpty(configValue) &&
                   Enum.TryParse<StorageType>(configValue, out var configStorageType)
                   ? configStorageType
                   : StorageType.Local;
        }

        if (userId == null)
        {
            storageType = GetConfigStorageType("Storage:AnonymousDefaultStorage");
        }
        else if (storageType == null)
        {
            storageType = GetConfigStorageType("Storage:DefaultStorage");
        }
        ImageFormat convertToFormat = ImageFormat.Original;
        string defaultFormatConfig = configuration["Upload:DefaultImageFormat"];
        if (!string.IsNullOrEmpty(defaultFormatConfig))
        {
            if (Enum.TryParse<ImageFormat>(defaultFormatConfig, true, out var parsedFormat))
            {
                convertToFormat = parsedFormat;
            }
        }
        int quality = 100;
        string defaultQualityConfig = configuration["Upload:DefaultImageQuality"];
        if (!string.IsNullOrEmpty(defaultQualityConfig))
        {
            quality = int.Parse(defaultQualityConfig);
        }
        string originalFileName = fileName;
        string finalFileName = fileName;
        string finalContentType = contentType;
        Stream finalStream = fileStream;

        // 如果需要格式转换
        if (convertToFormat != ImageFormat.Original)
        {
            // 创建临时文件保存原始上传内容
            string tempOriginalFile = Path.GetTempFileName();
            string tempConvertedFile = Path.GetTempFileName();

            try
            {
                // 保存原始文件到临时位置
                await using (var tempFileStream = new FileStream(tempOriginalFile, FileMode.Create))
                {
                    await fileStream.CopyToAsync(tempFileStream);
                }

                // 转换格式
                string convertedFilePath = await ImageHelper.ConvertImageFormatAsync(
                    tempOriginalFile, tempConvertedFile, convertToFormat, quality);

                // 更新文件信息
                string newExtension = ImageHelper.GetFileExtensionFromFormat(convertToFormat);
                finalFileName = Path.ChangeExtension(Path.GetFileNameWithoutExtension(originalFileName), newExtension);
                finalContentType = ImageHelper.GetMimeTypeFromFormat(convertToFormat);

                // 创建新的流用于上传转换后的文件
                finalStream = new FileStream(convertedFilePath, FileMode.Open, FileAccess.Read);
            }
            catch
            {
                // 清理临时文件
                if (File.Exists(tempOriginalFile)) File.Delete(tempOriginalFile);
                if (File.Exists(tempConvertedFile)) File.Delete(tempConvertedFile);
                throw;
            }
        }

        try
        {
            // 使用存储服务保存文件
            string relativePath = await storageService.ExecuteAsync(storageType.Value, 
                provider => provider.SaveAsync(finalStream, finalFileName, finalContentType));

            // 创建基本的Picture对象，使用文件名作为标题和描述
            string initialTitle = Path.GetFileNameWithoutExtension(originalFileName);
            string initialDescription = $"Uploaded on {DateTime.UtcNow}";

            await using var dbContext = await contextFactory.CreateDbContextAsync();

            // 获取用户
            User? user = null;
            if (userId is not null)
            {
                user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user == null)
                {
                    throw new Exception("找不到指定的用户");
                }
            }

            // 检查相册是否存在并且属于当前用户
            Album? album = null;
            if (albumId.HasValue)
            {
                album = await dbContext.Albums.Include(a => a.User)
                    .FirstOrDefaultAsync(a => a.Id == albumId.Value);

                if (album == null)
                {
                    throw new KeyNotFoundException($"找不到ID为{albumId.Value}的相册");
                }

                if (album.User.Id != userId)
                {
                    throw new Exception("您无权将图片添加到此相册");
                }
            }

            bool isAnonymous = userId == null;

            // 创建图片对象并保存到数据库
            var picture = new Picture
            {
                Name = initialTitle,
                Description = initialDescription,
                Path = relativePath,
                User = user,
                Permission = permission,
                AlbumId = albumId,
                StorageType = storageType.Value,
                ProcessingStatus = isAnonymous ? ProcessingStatus.Completed : ProcessingStatus.Pending,
                ThumbnailPath = isAnonymous ? relativePath : null
            };

            dbContext.Pictures.Add(picture);
            await dbContext.SaveChangesAsync();

            if (!isAnonymous)
            {
                await backgroundTaskQueue.QueuePictureProcessingTaskAsync(picture.Id, relativePath);
            }

            // 返回图片基本信息
            var pictureResponse = new PictureResponse
            {
                Id = picture.Id,
                Name = picture.Name,
                Path = await storageService.ExecuteAsync(picture.StorageType, provider => 
                    Task.FromResult(provider.GetUrl(relativePath))),
                ThumbnailPath = isAnonymous ? await storageService.ExecuteAsync(picture.StorageType, provider => 
                    Task.FromResult(provider.GetUrl(relativePath))) : null,
                Description = picture.Description,
                CreatedAt = picture.CreatedAt,
                Tags = new List<string>(),
                Permission = permission,
                AlbumId = albumId,
                AlbumName = album?.Name,
                ProcessingStatus = picture.ProcessingStatus
            };

            return (pictureResponse, picture.Id);
        }
        finally
        {
            // 清理转换后的临时流
            if (finalStream != fileStream && finalStream is FileStream tempFileStream)
            {
                string tempFilePath = tempFileStream.Name;
                finalStream.Dispose();
                if (File.Exists(tempFilePath)) File.Delete(tempFilePath);

                // 同时清理原始临时文件
                string tempOriginalFile = Path.ChangeExtension(tempFilePath, null);
                if (File.Exists(tempOriginalFile)) File.Delete(tempOriginalFile);
            }
        }
    }

    public async Task<ExifInfo> GetPictureExifInfoAsync(int pictureId)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();
        var picture = await dbContext.Pictures.FindAsync(pictureId);

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

        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var picturesToDelete = await dbContext.Pictures
            .Include(p => p.User)
            .Where(p => pictureIds.Contains(p.Id))
            .ToListAsync();

        var foundPictureIds = picturesToDelete.Select(p => p.Id).ToHashSet();
        foreach (var id in pictureIds.Where(id => !foundPictureIds.Contains(id)))
        {
            results[id] = (false, "找不到此图片", null);
        }

        var filesToDelete =
            new List<(int PictureId, string Path, string ThumbnailPath, int? UserId, StorageType StorageType)>();
        foreach (var picture in picturesToDelete)
        {
            filesToDelete.Add((picture.Id, picture.Path, picture.ThumbnailPath ?? string.Empty, picture.User?.Id, picture.StorageType));
        }

        if (picturesToDelete.Any())
        {
            dbContext.Pictures.RemoveRange(picturesToDelete);
            await dbContext.SaveChangesAsync();
        }

        foreach (var (pictureId, path, thumbnailPath, userId, storageType) in filesToDelete)
        {
            try
            {
                string? errorMsg = null;

                try
                {
                    // 使用存储服务删除文件
                    await storageService.ExecuteAsync(storageType, 
                        provider => provider.DeleteAsync(path));

                    // 删除缩略图
                    if (!string.IsNullOrEmpty(thumbnailPath))
                    {
                        await storageService.ExecuteAsync(storageType, 
                            provider => provider.DeleteAsync(thumbnailPath));
                    }
                }
                catch (Exception ex)
                {
                    errorMsg = $"数据库记录已删除，但删除文件失败: {ex.Message}";
                    Console.WriteLine($"删除图片文件时出错：{ex.Message}");
                }

                results[pictureId] = (true, errorMsg, userId);
            }
            catch (Exception ex)
            {
                results[pictureId] = (false, $"处理图片删除时出错: {ex.Message}", userId);
            }
        }

        return results;
    }

    public async Task<(PictureResponse Picture, int? UserId)> UpdatePictureAsync(
        int pictureId,
        string? name = null,
        string? description = null,
        List<string>? tags = null)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var picture = await dbContext.Pictures
            .Include(p => p.User)
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.Id == pictureId);

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
                    picture.Embedding = new Vector(embedding);
                }
                else
                {
                    // 记录获取到空向量的警告
                    Console.WriteLine($"警告: 图片 {pictureId} 的嵌入向量为空，跳过向量更新");
                }
            }
            catch (Exception ex)
            {
                // 记录错误但不抛出异常，允许其他字段的更新继续进行
                Console.WriteLine($"更新图片 {pictureId} 的嵌入向量时出错: {ex.Message}");
                // 不设置 picture.Embedding，保持原值不变
            }
        }

        if (tags != null)
        {
            picture.Tags?.Clear();

            foreach (var tagName in tags.Where(t => !string.IsNullOrWhiteSpace(t)))
            {
                var tag = await dbContext.Tags.FirstOrDefaultAsync(t => t.Name.ToLower() == tagName.ToLower().Trim());

                if (tag == null)
                {
                    tag = new Tag { Name = tagName.Trim() };
                    dbContext.Tags.Add(tag);
                }

                picture.Tags?.Add(tag);
            }
        }

        picture.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        var pictureResponse = new PictureResponse
        {
            Id = picture.Id,
            Name = picture.Name,
            Path = await storageService.ExecuteAsync(picture.StorageType, provider => 
                Task.FromResult(provider.GetUrl(picture.Path ?? string.Empty))),
            ThumbnailPath = await storageService.ExecuteAsync(picture.StorageType, provider => 
                Task.FromResult(provider.GetUrl(picture.ThumbnailPath ?? string.Empty))),
            Description = picture.Description,
            CreatedAt = picture.CreatedAt,
            Tags = picture.Tags?.Select(t => t.Name).ToList() ?? new List<string>(),
            TakenAt = picture.TakenAt,
            ExifInfo = picture.ExifInfo
        };

        return (pictureResponse, userId);
    }

    public async Task<bool> FavoritePictureAsync(int pictureId, int userId)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 检查图片是否存在
        var picture = await dbContext.Pictures.FindAsync(pictureId);
        if (picture == null)
            throw new KeyNotFoundException($"找不到ID为{pictureId}的图片");

        // 检查用户是否存在
        var user = await dbContext.Users.FindAsync(userId);
        if (user == null)
            throw new KeyNotFoundException($"找不到ID为{userId}的用户");

        // 检查是否已经收藏
        var existingFavorite = await dbContext.Favorites
            .FirstOrDefaultAsync(f => f.PictureId == pictureId && f.User.Id == userId);

        if (existingFavorite != null)
            throw new InvalidOperationException("您已经收藏过此图片");

        // 创建新收藏
        var favorite = new Favorite
        {
            PictureId = pictureId,
            User = user,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Favorites.Add(favorite);
        await dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<bool> UnfavoritePictureAsync(int pictureId, int userId)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 查找收藏记录
        var favorite = await dbContext.Favorites
            .FirstOrDefaultAsync(f => f.PictureId == pictureId && f.User.Id == userId);

        if (favorite == null)
            throw new KeyNotFoundException($"未找到该图片的收藏记录");

        // 移除收藏
        dbContext.Favorites.Remove(favorite);
        await dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<bool> IsPictureFavoritedByUserAsync(int pictureId, int userId)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();
        return await dbContext.Favorites
            .AnyAsync(f => f.PictureId == pictureId && f.User.Id == userId);
    }
}