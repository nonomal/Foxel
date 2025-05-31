using Foxel.Models;
using Foxel.Models.Response.Picture;

namespace Foxel.Services.Management;

public interface IPictureManagementService
{
    Task<PaginatedResult<PictureResponse>> GetPicturesAsync(int page = 1, int pageSize = 10);
    Task<PictureResponse> GetPictureByIdAsync(int id);
    Task<bool> DeletePictureAsync(int id);
    Task<BatchDeleteResult> BatchDeletePicturesAsync(List<int> ids);
    Task<PaginatedResult<PictureResponse>> GetPicturesByUserIdAsync(int userId, int page = 1, int pageSize = 10);
}
