using Microsoft.EntityFrameworkCore;
using Foxel.Models.DataBase;

namespace Foxel.Repositories;

public class UserRepository(MyDbContext context) : Repository<User>(context)
{
    public async Task<User?> GetByEmailAsync(string email)
    {
        return await FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<User?> GetByEmailWithRoleAsync(string email)
    {
        return await FirstOrDefaultAsync(
            u => u.Email == email,
            u => u.Role!);
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await FirstOrDefaultAsync(u => u.UserName == username);
    }

    public async Task<User?> GetByIdWithRoleAsync(int userId)
    {
        return await FirstOrDefaultAsync(
            u => u.Id == userId,
            u => u.Role!);
    }

    public async Task<User?> GetByGitHubIdAsync(string githubId)
    {
        return await FirstOrDefaultAsync(
            u => u.GithubId == githubId,
            u => u.Role!);
    }

    public async Task<User?> GetByLinuxDoIdAsync(string linuxdoId)
    {
        return await FirstOrDefaultAsync(
            u => u.LinuxDoId == linuxdoId,
            u => u.Role!);
    }

    public async Task<int> GetCountAsync()
    {
        return await CountAsync();
    }

    public async Task<bool> IsEmailExistsAsync(string email, int? excludeUserId = null)
    {
        if (excludeUserId.HasValue)
        {
            return await ExistsAsync(u => u.Email == email && u.Id != excludeUserId.Value);
        }
        return await ExistsAsync(u => u.Email == email);
    }

    public async Task<bool> IsUsernameExistsAsync(string username, int? excludeUserId = null)
    {
        if (excludeUserId.HasValue)
        {
            return await ExistsAsync(u => u.UserName == username && u.Id != excludeUserId.Value);
        }
        return await ExistsAsync(u => u.UserName == username);
    }

    public async Task<User> CreateAsync(User user)
    {
        var createdUser = await AddAsync(user);
        await SaveChangesAsync();
        return createdUser;
    }

    public async new Task UpdateAsync(User user)
    {
        await base.UpdateAsync(user);
        await SaveChangesAsync();
    }
}