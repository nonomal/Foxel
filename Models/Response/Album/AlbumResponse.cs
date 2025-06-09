using Foxel.Models.Response.Picture;

namespace Foxel.Models.Response.Album;

public record AlbumResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string? Username { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CoverPicturePath { get; set; }
    public string? CoverPictureThumbnailPath { get; set; }
    public int PictureCount { get; set; }
}
