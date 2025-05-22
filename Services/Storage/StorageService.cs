using System.Reflection;
using Foxel.Services.Attributes;

namespace Foxel.Services.Storage;

/// <summary>
/// 统一的存储服务实现
/// </summary>
public class StorageService : IStorageService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly Dictionary<StorageType, Type> _storageProviders = new();

    public StorageService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        RegisterStorageProviders();
    }

    /// <summary>
    /// 使用反射扫描和注册所有标记了StorageProviderAttribute的存储提供者
    /// </summary>
    private void RegisterStorageProviders()
    {
        // 获取当前应用程序域中所有程序集
        var assemblies = AppDomain.CurrentDomain.GetAssemblies();
        
        foreach (var assembly in assemblies)
        {
            try
            {
                // 扫描每个程序集中的所有类型
                var types = assembly.GetTypes()
                    .Where(type => type is { IsClass: true, IsAbstract: false } && 
                                   type.GetInterfaces().Contains(typeof(IStorageProvider)) &&
                                   type.GetCustomAttribute<StorageProviderAttribute>() != null);

                foreach (var type in types)
                {
                    var attribute = type.GetCustomAttribute<StorageProviderAttribute>();
                    if (attribute != null)
                    {
                        // 注册存储提供者类型与对应的存储类型
                        _storageProviders[attribute.StorageType] = type;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"扫描程序集 {assembly.FullName} 出错: {ex.Message}");
                // 继续扫描其他程序集
            }
        }
    }

    /// <summary>
    /// 获取指定存储类型的提供者实例
    /// </summary>
    public IStorageProvider GetProvider(StorageType storageType)
    {
        if (!_storageProviders.TryGetValue(storageType, out var providerType))
        {
            throw new ArgumentException($"未找到存储类型 {storageType} 的提供者");
        }

        return (IStorageProvider)_serviceProvider.GetRequiredService(providerType);
    }

    /// <summary>
    /// 使用指定存储类型保存文件
    /// </summary>
    public Task<string> SaveAsync(StorageType storageType, Stream fileStream, string fileName, string contentType)
    {
        var provider = GetProvider(storageType);
        return provider.SaveAsync(fileStream, fileName, contentType);
    }

    /// <summary>
    /// 使用指定存储类型删除文件
    /// </summary>
    public Task DeleteAsync(StorageType storageType, string storagePath)
    {
        var provider = GetProvider(storageType);
        return provider.DeleteAsync(storagePath);
    }

    /// <summary>
    /// 使用指定存储类型获取文件URL
    /// </summary>
    public string GetUrl(StorageType storageType, string storagePath)
    {
        var provider = GetProvider(storageType);
        return provider.GetUrl(storagePath);
    }

    /// <summary>
    /// 使用指定存储类型下载文件
    /// </summary>
    public Task<string> DownloadFileAsync(StorageType storageType, string storagePath)
    {
        var provider = GetProvider(storageType);
        return provider.DownloadFileAsync(storagePath);
    }
}
