namespace Foxel.Models.Request.Tag;

public record UpdateTagRequest : CreateTagRequest
{
    public int Id { get; set; }
}
