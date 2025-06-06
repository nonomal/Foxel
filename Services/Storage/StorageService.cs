using System.Reflection;
using Foxel.Services.Attributes;
using Microsoft.Extensions.Logging;

namespace Foxel.Services.Storage;

/// <summary>
/// 统一的存储服务实现
/// </summary>
public class StorageService : IStorageService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<StorageService> _logger;
    private readonly Dictionary<StorageType, Type> _storageProviders = new();

    public StorageService(IServiceProvider serviceProvider, ILogger<StorageService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
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
                _logger.LogWarning(ex, "扫描程序集 {AssemblyName} 时发生错误", assembly.FullName);
                // 继续扫描其他程序集
            }
        }
    }

    /// <summary>
    /// 获取指定存储类型的提供者实例
    /// </summary>
    private IStorageProvider GetProvider(StorageType storageType)
    {
        if (!_storageProviders.TryGetValue(storageType, out var providerType))
        {
            throw new ArgumentException($"未找到存储类型 {storageType} 的提供者");
        }

        return (IStorageProvider)_serviceProvider.GetRequiredService(providerType);
    }

    /// <summary>
    /// 在指定存储类型上执行操作
    /// </summary>
    public async Task<TResult> ExecuteAsync<TResult>(StorageType storageType, Func<IStorageProvider, Task<TResult>> operation)
    {
        var provider = GetProvider(storageType);
        return await operation(provider);
    }

    /// <summary>
    /// 在指定存储类型上执行无返回值的操作
    /// </summary>
    public async Task ExecuteAsync(StorageType storageType, Func<IStorageProvider, Task> operation)
    {
        var provider = GetProvider(storageType);
        await operation(provider);
    }
}
