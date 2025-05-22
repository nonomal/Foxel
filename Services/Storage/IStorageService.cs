using Foxel.Services.Attributes;

namespace Foxel.Services.Storage;

/// <summary>
/// 统一的存储服务接口
/// </summary>
public interface IStorageService
{
    /// <summary>
    /// 根据存储类型获取对应的存储提供者
    /// </summary>
    /// <param name="storageType">存储类型</param>
    /// <returns>存储提供者实例</returns>
    IStorageProvider GetProvider(StorageType storageType);
    
    /// <summary>
    /// 使用指定存储类型保存文件
    /// </summary>
    /// <param name="storageType">存储类型</param>
    /// <param name="fileStream">文件流</param>
    /// <param name="fileName">文件名</param>
    /// <param name="contentType">内容类型</param>
    /// <returns>存储路径</returns>
    Task<string> SaveAsync(StorageType storageType, Stream fileStream, string fileName, string contentType);
    
    /// <summary>
    /// 使用指定存储类型删除文件
    /// </summary>
    /// <param name="storageType">存储类型</param>
    /// <param name="storagePath">存储路径</param>
    Task DeleteAsync(StorageType storageType, string storagePath);
    
    /// <summary>
    /// 使用指定存储类型获取文件URL
    /// </summary>
    /// <param name="storageType">存储类型</param>
    /// <param name="storagePath">存储路径</param>
    /// <returns>文件URL</returns>
    string GetUrl(StorageType storageType, string storagePath);
    
    /// <summary>
    /// 使用指定存储类型下载文件
    /// </summary>
    /// <param name="storageType">存储类型</param>
    /// <param name="storagePath">存储路径</param>
    /// <returns>本地文件路径</returns>
    Task<string> DownloadFileAsync(StorageType storageType, string storagePath);
}
