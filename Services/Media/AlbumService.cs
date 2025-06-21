using System.Security.Claims;
using Foxel.Models;
using Foxel.Models.DataBase;
using Foxel.Models.Response.Album;
using Foxel.Services.Mapping;
using Foxel.Repositories;

namespace Foxel.Services.Media;

public class AlbumService(
    AlbumRepository albumRepository,
    PictureRepository pictureRepository,
    IHttpContextAccessor httpContextAccessor,
    MappingService mappingService)
    : IAlbumService
{
    public async Task<PaginatedResult<AlbumResponse>> GetAlbumsAsync(int page = 1, int pageSize = 10, int? userId = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var (albums, totalCount) = await albumRepository.GetPaginatedAsync(page, pageSize, userId);

        // 转换为响应模型
        var albumResponses = albums.Select(mappingService.MapAlbumToResponse).ToList();

        return new PaginatedResult<AlbumResponse>
        {
            Data = albumResponses,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<AlbumResponse> GetAlbumByIdAsync(int id)
    {
        var album = await albumRepository.GetByIdWithIncludesAsync(id);
        if (album == null)
            throw new KeyNotFoundException($"找不到ID为{id}的相册");
        return mappingService.MapAlbumToResponse(album);
    }

    public async Task<AlbumResponse> CreateAlbumAsync(string name, string? description, int userId, int? coverPictureId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("相册名称不能为空", nameof(name));

        // 创建新相册
        var album = new Album
        {
            Name = name.Trim(),
            Description = description?.Trim() ?? string.Empty,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CoverPictureId = coverPictureId
        };

        var createdAlbum = await albumRepository.AddAsync(album);
        await albumRepository.SaveChangesAsync();

        // 重新获取创建的相册以包含导航属性
        var albumWithIncludes = await albumRepository.GetByIdWithIncludesAsync(createdAlbum.Id);
        return mappingService.MapAlbumToResponse(albumWithIncludes!);
    }

    public async Task<AlbumResponse> UpdateAlbumAsync(int id, string name, string? description, int? userId = null, int? coverPictureId = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("相册名称不能为空", nameof(name));

        // 获取相册
        var album = await albumRepository.GetByIdAsync(id);
        if (album == null)
            throw new KeyNotFoundException($"找不到ID为{id}的相册");

        if (!userId.HasValue) // userId 仍然需要用于权限检查
            throw new ArgumentException("无效的用户ID", nameof(userId));

        if (!await albumRepository.IsOwnerAsync(id, userId.Value))
        {
            throw new UnauthorizedAccessException("您没有权限更新此相册");
        }

        // 更新相册信息
        album.Name = name.Trim();
        album.Description = description?.Trim() ?? album.Description;
        album.UpdatedAt = DateTime.UtcNow;
        album.CoverPictureId = coverPictureId;

        await albumRepository.UpdateAsync(album);
        await albumRepository.SaveChangesAsync();

        // 重新获取更新后的相册以包含导航属性
        var updatedAlbum = await albumRepository.GetByIdWithIncludesAsync(album.Id);
        return mappingService.MapAlbumToResponse(updatedAlbum!);
    }

    public async Task<bool> DeleteAlbumAsync(int id)
    {
        var album = await albumRepository.GetByIdAsync(id);
        if (album == null)
            return false;

        // 先找出所有属于这个相册的图片
        var pictures = await albumRepository.GetPicturesByAlbumIdAsync(id);

        // 将这些图片的AlbumId设置为null
        foreach (var picture in pictures)
        {
            picture.AlbumId = null;
        }

        // 保存图片更改
        await pictureRepository.UpdateRangeAsync(pictures);
        await pictureRepository.SaveChangesAsync();

        // 然后删除相册
        await albumRepository.DeleteAsync(album);
        await albumRepository.SaveChangesAsync();

        return true;
    }

    public async Task<bool> AddPictureToAlbumAsync(int albumId, int pictureId)
    {
        // 获取相册和图片
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album == null)
            throw new KeyNotFoundException($"找不到ID为{albumId}的相册");

        var picture = await pictureRepository.GetByIdAsync(pictureId);
        if (picture == null)
            throw new KeyNotFoundException($"找不到ID为{pictureId}的图片");

        // 将图片添加到相册
        picture.AlbumId = albumId;

        await pictureRepository.UpdateAsync(picture);
        await pictureRepository.SaveChangesAsync();

        return true;
    }

    public async Task<bool> RemovePictureFromAlbumAsync(int albumId, int pictureId)
    {
        // 获取图片
        var picture = await pictureRepository.FirstOrDefaultAsync(p => p.Id == pictureId && p.AlbumId == albumId);

        if (picture == null)
            throw new KeyNotFoundException($"在相册中找不到ID为{pictureId}的图片");

        // 从相册中移除图片
        picture.AlbumId = null;

        await pictureRepository.UpdateAsync(picture);
        await pictureRepository.SaveChangesAsync();

        return true;
    }

    public async Task<bool> AddPicturesToAlbumAsync(int albumId, List<int> pictureIds)
    {
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album == null)
            throw new KeyNotFoundException("相册不存在");

        // 检查是否有权限修改此相册
        var currentUser = httpContextAccessor.HttpContext?.User;
        if (currentUser != null)
        {
            var userId = int.Parse(currentUser.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (album.UserId != userId)
            {
                throw new UnauthorizedAccessException("您没有权限修改此相册");
            }
        }

        // 使用仓储的批量更新方法
        var success = await pictureRepository.AddMultipleToAlbumAsync(pictureIds, albumId);
        if (success)
        {
            await pictureRepository.SaveChangesAsync();
        }

        return success;
    }

    public async Task<bool> SetAlbumCoverAsync(int albumId, int pictureId, int userId)
    {
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album == null)
            throw new KeyNotFoundException($"找不到ID为 {albumId} 的相册");

        // 权限检查：只有相册所有者可以设置封面
        if (album.UserId != userId)
            throw new UnauthorizedAccessException("您没有权限修改此相册的封面");

        var picture = await pictureRepository.GetByIdAsync(pictureId);
        if (picture == null)
            throw new KeyNotFoundException($"找不到ID为 {pictureId} 的图片");

        // 确保图片属于该相册
        if (picture.AlbumId != albumId)
            throw new InvalidOperationException($"图片 {pictureId} 不属于相册 {albumId}");

        album.CoverPictureId = pictureId;
        album.UpdatedAt = DateTime.UtcNow;

        await albumRepository.UpdateAsync(album);
        await albumRepository.SaveChangesAsync();
        return true;
    }
}
