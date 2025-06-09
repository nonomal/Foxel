using Foxel.Models.DataBase;
using Foxel.Models.Response.Album;
using Foxel.Models.Response.Picture;

namespace Foxel.Services.Mapping
{
    public interface IMappingService
    {
        AlbumResponse MapAlbumToResponse(Album album);
        PictureResponse MapPictureToResponse(Picture picture);
    }
}
