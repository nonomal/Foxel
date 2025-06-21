using Foxel.Api.Management;
using Foxel.Models;
using Foxel.Models.DataBase;
using Foxel.Models.Request.Album;
using Foxel.Models.Response.Album;
using Foxel.Models.Response.Picture;
using Microsoft.EntityFrameworkCore;
using Foxel.Services.Mapping;


namespace Foxel.Services.Management
{
    public class AlbumManagementService(
        IDbContextFactory<MyDbContext> contextFactory,
        MappingService mappingService, 
        ILogger<AlbumManagementService> logger)
    {
        public async Task<PaginatedResult<AlbumResponse>> GetAlbumsAsync(int page = 1, int pageSize = 10,
            string? searchQuery = null, int? userId = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            await using var dbContext = await contextFactory.CreateDbContextAsync();
            var query = dbContext.Albums
                .Include(a => a.User)
                .Include(a => a.CoverPicture)
                .Include(a => a.Pictures) // To get PictureCount
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchQuery))
            {
                query = query.Where(a =>
                    a.Name.Contains(searchQuery) || (a.Description != null && a.Description.Contains(searchQuery)));
            }

            if (userId.HasValue)
            {
                query = query.Where(a => a.UserId == userId.Value);
            }

            query = query.OrderByDescending(a => a.CreatedAt);

            var totalCount = await query.CountAsync();
            var albums = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var albumResponses = albums.Select(mappingService.MapAlbumToResponse).ToList();

