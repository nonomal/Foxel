using System.Security.Cryptography;
using System.Text;
using Foxel.Models;
using Foxel.Models.Response.User;
using Microsoft.EntityFrameworkCore;

namespace Foxel.Services.Management;

public class UserManagementService(
    IDbContextFactory<MyDbContext> contextFactory) : IUserManagementService
{
    public async Task<PaginatedResult<UserResponse>> GetUsersAsync(int page = 1, int pageSize = 10)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 构建查询
        var query = dbContext.Users
            .Include(u => u.Role)
            .OrderByDescending(u => u.CreatedAt);

        // 获取总数和分页数据
        var totalCount = await query.CountAsync();
        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // 转换为响应模型
        var userResponses = users.Select(user => new UserResponse
        {
            Id = user.Id,
            UserName = user.UserName,
            Email = user.Email,
            Role = user.Role?.Name ?? "User",
            CreatedAt = user.CreatedAt,
        }).ToList();

        return new PaginatedResult<UserResponse>
        {
            Data = userResponses,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<UserResponse> GetUserByIdAsync(int id)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var user = await dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            throw new KeyNotFoundException($"找不到ID为{id}的用户");

        return new UserResponse
        {
            Id = user.Id,
            UserName = user.UserName,
            Email = user.Email,
            Role = user.Role?.Name ?? "User",
            CreatedAt = user.CreatedAt,
        };
    }

    public async Task<UserResponse> CreateUserAsync(string userName, string email, string password, string roleName)
    {
        if (string.IsNullOrWhiteSpace(userName))
            throw new ArgumentException("用户名不能为空", nameof(userName));

        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("邮箱不能为空", nameof(email));

        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("密码不能为空", nameof(password));

        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 检查角色是否存在
        var role = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
        if (role == null)
            throw new ArgumentException($"角色 '{roleName}' 不存在", nameof(roleName));

        // 检查用户名是否已存在
        if (await dbContext.Users.AnyAsync(u => u.UserName == userName))
            throw new ArgumentException($"用户名 '{userName}' 已被使用", nameof(userName));

        // 检查邮箱是否已存在
        if (await dbContext.Users.AnyAsync(u => u.Email == email))
            throw new ArgumentException($"邮箱 '{email}' 已被使用", nameof(email));

        // 生成密码哈希
        string passwordHash = HashPassword(password);

        // 创建新用户
        var user = new Models.DataBase.User
        {
            UserName = userName,
            Email = email,
            PasswordHash = passwordHash,
            RoleId = role.Id,
            Role = role,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // 添加用户
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        return new UserResponse
        {
            Id = user.Id,
            UserName = user.UserName,
            Email = user.Email,
            Role = roleName,
            CreatedAt = user.CreatedAt,
        };
    }

    public async Task<UserResponse> UpdateUserAsync(int id, string userName, string email, string roleName)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var user = await dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            throw new KeyNotFoundException($"找不到ID为{id}的用户");

        if (string.IsNullOrWhiteSpace(userName))
            throw new ArgumentException("用户名不能为空", nameof(userName));

        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("邮箱不能为空", nameof(email));

        // 检查角色是否存在
        var role = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
        if (role == null)
            throw new ArgumentException($"角色 '{roleName}' 不存在", nameof(roleName));

        // 检查邮箱是否已被其他用户使用
        var existingUserByEmail = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == email && u.Id != id);
        if (existingUserByEmail != null)
            throw new ArgumentException($"邮箱 '{email}' 已被使用", nameof(email));

        // 更新用户信息
        user.UserName = userName;
        user.Email = email;
        user.RoleId = role.Id;
        user.Role = role;
        user.UpdatedAt = DateTime.UtcNow;

        // 保存用户更改
        await dbContext.SaveChangesAsync();

        return new UserResponse
        {
            Id = user.Id,
            UserName = user.UserName,
            Email = user.Email,
            Role = role.Name,
            CreatedAt = user.CreatedAt,
        };
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var user = await dbContext.Users.FindAsync(id);

        if (user == null)
            throw new KeyNotFoundException($"找不到ID为{id}的用户");

        // 删除用户
        dbContext.Users.Remove(user);

        await dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<BatchDeleteResult> BatchDeleteUsersAsync(List<int> ids)
    {
        var result = new BatchDeleteResult();

        foreach (var id in ids)
        {
            try
            {
                var success = await DeleteUserAsync(id);
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

    // 辅助方法：生成密码哈希
    private string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }
}