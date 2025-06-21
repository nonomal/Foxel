using Foxel.Models;
using Foxel.Models.DataBase;
using Foxel.Models.Response.Tag;
using Foxel.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Foxel.Services.Media;

public class TagService(TagRepository tagRepository, ILogger<TagService> logger) : ITagService
{
    public async Task<PaginatedResult<TagResponse>> GetFilteredTagsAsync(
        int page = 1,
        int pageSize = 20,
        string? searchQuery = null,
        string? sortBy = "pictureCount",
        string? sortDirection = "desc",
        int? minPictureCount = null)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var (tags, totalCount) = await tagRepository.GetFilteredTagsAsync(
                page, pageSize, searchQuery, sortBy, sortDirection, minPictureCount);

            // 没有结果时返回空列表
            if (totalCount == 0)
            {
                return new PaginatedResult<TagResponse>
                {
                    Data = new List<TagResponse>(),
                    TotalCount = 0,
                    Page = page,
                    PageSize = pageSize
                };
            }

            // 转换为响应格式，确保包含图片数量
            var tagResponses = tags.Select(tag => new TagResponse
            {
                Id = tag.Id,
                Name = tag.Name,
                Description = tag.Description,
                CreatedAt = tag.CreatedAt,
                PictureCount = tag.Pictures?.Count ?? 0
            }).ToList();

            return new PaginatedResult<TagResponse>
            {
                Data = tagResponses,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }
        catch (Exception ex)
        {
            // 记录详细错误信息
            logger.LogError(ex, "GetFilteredTagsAsync error");
            throw;
        }
    }

    public async Task<TagResponse> GetTagByIdAsync(int id)
    {
        var tag = await tagRepository.GetByIdWithPicturesAsync(id);

        if (tag == null)
            throw new KeyNotFoundException($"找不到ID为{id}的标签");

        return new TagResponse
        {
            Id = tag.Id,
            Name = tag.Name,
            Description = tag.Description,
            CreatedAt = tag.CreatedAt,
            PictureCount = tag.Pictures?.Count ?? 0
        };
    }

    public async Task<TagResponse> CreateTagAsync(string name, string? description = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("标签名称不能为空");

        // 检查是否已存在同名标签
        var existingTag = await tagRepository.ExistsWithNameAsync(name);
        if (existingTag)
            throw new InvalidOperationException("已存在相同名称的标签");

        var tag = new Tag
        {
            Name = name.Trim(),
            Description = description?.Trim(),
            CreatedAt = DateTime.UtcNow,
            Pictures = new List<Picture>() // 初始化为空集合而不是null
        };

        await tagRepository.AddAsync(tag);
        await tagRepository.SaveChangesAsync();

        return new TagResponse
        {
            Id = tag.Id,
            Name = tag.Name,
            Description = tag.Description,
            CreatedAt = tag.CreatedAt,
            PictureCount = 0
        };
    }

    public async Task<TagResponse> UpdateTagAsync(int id, string? name = null, string? description = null)
    {
        var tag = await tagRepository.GetByIdAsync(id);
        if (tag == null)
            throw new KeyNotFoundException($"找不到ID为{id}的标签");

        if (!string.IsNullOrWhiteSpace(name))
        {
            // 检查是否已存在同名标签（不包括当前标签）
            var existingTag = await tagRepository.ExistsWithNameAsync(name, id);
            if (existingTag)
                throw new InvalidOperationException("已存在相同名称的标签");

            tag.Name = name.Trim();
        }

        if (description != null) // 允许设置为空字符串
        {
            tag.Description = description.Trim();
        }

        tag.UpdatedAt = DateTime.UtcNow;

        await tagRepository.UpdateAsync(tag);
        await tagRepository.SaveChangesAsync();

        // 重新获取带图片数量的标签信息
        var updatedTag = await tagRepository.GetByIdWithPicturesAsync(id);

        return new TagResponse
        {
            Id = updatedTag!.Id,
            Name = updatedTag.Name,
            Description = updatedTag.Description,
            CreatedAt = updatedTag.CreatedAt,
            PictureCount = updatedTag.Pictures?.Count ?? 0
        };
    }

    public async Task<bool> DeleteTagAsync(int id)
    {
        var tag = await tagRepository.GetByIdAsync(id);
        if (tag == null)
            throw new KeyNotFoundException($"找不到ID为{id}的标签");

        await tagRepository.DeleteAsync(tag);
        await tagRepository.SaveChangesAsync();

        return true;
    }
}