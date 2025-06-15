using Foxel.Models.DataBase;
using Microsoft.EntityFrameworkCore;

namespace Foxel;

public class MyDbContext(DbContextOptions<MyDbContext> options) : DbContext(options)
{
    public DbSet<Picture> Pictures { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Tag> Tags { get; set; } = null!;
    public DbSet<Config> Configs { get; set; } = null!;
    public DbSet<Favorite> Favorites { get; set; } = null!;
    public DbSet<Album> Albums { get; set; } = null!;
    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<Log> Logs { get; set; } = null!;
    public DbSet<BackgroundTask> BackgroundTasks { get; set; } = null!;
    public DbSet<StorageMode> StorageModes { get; set; } = null!;
    public DbSet<Face> Faces { get; set; } = null!;
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Album>()
            .HasOne(a => a.CoverPicture)
            .WithMany()
            .HasForeignKey(a => a.CoverPictureId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Album>()
            .HasMany(a => a.Pictures)
            .WithOne(p => p.Album)
            .HasForeignKey(p => p.AlbumId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}