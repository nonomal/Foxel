using Foxel.Services.AI;
using Foxel.Services.Auth;
using Foxel.Services.Background;
using Foxel.Services.Configuration;
using Foxel.Services.Initializer;
using Foxel.Services.Management;
using Foxel.Services.Media;
using Foxel.Services.Storage;
using Foxel.Services.Background.Processors;
using Foxel.Services.Mapping;
using Foxel.Repositories;

namespace Foxel.Extensions;

public static class BusinessServiceExtensions
{
    /// <summary>
    /// 注册核心业务服务
    /// </summary>
    public static void AddCoreServices(this IServiceCollection services)
    {
        services.AddRepositories();
        services.AddBusinessServices();
        services.AddManagementServices();
        services.AddBackgroundServices();
        services.AddProcessingServices();
    }

    /// <summary>
    /// 注册数据仓储层服务
    /// </summary>
    private static void AddRepositories(this IServiceCollection services)
    {
        services.AddScoped<UserRepository>();
        services.AddScoped<PictureRepository>();
        services.AddScoped<AlbumRepository>();
        services.AddScoped<TagRepository>();
        services.AddScoped<FavoriteRepository>();
        services.AddScoped<StorageModeRepository>();
        services.AddScoped<FaceRepository>();
        services.AddScoped<FaceClusterRepository>();
        services.AddScoped<RoleRepository>();
    }

    /// <summary>
    /// 注册核心业务服务
    /// </summary>
    private static void AddBusinessServices(this IServiceCollection services)
    {
        services.AddSingleton<ConfigService, ConfigService>();
        services.AddScoped<AiService, AiService>();
        services.AddScoped<IPictureService, PictureService>();
        services.AddScoped<AuthService, AuthService>();
        services.AddScoped<ITagService, TagService>();
        services.AddScoped<IAlbumService, AlbumService>();
        services.AddScoped<MappingService, MappingService>();
        services.AddScoped<FaceClusteringService, FaceClusteringService>();
    }

    /// <summary>
    /// 注册管理服务
    /// </summary>
    private static void AddManagementServices(this IServiceCollection services)
    {
        services.AddScoped<UserManagementService>();
        services.AddScoped<PictureManagementService>();
        services.AddScoped<AlbumManagementService>();
        services.AddScoped<LogManagementService>();
        services.AddScoped<StorageManagementService>();
        services.AddScoped<FaceManagementService>();
    }

    /// <summary>
    /// 注册后台任务服务
    /// </summary>
    private static void AddBackgroundServices(this IServiceCollection services)
    {
        services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();
        services.AddHostedService<QueuedHostedService>();
        services.AddSingleton<IStorageService, StorageService>();
    }

    /// <summary>
    /// 注册任务处理器和初始化服务
    /// </summary>
    private static void AddProcessingServices(this IServiceCollection services)
    {
        services.AddSingleton<PictureTaskProcessor>();
        services.AddSingleton<FaceRecognitionTaskProcessor>();
        services.AddSingleton<VisualRecognitionTaskProcessor>();
        services.AddTransient<DatabaseInitializer>();
    }
}