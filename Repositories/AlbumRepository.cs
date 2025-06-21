using Microsoft.EntityFrameworkCore;
using Foxel.Models.DataBase;

namespace Foxel.Repositories;

public class AlbumRepository : Repository<Album>
{
    public AlbumRepository(MyDbContext context) : base(context)
    {
    }

    public async Task<(IEnumerable<Album> Albums, int TotalCount)> GetPaginatedAsync(int page, int pageSize, int? userId = null)
    {
        var query = Query(a => a.User!, a => a.CoverPicture!, a => a.Pictures!)
            .OrderByDescending(a => a.CreatedAt);

        if (userId.HasValue)
        {
            query = (IOrderedQueryable<Album>)query.Where(a => a.UserId == userId.Value);
        }

        var totalCount = await query.CountAsync();
        var albums = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (albums, totalCount);
    }

    public async Task<Album?> GetByIdWithIncludesAsync(int id)
    {
        return await FirstOrDefaultAsync(
            a => a.Id == id,
            a => a.User!,
            a => a.CoverPicture!,
            a => a.Pictures!
        );
    }

    public async Task<bool> IsOwnerAsync(int albumId, int userId)
    {
        return await ExistsAsync(a => a.Id == albumId && a.UserId == userId);
    }

    public async Task<IEnumerable<Picture>> GetPicturesByAlbumIdAsync(int albumId)
    {
        return await _context.Pictures
            .Where(p => p.AlbumId == albumId)
            .ToListAsync();
    }

    public async Task<bool> SetCoverPictureAsync(int albumId, int pictureId)
    {
        var album = await GetByIdAsync(albumId);
        if (album == null) return false;

        album.CoverPictureId = pictureId;
        album.UpdatedAt = DateTime.UtcNow;
        
        await UpdateAsync(album);
        return true;
    }
}