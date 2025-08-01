using System.ComponentModel.DataAnnotations;


namespace Foxel.Models.Request.Picture;

public record UploadPictureRequest
{
    [Required(ErrorMessage = "文件不能为空")]
    public IFormFile File { get; set; } = null!;

    [Range(0, 2, ErrorMessage = "权限类型必须是0（公开）、1（私有）或2（仅关注者）")]
    public int? Permission { get; set; } = 0;

    public int? AlbumId { get; set; }

    public int? StorageModeId { get; set; }
}