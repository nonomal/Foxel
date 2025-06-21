using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.Request.Album
{
    public class AlbumUpdateRequest
    {
        [StringLength(100, ErrorMessage = "相册名称长度不能超过100个字符")]
        public string? Name { get; set; }

        [StringLength(500, ErrorMessage = "相册描述长度不能超过500个字符")]
        public string? Description { get; set; }

        public int? CoverPictureId { get; set; }
    }
}
