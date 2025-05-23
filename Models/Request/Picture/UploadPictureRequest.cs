using System.ComponentModel.DataAnnotations;
using Foxel.Models.DataBase;
using Foxel.Models.Enums;
using Foxel.Services.Attributes;

namespace Foxel.Models.Request.Picture;

public record UploadPictureRequest
{
    [Required(ErrorMessage = "文件不能为空")]
    public IFormFile File { get; set; } = null!;

    [Range(0, 2, ErrorMessage = "权限类型必须是0（公开）、1（私有）或2（仅关注者）")]
    public int? Permission { get; set; } = 0;

    public int? AlbumId { get; set; }

    public StorageType? StorageType { get; set; }

    /// <summary>
    /// 目标图片格式，默认为保持原格式
    /// </summary>
    public ImageFormat ConvertToFormat { get; set; } = ImageFormat.Original;

    /// <summary>
    /// 图片质量（仅对JPEG和WebP有效，1-100）
    /// </summary>
    [Range(1, 100, ErrorMessage = "图片质量必须在1-100之间")]
    public int Quality { get; set; } = 95;
}