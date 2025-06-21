using Foxel.Api.Management;
using Foxel.Models;
using Foxel.Models.Response.Picture;
using Foxel.Services.Mapping;
using Foxel.Services.Storage;
using Microsoft.EntityFrameworkCore;

namespace Foxel.Services.Management;

public class PictureManagementService(
    IDbContextFactory<MyDbContext> contextFactory,
    IStorageService storageService,
    MappingService mappingService,
    ILogger<PictureManagementService> logger)
{
    public async Task<PaginatedResult<PictureResponse>> GetPicturesAsync(int page = 1, int pageSize = 10, string? searchQuery = null, int? userId = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 构建查询
        var query = dbContext.Pictures
            .Include(p => p.User)
            .AsQueryable();

        // 应用筛选条件
        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            query = query.Where(p => p.Name.Contains(searchQuery) || 
                                    (p.Description.Contains(searchQuery)));
        }

        if (userId.HasValue)
        {
            query = query.Where(p => p.UserId == userId.Value);
        }

        query = query.OrderByDescending(p => p.CreatedAt);

        // 获取总数和分页数据
        var totalCount = await query.CountAsync();
        var pictures = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // 转换为响应模型
        var pictureResponses = pictures.Select(mappingService.MapPictureToResponse).ToList();

        return new PaginatedResult<PictureResponse>
        {
            Data = pictureResponses,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<PictureResponse> GetPictureByIdAsync(int id)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var picture = await dbContext.Pictures
            .Include(p => p.User).Include(picture => picture.Tags).Include(picture => picture.Album)
            .Include(picture => picture.Favorites)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (picture == null)
            throw new KeyNotFoundException($"找不到ID为{id}的图片");

        return new PictureResponse
        {
            Id = picture.Id,
            Name = picture.Name,
            Path = picture.Path,
            ThumbnailPath = picture.ThumbnailPath,
            Description = picture.Description,
            CreatedAt = picture.CreatedAt,
            TakenAt = picture.TakenAt,
            ExifInfo = picture.ExifInfo,
            UserId = picture.UserId,
            Username = picture.User?.UserName,
            Tags = picture.Tags?.Select(t => t.Name).ToList(),
            AlbumId = picture.AlbumId,
            AlbumName = picture.Album?.Name,
            Permission = picture.Permission,
            FavoriteCount = picture.Favorites?.Count ?? 0,
            IsFavorited = false 
        };
    }

    public async Task<bool> DeletePictureAsync(int id)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var picture = await dbContext.Pictures.FindAsync(id);

        if (picture == null)
            throw new KeyNotFoundException($"找不到ID为{id}的图片");

        // 保存文件路径信息用于后续删除
        var filePath = picture.Path;
        var thumbnailPath = picture.ThumbnailPath;
        var storageType = picture.StorageModeId;

        // 删除数据库记录
        dbContext.Pictures.Remove(picture);
        await dbContext.SaveChangesAsync();

        // 删除物理文件
        try
        {
            if (!string.IsNullOrEmpty(filePath))
            {
                await storageService.ExecuteAsync(storageType,
                    provider => provider.DeleteAsync(filePath));
            }
            if (!string.IsNullOrEmpty(thumbnailPath))
            {
                await storageService.ExecuteAsync(storageType,
                    provider => provider.DeleteAsync(thumbnailPath));
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "删除图片文件时出错，图片ID: {PictureId}", id);
        }
        return true;
    }

    public async Task<BatchDeleteResult> BatchDeletePicturesAsync(List<int> ids)
    {
        var result = new BatchDeleteResult();

        foreach (var id in ids)
        {
            try
            {
                var success = await DeletePictureAsync(id);
                if (success)
                {
                    result.SuccessCount++;
                }
                else
                {
                    result.FailedCount++;
                    result.FailedIds.Add(id);
                }
            }
            catch
            {
                result.FailedCount++;
                result.FailedIds.Add(id);
            }
        }

        return result;
    }

    public async Task<PaginatedResult<PictureResponse>> GetPicturesByUserIdAsync(int userId, int page = 1, int pageSize = 10)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 构建查询
        var query = dbContext.Pictures
            .Include(p => p.User)
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt);

        // 获取总数和分页数据
        var totalCount = await query.CountAsync();
        var pictures = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // 转换为响应模型
        var pictureResponses = pictures.Select(picture => new PictureResponse
        {
            Id = picture.Id,
            Name = picture.Name,
            Path = picture.Path,
            ThumbnailPath = picture.ThumbnailPath,
            Description = picture.Description,
            CreatedAt = picture.CreatedAt,
            TakenAt = picture.TakenAt,
            ExifInfo = picture.ExifInfo,
            UserId = picture.UserId,
            Username = picture.User?.UserName,
            Tags = picture.Tags?.Select(t => t.Name).ToList(),
            AlbumId = picture.AlbumId,
            AlbumName = picture.Album?.Name,
            Permission = picture.Permission,
            FavoriteCount = picture.Favorites?.Count ?? 0,
            IsFavorited = false
        }).ToList();

        return new PaginatedResult<PictureResponse>
        {
            Data = pictureResponses,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }
}
