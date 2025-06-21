using Foxel.Models.DataBase;

namespace Foxel.Repositories;

public class RoleRepository(MyDbContext context) : Repository<Role>(context)
{
    public async Task<Role?> GetByNameAsync(string name)
    {
        return await FirstOrDefaultAsync(r => r.Name == name);
    }

    public async Task<IEnumerable<Role>> GetAllRolesAsync()
    {
        return await GetAllAsync();
    }

    public async Task<bool> RoleExistsAsync(string name)
    {
        return await ExistsAsync(r => r.Name == name);
    }
}