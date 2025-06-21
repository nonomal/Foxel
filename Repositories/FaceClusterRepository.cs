using Microsoft.EntityFrameworkCore;
using Foxel.Models.DataBase;

namespace Foxel.Repositories;

public class FaceClusterRepository(MyDbContext context) : Repository<FaceCluster>(context)
{
    public async Task<IEnumerable<FaceCluster>> GetAllWithRepresentativeFacesAsync()
    {
        return await _context.FaceClusters
            .Include(c => c.Faces.Take(1))
            .ToListAsync();
    }

    public async Task<IEnumerable<FaceCluster>> GetAllWithFacesAsync(int maxFacesPerCluster)
    {
        return await _context.FaceClusters
            .Include(c => c.Faces.Take(maxFacesPerCluster))
            .ToListAsync();
    }

    public async Task<IEnumerable<FaceCluster>> GetClustersByUserIdAsync(int userId, int maxFacesPerCluster)
    {
        return await _context.FaceClusters
            .Where(c => _context.Faces.Any(f => f.ClusterId == c.Id && f.Picture.UserId == userId))
            .Include(c => c.Faces.Where(f => f.Picture.UserId == userId).Take(maxFacesPerCluster))
            .ToListAsync();
    }

    public async Task<FaceCluster?> GetClusterWithFacesAsync(int clusterId)
    {
        return await _context.FaceClusters
            .Include(c => c.Faces.Where(f => f.Embedding != null))
            .FirstOrDefaultAsync(c => c.Id == clusterId);
    }

    public async Task<IEnumerable<FaceCluster>> GetUserClustersWithFacesAsync(int userId)
    {
        return await _context.FaceClusters
            .Where(c => _context.Faces.Any(f => f.ClusterId == c.Id && f.Picture.UserId == userId))
            .Include(c => c.Faces.Where(f => f.Picture.UserId == userId && f.Embedding != null))
            .ToListAsync();
    }

    public async Task<int> GetFaceCountByClusterIdAsync(int clusterId)
    {
        return await _context.Faces.CountAsync(f => f.ClusterId == clusterId);
    }

    public async Task<bool> UpdateClusterNameAsync(int clusterId, string newName)
    {
        var cluster = await GetByIdAsync(clusterId);
        if (cluster == null) return false;

        cluster.Name = newName;
        cluster.UpdatedAt = DateTime.UtcNow;
        await UpdateAsync(cluster);
        await SaveChangesAsync();
        return true;
    }

    public async Task<FaceCluster> CreateAsync(FaceCluster cluster)
    {
        var createdCluster = await AddAsync(cluster);
        await SaveChangesAsync();
        return createdCluster;
    }
}