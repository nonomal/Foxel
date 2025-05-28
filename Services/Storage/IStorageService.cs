using Foxel.Services.Attributes;

namespace Foxel.Services.Storage;

/// <summary>
/// 统一的存储服务接口
/// </summary>
public interface IStorageService
{
    /// <summary>
    /// 在指定存储类型上执行操作
    /// </summary>
    /// <typeparam name="TResult">操作结果类型</typeparam>
    /// <param name="storageType">存储类型</param>
    /// <param name="operation">要执行的操作</param>
    /// <returns>操作结果</returns>
    Task<TResult> ExecuteAsync<TResult>(StorageType storageType, Func<IStorageProvider, Task<TResult>> operation);
    
    /// <summary>
    /// 在指定存储类型上执行无返回值的操作
    /// </summary>
    /// <param name="storageType">存储类型</param>
    /// <param name="operation">要执行的操作</param>
    Task ExecuteAsync(StorageType storageType, Func<IStorageProvider, Task> operation);
}
