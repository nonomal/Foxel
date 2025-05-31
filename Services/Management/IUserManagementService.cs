using Foxel.Models;
using Foxel.Models.Response.User;

namespace Foxel.Services.Management;

public interface IUserManagementService
{
    Task<PaginatedResult<UserResponse>> GetUsersAsync(int page = 1, int pageSize = 10);
    Task<UserResponse> GetUserByIdAsync(int id);
    Task<UserResponse> CreateUserAsync(string userName, string email, string password, string role);
    Task<UserResponse> UpdateUserAsync(int id, string userName, string email, string role);
    Task<bool> DeleteUserAsync(int id);
    Task<BatchDeleteResult> BatchDeleteUsersAsync(List<int> ids);
}

public class BatchDeleteResult
{
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<int> FailedIds { get; set; } = new();
}
