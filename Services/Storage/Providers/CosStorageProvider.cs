using COSXML;
using COSXML.Auth;
using COSXML.CosException;
using COSXML.Model.Object;
using COSXML.Model.Tag;
using COSXML.Transfer;
using Foxel.Services.Attributes;
using Foxel.Services.Configuration;

namespace Foxel.Services.Storage.Providers;

public class CustomQCloudCredentialProvider : DefaultSessionQCloudCredentialProvider
{
    private readonly IConfigService _configService;

    public CustomQCloudCredentialProvider(IConfigService configService) 
        : base(null, null, 0L, null)
    {
        _configService = configService;
        Refresh();
    }

    public sealed override void Refresh()
    {
        try
        {
            string tmpSecretId = _configService["Storage:CosStorageSecretId"];
            string tmpSecretKey = _configService["Storage:CosStorageSecretKey"];
            string tmpToken = _configService["Storage:CosStorageToken"]; 
            long tmpStartTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            long tmpExpiredTime = tmpStartTime + 7200;
            SetQCloudCredential(tmpSecretId, tmpSecretKey,
                $"{tmpStartTime};{tmpExpiredTime}", tmpToken);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"刷新临时密钥时出错: {ex.Message}");
            throw;
        }
    }
}

[StorageProvider(StorageType.Cos)]
public class CosStorageProvider(IConfigService configService) : IStorageProvider
{
    private CosXml CreateClient()
    {
        var config = new CosXmlConfig.Builder()
            .IsHttps(true) 
            .SetRegion(configService["Storage:CosStorageRegion"])
            .SetDebugLog(true) 
            .Build();
            
        var cosCredentialProvider = new CustomQCloudCredentialProvider(configService);
        
        return new CosXmlServer(config, cosCredentialProvider);
    }

    public async Task<string> SaveAsync(Stream fileStream, string fileName, string contentType)
    {
        try
        {
            // 创建唯一的文件存储路径
            string currentDate = DateTime.Now.ToString("yyyy/MM");
            string ext = Path.GetExtension(fileName);
            string objectKey = $"{currentDate}/{Guid.NewGuid()}{ext}";

            // 创建临时文件
            string tempPath = Path.GetTempFileName();
            try
            {
                await using (var fileStream2 = new FileStream(tempPath, FileMode.Create))
                {
                    await fileStream.CopyToAsync(fileStream2);
                }

                var cosXmlClient = CreateClient();
                var transferConfig = new TransferConfig();
                var transferManager = new TransferManager(cosXmlClient, transferConfig);
                var uploadTask = new COSXMLUploadTask(configService["Storage:CosStorageBucketName"], objectKey);
                uploadTask.SetSrcPath(tempPath);
                await transferManager.UploadAsync(uploadTask);
                return objectKey;
            }
            finally
            {
                // 确保临时文件被删除
                if (File.Exists(tempPath))
                {
                    File.Delete(tempPath);
                }
            }
        }
        catch (CosClientException clientEx)
        {
            Console.WriteLine($"COS客户端异常: {clientEx}");
            throw;
        }
        catch (CosServerException serverEx)
        {
            Console.WriteLine($"COS服务器异常: {serverEx.GetInfo()}");
            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"上传文件到腾讯云COS时出错: {ex.Message}");
            throw;
        }
    }

    public async Task DeleteAsync(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
                return;

            var cosXmlClient = CreateClient();
            var request = new DeleteObjectRequest(configService["Storage:CosStorageBucketName"], storagePath);
            await Task.Run(() => cosXmlClient.DeleteObject(request));
        }
        catch (CosClientException clientEx)
        {
            Console.WriteLine($"COS客户端异常: {clientEx}");
        }
        catch (CosServerException serverEx)
        {
            Console.WriteLine($"COS服务器异常: {serverEx.GetInfo()}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"从腾讯云COS删除文件时出错: {ex.Message}");
        }
    }

    public string GetUrl(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
                return "/images/unavailable.gif";

            string cdnUrl = configService["Storage:CosStorageCdnUrl"];
            string bucketName = configService["Storage:CosStorageBucketName"];
            string region = configService["Storage:CosStorageRegion"];
            bool isPublicRead = bool.TryParse(configService["Storage:CosStoragePublicRead"], out var publicRead) && publicRead;

            // 优先使用CDN
            if (!string.IsNullOrEmpty(cdnUrl))
                return $"{cdnUrl}/{storagePath}";

            // 公开读取的桶可直接访问
            if (isPublicRead)
                return $"https://{bucketName}.cos.{region}.myqcloud.com/{storagePath}";

            var cosXmlClient = CreateClient();
            var bucketParts = bucketName.Split('-');
            var request = new PreSignatureStruct
            {
                bucket = bucketParts[0],
                appid = bucketParts[1],
                region = region,
                key = storagePath,
                httpMethod = "GET",
                isHttps = true,
                signDurationSecond = 3600 * 24  
            };
            
            var url = cosXmlClient.GenerateSignURL(request);
            return url;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"生成腾讯云COS文件URL时出错: {ex.Message}");
            return "/images/unavailable.gif";
        }
    }

    public async Task<string> DownloadFileAsync(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
            {
                throw new ArgumentException("存储路径不能为空");
            }

            // 创建临时目录
            var tempDir = Path.Combine(Path.GetTempPath(), "FoxelCosTemp");
            if (!Directory.Exists(tempDir))
            {
                Directory.CreateDirectory(tempDir);
            }

            string bucketName = configService["Storage:CosStorageBucketName"];
            string fileName = Path.GetFileName(storagePath);
            
            var cosXmlClient = CreateClient();
            var transferConfig = new TransferConfig();
            var transferManager = new TransferManager(cosXmlClient, transferConfig);
            var downloadTask = new COSXMLDownloadTask(bucketName, storagePath, tempDir, fileName);
            await transferManager.DownloadAsync(downloadTask);
            return Path.Combine(tempDir, fileName);
        }
        catch (CosClientException clientEx)
        {
            Console.WriteLine($"COS客户端异常: {clientEx}");
            throw;
        }
        catch (CosServerException serverEx)
        {
            Console.WriteLine($"COS服务器异常: {serverEx.GetInfo()}");
            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"从腾讯云COS下载文件时出错: {ex.Message}");
            throw;
        }
    }
}
