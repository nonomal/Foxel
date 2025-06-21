using Microsoft.EntityFrameworkCore;
using Foxel.Models.DataBase;

namespace Foxel.Repositories;

public class PictureRepository(MyDbContext context) : Repository<Picture>(context)
{
    public async Task<IEnumerable<Picture>> GetByAlbumIdAsync(int albumId)
    {
        return await FindAsync(p => p.AlbumId == albumId);
    }

    public async Task<bool> AddToAlbumAsync(int pictureId, int albumId)
    {
        var picture = await GetByIdAsync(pictureId);
        if (picture == null) return false;

        picture.AlbumId = albumId;
        await UpdateAsync(picture);
        return true;
    }

    public async Task<bool> RemoveFromAlbumAsync(int pictureId)
    {
        var picture = await GetByIdAsync(pictureId);
        if (picture == null) return false;

        picture.AlbumId = null;
        await UpdateAsync(picture);
        return true;
    }

    public async Task<bool> AddMultipleToAlbumAsync(IEnumerable<int> pictureIds, int albumId)
    {
        var pictures = await _dbSet.Where(p => pictureIds.Contains(p.Id)).ToListAsync();
        if (!pictures.Any()) return false;

        foreach (var picture in pictures)
        {
            picture.AlbumId = albumId;
        }

        await UpdateRangeAsync(pictures);
        return true;
    }

    public async Task<bool> IsPictureInAlbumAsync(int pictureId, int albumId)
    {
        return await ExistsAsync(p => p.Id == pictureId && p.AlbumId == albumId);
    }

    public async Task<(IEnumerable<Picture> Pictures, int TotalCount)> GetPicturesWithFiltersAsync(
        int page, int pageSize, string? searchQuery, List<string>? tags,
        DateTime? startDate, DateTime? endDate, int? userId, string? sortBy,
        bool? onlyWithGps, int? excludeAlbumId, int? albumId, bool onlyFavorites,
        int? ownerId, bool includeAllPublic)
    {
        var query = _context.Pictures
            .Include(p => p.Tags!)
            .Include(p => p.User!)
            .Include(p => p.Faces!)
                .ThenInclude(f => f.Cluster!)
            .Include(p => p.StorageMode!)
            .AsQueryable();

        // 应用文本搜索条件
        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var searchTerm = searchQuery.ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(searchTerm) ||
                p.Description.ToLower().Contains(searchTerm));
        }

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

        // 应用排序
        query = sortBy?.ToLower() switch
        {
            "takenat_desc" or "newest" => query.OrderByDescending(p => p.TakenAt ?? p.CreatedAt),
            "takenat_asc" or "oldest" => query.OrderBy(p => p.TakenAt ?? p.CreatedAt),
            "uploaddate_desc" => query.OrderByDescending(p => p.CreatedAt),
            "uploaddate_asc" => query.OrderBy(p => p.CreatedAt),
            "name_asc" or "name" => query.OrderBy(p => p.Name),
            "name_desc" => query.OrderByDescending(p => p.Name),
            _ => query.OrderByDescending(p => p.TakenAt ?? p.CreatedAt)
        };

        // 获取总记录数
        var totalCount = await query.CountAsync();

        // 获取分页数据
        var pictures = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (pictures, totalCount);
    }

    public async Task<IEnumerable<Picture>> GetPicturesByIdsAsync(IEnumerable<int> ids)
    {
        return await _context.Pictures
            .Include(p => p.Tags!)
            .Include(p => p.User!)
            .Include(p => p.StorageMode!)
            .Where(p => ids.Contains(p.Id))
            .ToListAsync();
    }

    public async Task<Picture?> GetPictureWithIncludesAsync(int id)
    {
        return await FirstOrDefaultAsync(
            p => p.Id == id,
            p => p.User!,
            p => p.Tags!,
            p => p.StorageMode!);
    }

    public async Task<Dictionary<int, int>> GetFavoriteCountsAsync(IEnumerable<int> pictureIds)
    {
        return await _context.Favorites
            .Where(f => pictureIds.Contains(f.PictureId))
            .GroupBy(f => f.PictureId)
            .Select(g => new { PictureId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PictureId, x => x.Count);
    }

    public async Task<HashSet<int>> GetUserFavoritedPictureIdsAsync(int userId, IEnumerable<int> pictureIds)
    {
        return await _context.Favorites
            .Where(f => f.User.Id == userId && pictureIds.Contains(f.PictureId))
            .Select(f => f.PictureId)
            .ToHashSetAsync();
    }

    public async Task<Dictionary<int, (int? AlbumId, string? AlbumName)>> GetPictureAlbumInfoAsync(int userId, IEnumerable<int> pictureIds)
    {
        return await _context.Pictures
            .Where(p => p.User != null && p.User.Id == userId && pictureIds.Contains(p.Id) && p.AlbumId.HasValue)
            .Select(p => new { p.Id, p.AlbumId, AlbumName = p.Album!.Name })
            .ToDictionaryAsync(
                p => p.Id, 
                p => ((int?)p.AlbumId, (string?)p.AlbumName));
    }

    public async Task<int> DeletePicturesByIdsAsync(IEnumerable<int> pictureIds)
    {
        return await _dbSet.Where(p => pictureIds.Contains(p.Id)).ExecuteDeleteAsync();
    }
}