            return new PaginatedResult<AlbumResponse>
            {
                Data = albumResponses,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            };
        }

        public async Task<AlbumResponse> GetAlbumByIdAsync(int id)
        {
            await using var dbContext = await contextFactory.CreateDbContextAsync();
            var album = await dbContext.Albums
                .Include(a => a.User)
                .Include(a => a.CoverPicture)
                .Include(a => a.Pictures) // Ensure Pictures is included for PictureCount
                .FirstOrDefaultAsync(a => a.Id == id);

            if (album == null)
                throw new KeyNotFoundException($"找不到ID为 {id} 的相册");

            return mappingService.MapAlbumToResponse(album);
        }

        public async Task<AlbumResponse> CreateAlbumAsync(AlbumCreateRequest request, int creatorUserId)
        {
            await using var dbContext = await contextFactory.CreateDbContextAsync();

            var album = new Album
            {
                Name = request.Name,
                Description = request.Description ?? string.Empty,
                UserId = creatorUserId,
                CoverPictureId = request.CoverPictureId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Albums.AddAsync(album);
            await dbContext.SaveChangesAsync();

            // Reload to include navigation properties if needed for response, or map manually
            var createdAlbum = await dbContext.Albums
                .Include(a => a.User)
                .Include(a => a.CoverPicture)
                .Include(a => a.Pictures) // Ensure Pictures is included for PictureCount
                .FirstAsync(a => a.Id == album.Id);

            return mappingService.MapAlbumToResponse(createdAlbum);
        }

        public async Task<AlbumResponse> UpdateAlbumAsync(int id, AlbumUpdateRequest request)
        {
            await using var dbContext = await contextFactory.CreateDbContextAsync();
            var album = await dbContext.Albums
                .Include(a => a.User)
                .Include(a => a.CoverPicture) // Keep this for cover picture
                .Include(a => a.Pictures) // Keep this for PictureCount
                .FirstOrDefaultAsync(a => a.Id == id);

            if (album == null)
                throw new KeyNotFoundException($"找不到ID为 {id} 的相册");

            if (request.Name != null)
                album.Name = request.Name;
            if (request.Description != null)
                album.Description = request.Description;
            if (request.CoverPictureId.HasValue)
                album.CoverPictureId = request.CoverPictureId.Value == 0 ? null : request.CoverPictureId;


            album.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            // Reload CoverPicture if it was changed by ID
            if (request.CoverPictureId.HasValue)
            {
                album = await dbContext.Albums
                    .Include(a => a.User)
                    .Include(a => a.CoverPicture)
                    .Include(a => a.Pictures) // Ensure Pictures is included for PictureCount
                    .FirstAsync(a => a.Id == id);
            }
            // If CoverPictureId was not updated, but other fields were, we still need the full album for mapping
            else if (album.CoverPicture == null && album.CoverPictureId != null) // Case where CoverPicture was null but ID existed
            {
                 album = await dbContext.Albums
                    .Include(a => a.User)
                    .Include(a => a.CoverPicture)
                    .Include(a => a.Pictures)
                    .FirstAsync(a => a.Id == id);
            }


            return mappingService.MapAlbumToResponse(album);
        }

        public async Task<bool> DeleteAlbumAsync(int id)
        {
            await using var dbContext = await contextFactory.CreateDbContextAsync();
            var album = await dbContext.Albums.FirstOrDefaultAsync(a => a.Id == id);

            if (album == null)
                throw new KeyNotFoundException($"找不到ID为 {id} 的相册");

            // Find all pictures belonging to this album
            var picturesInAlbum = await dbContext.Pictures
                .Where(p => p.AlbumId == id)
                .ToListAsync();

            // Disassociate pictures from the album
            foreach (var picInAlbum in picturesInAlbum)
            {
                picInAlbum.AlbumId = null;
            }

            dbContext.Albums.Remove(album);
            await dbContext.SaveChangesAsync(); // This will save both picture updates and album deletion.
            return true;
        }

        public async Task<BatchDeleteResult> BatchDeleteAlbumsAsync(List<int> ids)
        {
            var result = new BatchDeleteResult();
            foreach (var id in ids)
            {
                try
                {
                    var success = await DeleteAlbumAsync(id);
                    if (success)
                        result.SuccessCount++;
                    else
                    {
                        result.FailedCount++;
                        result.FailedIds.Add(id);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, $"批量删除相册失败，ID: {id}");
                    result.FailedCount++;
                    result.FailedIds.Add(id);
                }
            }

            return result;
        }

        public async Task<PaginatedResult<AlbumResponse>> GetAlbumsByUserIdAsync(int userId, int page = 1,
            int pageSize = 10)
        {
            return await GetAlbumsAsync(page, pageSize, null, userId);
        }

        public async Task<bool> AddPictureToAlbumAsync(int albumId, int pictureId)
        {
            await using var dbContext = await contextFactory.CreateDbContextAsync();
            var album = await dbContext.Albums.FindAsync(albumId);
            var picture = await dbContext.Pictures.FindAsync(pictureId);

            if (album == null)
                throw new KeyNotFoundException($"找不到ID为 {albumId} 的相册");
            if (picture == null)
                throw new KeyNotFoundException($"找不到ID为 {pictureId} 的图片");

            if (picture.AlbumId == albumId)
            {
                // Picture is already in this album or no change needed
                return true;
            }

            picture.AlbumId = albumId;
            // picture.Album = album; // EF Core will link this based on AlbumId if Album navigation property exists on Picture

            await dbContext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemovePictureFromAlbumAsync(int albumId, int pictureId)
        {
            await using var dbContext = await contextFactory.CreateDbContextAsync();
            var picture = await dbContext.Pictures
                .FirstOrDefaultAsync(p => p.Id == pictureId && p.AlbumId == albumId);

            if (picture == null)
                throw new KeyNotFoundException($"在相册 {albumId} 中找不到图片 {pictureId}");

            picture.AlbumId = null;
            await dbContext.SaveChangesAsync();
            return true;
        }

        public async Task<PaginatedResult<PictureResponse>> GetPicturesInAlbumAsync(int albumId, int page = 1,
            int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            await using var dbContext = await contextFactory.CreateDbContextAsync();

            var albumExists = await dbContext.Albums.AnyAsync(a => a.Id == albumId);
            if (!albumExists)
            {
                throw new KeyNotFoundException($"找不到ID为 {albumId} 的相册");
            }

            var query = dbContext.Pictures
                .Where(p => p.AlbumId == albumId)
                .Include(p => p.User)
                .Include(p => p.Tags)
                .Include(p => p.Favorites);

            query =
                (Microsoft.EntityFrameworkCore.Query.IIncludableQueryable<Picture, ICollection<Favorite>?>)query
                    .OrderByDescending(p => p.CreatedAt);

            var totalCount = await query.CountAsync();
            var pictures = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var pictureResponses = pictures.Select(mappingService.MapPictureToResponse).ToList();

            return new PaginatedResult<PictureResponse>
            {
                Data = pictureResponses,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            };
        }

        public async Task<bool> SetAlbumCoverAsync(int albumId, int pictureId)
        {
            await using var dbContext = await contextFactory.CreateDbContextAsync();
            var album = await dbContext.Albums.FindAsync(albumId);
            if (album == null)
                throw new KeyNotFoundException($"找不到ID为 {albumId} 的相册");

            var picture = await dbContext.Pictures.FindAsync(pictureId);
            if (picture == null)
                throw new KeyNotFoundException($"找不到ID为 {pictureId} 的图片");

            // Ensure the picture is part of the album by checking its AlbumId
            if (picture.AlbumId != albumId)
                throw new InvalidOperationException($"图片 {pictureId} 不属于相册 {albumId}");

            album.CoverPictureId = pictureId;
            album.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
            return true;
        }
    }
}