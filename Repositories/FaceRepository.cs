using Microsoft.EntityFrameworkCore;
using Foxel.Models.DataBase;

namespace Foxel.Repositories;

public class FaceRepository(MyDbContext context) : Repository<Face>(context)
{
    public async Task<IEnumerable<Face>> GetUnclusteredFacesAsync()
    {
        return await FindAsync(
            f => f.Embedding != null && f.ClusterId == null,
            f => f.Picture!);
    }

    public async Task<IEnumerable<Face>> GetUnclusteredFacesByUserIdAsync(int userId)
    {
        return await _context.Faces
            .Where(f => f.Embedding != null && f.ClusterId == null && f.Picture.UserId == userId)
            .Include(f => f.Picture!)
            .ToListAsync();
    }

    public async Task<Face?> GetByIdWithEmbeddingAsync(int faceId)
    {
        return await FirstOrDefaultAsync(
            f => f.Id == faceId,
            f => f.Picture!);
    }

    public async Task AssignToClusterAsync(int faceId, int clusterId)
    {
        var face = await GetByIdAsync(faceId);
        if (face != null)
        {
            face.ClusterId = clusterId;
            await UpdateAsync(face);
            await SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<Face>> GetFacesByClusterIdAsync(int clusterId)
    {
        return await FindAsync(f => f.ClusterId == clusterId);
    }

    public async Task<IEnumerable<Face>> GetFacesWithEmbeddingsAsync()
    {
        return await FindAsync(f => f.Embedding != null);
    }
}