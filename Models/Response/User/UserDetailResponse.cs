namespace Foxel.Models.Response.User;

public class UserDetailResponse
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public UserStatistics Statistics { get; set; } = new();
}

public class UserStatistics
{
    public int TotalPictures { get; set; }
    public int TotalAlbums { get; set; }
    public int TotalFavorites { get; set; }
    public int FavoriteReceivedCount { get; set; }
    public double DiskUsageMB { get; set; }
    public int AccountAgeDays { get; set; }
}
