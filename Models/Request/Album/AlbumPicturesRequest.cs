namespace Foxel.Models.Request.Album;

public record AlbumPicturesRequest
{
    public int AlbumId { get; set; }
    public List<int> PictureIds { get; set; } = new();
}
