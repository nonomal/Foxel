namespace Foxel.Models.Request.Album;

public record AlbumPictureRequest
{
    public int AlbumId { get; set; }
    public int PictureId { get; set; }
}
