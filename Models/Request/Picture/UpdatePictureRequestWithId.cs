namespace Foxel.Models.Request.Picture;

public record UpdatePictureRequestWithId : UpdatePictureRequest
{
    public int Id { get; set; }
}
