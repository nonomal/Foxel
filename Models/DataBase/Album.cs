using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Foxel.Models.DataBase;

public class Album : BaseModel
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string Description { get; set; } = string.Empty;
    public int UserId { get; set; }
    [Required]
    public User User { get; set; }

    public int? CoverPictureId { get; set; }
    [ForeignKey("CoverPictureId")]
    public Picture? CoverPicture { get; set; }

    public ICollection<Picture>? Pictures { get; set; }
}
