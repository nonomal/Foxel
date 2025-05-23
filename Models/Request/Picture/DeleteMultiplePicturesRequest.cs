namespace Foxel.Models.Request.Picture;

public record DeleteMultiplePicturesRequest
{
    public List<int> PictureIds { get; set; } = new();
}
