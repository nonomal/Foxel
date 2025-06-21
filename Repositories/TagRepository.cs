using Microsoft.EntityFrameworkCore;
using Foxel.Models.DataBase;

namespace Foxel.Repositories;

public class TagRepository(MyDbContext context) : Repository<Tag>(context)
{
    private async Task<Tag?> GetByNameAsync(string name)
    {
        return await FirstOrDefaultAsync(t => t.Name.ToLower() == name.ToLower());
    }

    public async Task<Tag> GetOrCreateTagAsync(string name)
    {
        var tag = await GetByNameAsync(name);
        if (tag == null)
        {
            tag = new Tag { Name = name.Trim() };
            await AddAsync(tag);
        }

        return tag;
    }

    public async Task<Tag?> GetByIdWithPicturesAsync(int id)
    {
        return await FirstOrDefaultAsync(
            t => t.Id == id,
            t => t.Pictures!);
    }

    public async Task<(IEnumerable<Tag> Tags, int TotalCount)> GetFilteredTagsAsync(
        int page, int pageSize, string? searchQuery, string? sortBy,
        string? sortDirection, int? minPictureCount)
    {
        var query = Query(t => t.Pictures!);

        // 应用搜索条件
        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var searchTerm = searchQuery.ToLower();
            query = query.Where(t =>
                t.Name.ToLower().Contains(searchTerm) ||
                (t.Description != null && t.Description.ToLower().Contains(searchTerm)));
        }

        // 应用最小图片数量过滤
        if (minPictureCount.HasValue && minPictureCount.Value > 0)
        {
            query = query.Where(t => t.Pictures != null && t.Pictures.Count >= minPictureCount.Value);
        }

        // 获取总记录数
        var totalCount = await query.CountAsync();

        // 应用排序
        query = ApplySorting(query, sortBy, sortDirection);

        // 应用分页
        var tags = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (tags, totalCount);
    }

    public async Task<bool> ExistsWithNameAsync(string name, int? excludeId = null)
    {
        if (excludeId.HasValue)
        {
            return await ExistsAsync(t => t.Id != excludeId.Value && t.Name.ToLower() == name.ToLower());
        }

        return await ExistsAsync(t => t.Name.ToLower() == name.ToLower());
    }

    private static IQueryable<Tag> ApplySorting(
        IQueryable<Tag> query,
        string? sortBy,
        string? sortDirection)
    {
        var isAscending = string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase);

        return sortBy?.ToLower() switch
        {
            "name" => isAscending
                ? query.OrderBy(t => t.Name)
                : query.OrderByDescending(t => t.Name),

            "createdat" => isAscending
                ? query.OrderBy(t => t.CreatedAt)
                : query.OrderByDescending(t => t.CreatedAt),

            "picturecount" => isAscending
                ? query.OrderBy(t => t.Pictures != null ? t.Pictures.Count : 0)
                : query.OrderByDescending(t => t.Pictures != null ? t.Pictures.Count : 0),

            _ => query.OrderByDescending(t => t.Pictures != null ? t.Pictures.Count : 0) // 默认按图片数量降序排列
        };
    }
}