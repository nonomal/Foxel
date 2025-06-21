using Foxel.Models.DataBase;

namespace Foxel.Repositories;

public class StorageModeRepository(MyDbContext context) : Repository<StorageMode>(context)
{
    public async Task<StorageMode?> GetEnabledByIdAsync(int id)
    {
        return await FirstOrDefaultAsync(sm => sm.Id == id && sm.IsEnabled);
    }
}