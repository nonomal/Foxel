using Foxel.Models;
using Foxel.Models.Request.Album;
using Foxel.Models.Response.Album;
using Foxel.Models.Response.Picture;

namespace Foxel.Services.Management
{
    public interface IAlbumManagementService
    {
        Task<PaginatedResult<AlbumResponse>> GetAlbumsAsync(int page = 1, int pageSize = 10, string? searchQuery = null, int? userId = null);
        Task<AlbumResponse> GetAlbumByIdAsync(int id);
        Task<AlbumResponse> CreateAlbumAsync(AlbumCreateRequest request, int creatorUserId);
        Task<AlbumResponse> UpdateAlbumAsync(int id, AlbumUpdateRequest request);
        Task<bool> DeleteAlbumAsync(int id);
        Task<BatchDeleteResult> BatchDeleteAlbumsAsync(List<int> ids);
        Task<PaginatedResult<AlbumResponse>> GetAlbumsByUserIdAsync(int userId, int page = 1, int pageSize = 10);
        Task<bool> AddPictureToAlbumAsync(int albumId, int pictureId);
        Task<bool> RemovePictureFromAlbumAsync(int albumId, int pictureId);
        Task<PaginatedResult<PictureResponse>> GetPicturesInAlbumAsync(int albumId, int page = 1, int pageSize = 10);
        Task<bool> SetAlbumCoverAsync(int albumId, int pictureId);
    }
}
