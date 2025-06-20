using Foxel.Models;
using Foxel.Models.Response.Face;
using Foxel.Models.Response.Picture;
using Foxel.Services.Mapping;
using Foxel.Api.Management;
using Microsoft.EntityFrameworkCore;
using Foxel.Services.Configuration;

namespace Foxel.Services.Management;

public class FaceManagementService(
    IDbContextFactory<MyDbContext> contextFactory,
    IMappingService mappingService,
    IConfigService configService,
    ILogger<FaceManagementService> logger) : IFaceManagementService
{
    public async Task<PaginatedResult<FaceClusterResponse>> GetFaceClustersAsync(int page = 1, int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        await using var dbContext = await contextFactory.CreateDbContextAsync();
        var clusterQuery = dbContext.FaceClusters
            .Select(c => new
            {
                Cluster = c,
                FaceCount = dbContext.Faces.Count(f => f.ClusterId == c.Id),
                ThumbnailPath = configService["AppSettings:ServerUrl"] + dbContext.Faces
                    .Where(f => f.ClusterId == c.Id)
                    .Include(f => f.Picture)
                    .OrderByDescending(f => f.CreatedAt)
                    .Select(f => f.Picture.ThumbnailPath)
                    .FirstOrDefault()
            })
            .OrderByDescending(x => x.FaceCount)
            .ThenByDescending(x => x.Cluster.LastUpdatedAt);

        var totalCount = await clusterQuery.CountAsync();
        var clusterData = await clusterQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var clusterResponses = clusterData.Select(data => new FaceClusterResponse
        {
            Id = data.Cluster.Id,
            Name = data.Cluster.Name,
            PersonName = data.Cluster.PersonName,
            Description = data.Cluster.Description,
            FaceCount = data.FaceCount,
            LastUpdatedAt = data.Cluster.LastUpdatedAt,
            ThumbnailPath = data.ThumbnailPath,
            CreatedAt = data.Cluster.CreatedAt
        }).ToList();

        return new PaginatedResult<FaceClusterResponse>
        {
            Data = clusterResponses,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<PaginatedResult<PictureResponse>> GetPicturesByClusterAsync(int clusterId, int page = 1, int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 获取该聚类下所有图片ID
        var pictureIds = await dbContext.Faces
            .Where(f => f.ClusterId == clusterId)
            .Select(f => f.PictureId)
            .Distinct()
            .ToListAsync();

        var query = dbContext.Pictures
            .Where(p => pictureIds.Contains(p.Id))
            .Include(p => p.User)
            .Include(p => p.Tags)
            .Include(p => p.Faces)
            .OrderByDescending(p => p.CreatedAt);

        var totalCount = await query.CountAsync();
        var pictures = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var pictureResponses = pictures
            .Select(p => mappingService.MapPictureToResponse(p))
            .ToList();

        return new PaginatedResult<PictureResponse>
        {
            Data = pictureResponses,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<FaceClusterResponse> UpdateClusterAsync(int clusterId, string? personName, string? description = null)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var cluster = await dbContext.FaceClusters
            .Include(c => c.Faces)
            .FirstOrDefaultAsync(c => c.Id == clusterId);

        if (cluster == null)
            throw new KeyNotFoundException($"找不到ID为 {clusterId} 的人脸聚类");

        cluster.PersonName = personName;
        if (description != null)
            cluster.Description = description;
        cluster.LastUpdatedAt = DateTime.UtcNow;

        // 如果设置了人物姓名，更新聚类名称
        if (!string.IsNullOrWhiteSpace(personName))
        {
            cluster.Name = personName;
        }

        await dbContext.SaveChangesAsync();

        return new FaceClusterResponse
        {
            Id = cluster.Id,
            Name = cluster.Name,
            PersonName = cluster.PersonName,
            Description = cluster.Description,
            FaceCount = cluster.Faces?.Count ?? 0,
            LastUpdatedAt = cluster.LastUpdatedAt,
            CreatedAt = cluster.CreatedAt
        };
    }

    public async Task<bool> MergeClustersAsync(int sourceClusterId, int targetClusterId)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var sourceFaces = await dbContext.Faces
            .Where(f => f.ClusterId == sourceClusterId)
            .ToListAsync();

        var targetCluster = await dbContext.FaceClusters
            .FirstOrDefaultAsync(c => c.Id == targetClusterId);

        if (targetCluster == null)
            throw new KeyNotFoundException($"找不到目标聚类 {targetClusterId}");

        // 将源聚类的所有人脸移动到目标聚类
        foreach (var face in sourceFaces)
        {
            face.ClusterId = targetClusterId;
        }

        // 删除源聚类
        var sourceCluster = await dbContext.FaceClusters.FindAsync(sourceClusterId);
        if (sourceCluster != null)
        {
            dbContext.FaceClusters.Remove(sourceCluster);
        }
        targetCluster.LastUpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
        logger.LogInformation("成功合并聚类 {SourceId} 到 {TargetId}，移动了 {FaceCount} 个人脸",
            sourceClusterId, targetClusterId, sourceFaces.Count);
        return true;
    }

    public async Task<bool> RemoveFaceFromClusterAsync(int faceId)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var face = await dbContext.Faces.FindAsync(faceId);
        if (face == null)
            return false;

        face.ClusterId = null;
        await dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<PaginatedResult<FaceClusterResponse>> GetUserFaceClustersAsync(int userId, int page = 1, int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var clusterQuery = dbContext.FaceClusters
            .Where(c => dbContext.Faces.Any(f => f.ClusterId == c.Id && f.Picture.UserId == userId))
            .Select(c => new
            {
                Cluster = c,
                FaceCount = dbContext.Faces.Count(f => f.ClusterId == c.Id && f.Picture.UserId == userId),
                ThumbnailPath = configService["AppSettings:ServerUrl"]+  dbContext.Faces
                    .Where(f => f.ClusterId == c.Id && f.Picture.UserId == userId && !string.IsNullOrEmpty(f.CroppedImagePath))
                    .OrderByDescending(f => f.CreatedAt)
                    .Select(f => f.CroppedImagePath)
                    .FirstOrDefault()
            })
            .Where(x => x.FaceCount > 0)
            .OrderByDescending(x => x.FaceCount)
            .ThenByDescending(x => x.Cluster.LastUpdatedAt);

        var totalCount = await clusterQuery.CountAsync();
        var clusterData = await clusterQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var clusterResponses = clusterData.Select(data => new FaceClusterResponse
        {
            Id = data.Cluster.Id,
            Name = data.Cluster.Name,
            PersonName = data.Cluster.PersonName,
            Description = data.Cluster.Description,
            FaceCount = data.FaceCount,
            LastUpdatedAt = data.Cluster.LastUpdatedAt,
            ThumbnailPath = data.ThumbnailPath,
            CreatedAt = data.Cluster.CreatedAt
        }).ToList();

        return new PaginatedResult<FaceClusterResponse>
        {
            Data = clusterResponses,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<PaginatedResult<PictureResponse>> GetUserPicturesByClusterAsync(int userId, int clusterId, int page = 1, int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 验证聚类是否包含该用户的人脸
        var hasUserFaces = await dbContext.Faces
            .AnyAsync(f => f.ClusterId == clusterId && f.Picture.UserId == userId);

        if (!hasUserFaces)
            throw new KeyNotFoundException($"找不到用户 {userId} 的聚类 {clusterId}");

        // 获取该聚类下该用户的所有图片ID
        var pictureIds = await dbContext.Faces
            .Where(f => f.ClusterId == clusterId && f.Picture.UserId == userId)
            .Select(f => f.PictureId)
            .Distinct()
            .ToListAsync();

        var query = dbContext.Pictures
            .Where(p => pictureIds.Contains(p.Id) && p.UserId == userId)
            .Include(p => p.User)
            .Include(p => p.Tags)
            .Include(p => p.Faces)
            .OrderByDescending(p => p.CreatedAt);

        var totalCount = await query.CountAsync();
        var pictures = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var pictureResponses = pictures
            .Select(p => mappingService.MapPictureToResponse(p))
            .ToList();

        return new PaginatedResult<PictureResponse>
        {
            Data = pictureResponses,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<FaceClusterResponse> UpdateUserClusterAsync(int userId, int clusterId, string? personName, string? description = null)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 验证聚类是否包含该用户的人脸
        var hasUserFaces = await dbContext.Faces
            .AnyAsync(f => f.ClusterId == clusterId && f.Picture.UserId == userId);

        if (!hasUserFaces)
            throw new KeyNotFoundException($"找不到用户 {userId} 的聚类 {clusterId}");

        var cluster = await dbContext.FaceClusters
            .Include(c => c.Faces.Where(f => f.Picture.UserId == userId))
            .FirstOrDefaultAsync(c => c.Id == clusterId);

        if (cluster == null)
            throw new KeyNotFoundException($"找不到ID为 {clusterId} 的人脸聚类");

        cluster.PersonName = personName;
        if (description != null)
            cluster.Description = description;
        cluster.LastUpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(personName))
        {
            cluster.Name = personName;
        }

        await dbContext.SaveChangesAsync();

        return new FaceClusterResponse
        {
            Id = cluster.Id,
            Name = cluster.Name,
            PersonName = cluster.PersonName,
            Description = cluster.Description,
            FaceCount = cluster.Faces?.Count ?? 0,
            LastUpdatedAt = cluster.LastUpdatedAt,
            CreatedAt = cluster.CreatedAt
        };
    }

    public async Task<bool> MergeUserClustersAsync(int userId, int sourceClusterId, int targetClusterId)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 验证两个聚类都包含该用户的人脸
        var sourceHasUserFaces = await dbContext.Faces
            .AnyAsync(f => f.ClusterId == sourceClusterId && f.Picture.UserId == userId);
        var targetHasUserFaces = await dbContext.Faces
            .AnyAsync(f => f.ClusterId == targetClusterId && f.Picture.UserId == userId);

        if (!sourceHasUserFaces || !targetHasUserFaces)
            throw new KeyNotFoundException("找不到指定的聚类或无权访问");

        // 只移动该用户的人脸
        var sourceFaces = await dbContext.Faces
            .Where(f => f.ClusterId == sourceClusterId && f.Picture.UserId == userId)
            .ToListAsync();

        var targetCluster = await dbContext.FaceClusters
            .FirstOrDefaultAsync(c => c.Id == targetClusterId);

        if (targetCluster == null)
            throw new KeyNotFoundException($"找不到目标聚类 {targetClusterId}");

        foreach (var face in sourceFaces)
        {
            face.ClusterId = targetClusterId;
        }

        // 检查源聚类是否还有其他用户的人脸，如果没有则删除
        var remainingFaces = await dbContext.Faces
            .CountAsync(f => f.ClusterId == sourceClusterId);

        if (remainingFaces == 0)
        {
            var sourceCluster = await dbContext.FaceClusters.FindAsync(sourceClusterId);
            if (sourceCluster != null)
            {
                dbContext.FaceClusters.Remove(sourceCluster);
            }
        }

        targetCluster.LastUpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();

        logger.LogInformation("用户 {UserId} 成功合并聚类 {SourceId} 到 {TargetId}，移动了 {FaceCount} 个人脸",
            userId, sourceClusterId, targetClusterId, sourceFaces.Count);
        return true;
    }

    public async Task<bool> RemoveUserFaceFromClusterAsync(int userId, int faceId)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var face = await dbContext.Faces
            .Include(f => f.Picture)
            .FirstOrDefaultAsync(f => f.Id == faceId && f.Picture.UserId == userId);

        if (face == null)
            throw new KeyNotFoundException("找不到指定的人脸或无权访问");

        face.ClusterId = null;
        await dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteClusterAsync(int clusterId)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var cluster = await dbContext.FaceClusters
            .Include(c => c.Faces)
            .FirstOrDefaultAsync(c => c.Id == clusterId);

        if (cluster == null)
            throw new KeyNotFoundException($"找不到ID为 {clusterId} 的人脸聚类");

        // 将所有人脸的聚类ID设为null
        if (cluster.Faces != null)
        {
            foreach (var face in cluster.Faces)
            {
                face.ClusterId = null;
            }
        }

        dbContext.FaceClusters.Remove(cluster);
        await dbContext.SaveChangesAsync();

        logger.LogInformation("删除聚类 {ClusterId}，影响了 {FaceCount} 个人脸",
            clusterId, cluster.Faces?.Count ?? 0);
        return true;
    }

    public async Task<FaceClusterStatistics> GetClusterStatisticsAsync()
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var totalClusters = await dbContext.FaceClusters.CountAsync();
        var totalFaces = await dbContext.Faces.CountAsync();
        var unclusteredFaces = await dbContext.Faces.CountAsync(f => f.ClusterId == null);
        var namedClusters = await dbContext.FaceClusters.CountAsync(c => !string.IsNullOrEmpty(c.PersonName));

        var clustersByUserQuery = await dbContext.Faces
            .Where(f => f.ClusterId != null)
            .GroupBy(f => f.Picture.UserId)
            .Select(g => new { UserId = g.Key, ClusterCount = g.Select(f => f.ClusterId).Distinct().Count() })
            .ToListAsync();

        var clustersByUser = clustersByUserQuery
            .Where(x => x.UserId.HasValue)
            .ToDictionary(x => x.UserId.Value, x => x.ClusterCount);

        return new FaceClusterStatistics
        {
            TotalClusters = totalClusters,
            TotalFaces = totalFaces,
            UnclusteredFaces = unclusteredFaces,
            NamedClusters = namedClusters,
            ClustersByUser = clustersByUser
        };
    }
}