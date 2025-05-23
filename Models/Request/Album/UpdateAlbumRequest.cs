namespace Foxel.Models.Request.Album;

public record UpdateAlbumRequest : CreateAlbumRequest
{
    public int Id { get; set; }
}
