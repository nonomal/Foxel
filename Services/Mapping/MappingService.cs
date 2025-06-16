using Foxel.Models.DataBase;
using Foxel.Models.Response.Album;
using Foxel.Models.Response.Picture;
using Foxel.Services.Storage;

namespace Foxel.Services.Mapping
{
    public class MappingService(IStorageService storageService)
        : IMappingService
    {
        public AlbumResponse MapAlbumToResponse(Album album)
        {
            string? coverPath = null;
            string? coverThumbnailPath = null;

            if (album.CoverPicture != null)
            {
                coverPath = storageService.ExecuteAsync(album.CoverPicture.StorageModeId,
                        provider => Task.FromResult(provider.GetUrl(album.CoverPicture.Id, album.CoverPicture.Path)))
                    .Result;
                if (!string.IsNullOrEmpty(album.CoverPicture.ThumbnailPath))
                {
                    coverThumbnailPath = storageService.ExecuteAsync(album.CoverPicture.StorageModeId,
                        provider => Task.FromResult(provider.GetUrl(album.CoverPicture.Id,
                            album.CoverPicture.ThumbnailPath))).Result;
                }
            }

            return new AlbumResponse
            {
                Id = album.Id,
                Name = album.Name,
                Description = album.Description,
                UserId = album.UserId,
                Username = album.User.UserName,
                CreatedAt = album.CreatedAt,
                UpdatedAt = album.UpdatedAt,
                CoverPicturePath = coverPath,
                CoverPictureThumbnailPath = coverThumbnailPath,
                PictureCount = album.Pictures?.Count ?? 0
            };
        }

        public PictureResponse MapPictureToResponse(Picture picture)
        {
            return new PictureResponse
            {
                Id = picture.Id,
                Name = picture.Name,
                Path = storageService.ExecuteAsync(picture.StorageModeId, provider =>
                    Task.FromResult(provider.GetUrl(picture.Id, picture.Path))).Result,
                ThumbnailPath = storageService.ExecuteAsync(picture.StorageModeId, provider =>
                        Task.FromResult(provider.GetUrl(picture.Id, picture.ThumbnailPath ?? picture.Path)))
                    .Result,
                Description = picture.Description,
                CreatedAt = picture.CreatedAt,
                TakenAt = picture.TakenAt,
                ExifInfo = picture.ExifInfo,
                UserId = picture.UserId,
                Username = picture.User?.UserName,
                Tags = picture.Tags?.Select(t => t.Name).ToList(),
                AlbumId = picture.AlbumId,
                AlbumName = picture.Album?.Name,
                Permission = picture.Permission,
                FavoriteCount = picture.Favorites?.Count ?? 0,
                StorageModeName = picture.StorageMode?.Name,
                Faces = picture.Faces?.Select(face => new FaceResponse
                {
                    X = face.X,
                    Y = face.Y,
                    W = face.W,
                    H = face.H,
                    FaceConfidence = face.FaceConfidence,
                    PersonName = face.PersonName
                }).ToList(),
            };
        }
    }
}