using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.Request.Album;

public record CreateAlbumRequest
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string? Description { get; set; }
    
    
    public int? CoverPictureId { get; set; }
}
