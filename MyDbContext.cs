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
}