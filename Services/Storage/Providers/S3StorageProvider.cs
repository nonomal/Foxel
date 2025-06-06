using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Foxel.Services.Attributes;
using Foxel.Services.Configuration;
using Microsoft.Extensions.Logging;

namespace Foxel.Services.Storage.Providers;

[StorageProvider(StorageType.S3)]
public class S3StorageProvider(IConfigService configService, ILogger<S3StorageProvider> logger) : IStorageProvider
{
    private AmazonS3Client CreateClient()
    {
        string accessKey = configService["Storage:S3StorageAccessKey"];
        string secretKey = configService["Storage:S3StorageSecretKey"];
        string endpoint = configService["Storage:S3StorageEndpoint"];
        string region = configService["Storage:S3StorageRegion"];
        bool usePathStyleUrls = bool.TryParse(configService["Storage:S3StorageUsePathStyleUrls"], out var usePathStyle) && usePathStyle;

        var config = new AmazonS3Config
        {
            ServiceURL = endpoint,
            UseHttp = !endpoint.StartsWith("https", StringComparison.OrdinalIgnoreCase),
            ForcePathStyle = usePathStyleUrls
        };

        if (!string.IsNullOrEmpty(region) && endpoint.Contains("amazonaws.com"))
        {
            config.RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(region);
        }
        
        return new AmazonS3Client(
            accessKey,
            secretKey,
            config
        );
    }

    public async Task<string> SaveAsync(Stream fileStream, string fileName, string contentType)
    {
        try
        {
            // 创建唯一的文件存储路径
            string currentDate = DateTime.Now.ToString("yyyy/MM");
            string ext = Path.GetExtension(fileName);
            string objectKey = $"{currentDate}/{Guid.NewGuid()}{ext}";

            using var client = CreateClient();
            using var transferUtility = new TransferUtility(client);
            
            var uploadRequest = new TransferUtilityUploadRequest
            {
                InputStream = fileStream,
                Key = objectKey,
                BucketName = configService["Storage:S3StorageBucketName"],
                ContentType = contentType
            };

            await transferUtility.UploadAsync(uploadRequest);
            
            // 返回文件的路径
            return objectKey;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "上传文件到S3时出错");
            throw;
        }
    }

    public async Task DeleteAsync(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
                return;

            using var client = CreateClient();
            var deleteRequest = new DeleteObjectRequest
            {
                BucketName = configService["Storage:S3StorageBucketName"],
                Key = storagePath
            };

            await client.DeleteObjectAsync(deleteRequest);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "从S3删除文件时出错");
        }
    }

    public string GetUrl(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
                return "/images/unavailable.gif";

            string cdnUrl = configService["Storage:S3StorageCdnUrl"];

            // 如果配置了CDN URL，使用CDN
            if (!string.IsNullOrEmpty(cdnUrl))
            {
                return $"{cdnUrl}/{storagePath}";
            }

            // 否则使用S3直链或生成预签名URL
            using var client = CreateClient();
            var request = new GetPreSignedUrlRequest
            {
                BucketName = configService["Storage:S3StorageBucketName"],
                Key = storagePath,
                Expires = DateTime.UtcNow.AddHours(1) // URL有效期1小时
            };

            return client.GetPreSignedURL(request);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "生成S3文件URL时出错");
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
            var tempDir = Path.Combine(Path.GetTempPath(), "FoxelS3Temp");
            if (!Directory.Exists(tempDir))
            {
                Directory.CreateDirectory(tempDir);
            }

            // 创建临时文件名
            string fileName = Path.GetFileName(storagePath);
            string tempFilePath = Path.Combine(tempDir, fileName);

            // 下载文件
            using var client = CreateClient();
            var request = new GetObjectRequest
            {
                BucketName = configService["Storage:S3StorageBucketName"],
                Key = storagePath
            };

            using var response = await client.GetObjectAsync(request);
            await using var fileStream = new FileStream(tempFilePath, FileMode.Create);
            await response.ResponseStream.CopyToAsync(fileStream);

            return tempFilePath;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "从S3下载文件时出错");
            throw;
        }
    }
}
