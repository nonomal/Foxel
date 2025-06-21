namespace Foxel.Models.Request.Picture
{
    public class UpdatePictureRequestWithId
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public List<string>? Tags { get; set; }
        public int? Permission { get; set; } // Added Permission property
    }
}
