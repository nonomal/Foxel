using Microsoft.EntityFrameworkCore;
using Foxel.Models.DataBase;

namespace Foxel.Repositories;

public class FavoriteRepository : Repository<Favorite>
{
    public FavoriteRepository(MyDbContext context) : base(context)
    {
    }

    public async Task<bool> AddFavoriteAsync(int pictureId, int userId)
    {
        var existingFavorite = await FirstOrDefaultAsync(f => f.PictureId == pictureId && f.User.Id == userId);
        if (existingFavorite != null)
            return false;

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return false;

        var favorite = new Favorite
        {
            PictureId = pictureId,
            User = user,
            CreatedAt = DateTime.UtcNow
        };

        await AddAsync(favorite);
        return true;
    }

    public async Task<bool> RemoveFavoriteAsync(int pictureId, int userId)
    {
        var favorite = await FirstOrDefaultAsync(f => f.PictureId == pictureId && f.User.Id == userId);
        if (favorite == null)
            return false;

        await DeleteAsync(favorite);
        return true;
    }

    public async Task<bool> IsFavoritedByUserAsync(int pictureId, int userId)
    {
        return await ExistsAsync(f => f.PictureId == pictureId && f.User.Id == userId);
    }

    public async Task<Dictionary<int, int>> GetFavoriteCountsAsync(IEnumerable<int> pictureIds)
    {
        return await _context.Favorites
            .Where(f => pictureIds.Contains(f.PictureId))
            .GroupBy(f => f.PictureId)
            .Select(g => new { PictureId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PictureId, x => x.Count);
    }

    public async Task<HashSet<int>> GetUserFavoritedPictureIdsAsync(int userId, IEnumerable<int> pictureIds)
    {
        return await _context.Favorites
            .Where(f => f.User.Id == userId && pictureIds.Contains(f.PictureId))
            .Select(f => f.PictureId)
            .ToHashSetAsync();
    }
}