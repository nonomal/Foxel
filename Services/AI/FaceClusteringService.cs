using Foxel.Models.DataBase;
using Microsoft.EntityFrameworkCore;

namespace Foxel.Services.AI;

public class FaceClusteringService(
    IDbContextFactory<MyDbContext> contextFactory,
    ILogger<FaceClusteringService> logger) : IFaceClusteringService
{
    private const double SIMILARITY_THRESHOLD = 0.5;

    public async Task<List<FaceCluster>> ClusterFacesAsync()
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 获取所有有嵌入向量但未分类的人脸
        var unclusteredFaces = await dbContext.Faces
            .Where(f => f.Embedding != null && f.ClusterId == null)
            .Include(f => f.Picture)
            .ToListAsync();

        var clusters = new List<FaceCluster>();

        foreach (var face in unclusteredFaces)
        {
            var assignedCluster = await FindBestClusterAsync(face, clusters, dbContext);

            if (assignedCluster != null)
            {
                // 分配到现有聚类
                face.ClusterId = assignedCluster.Id;
            }
            else
            {
                // 创建新聚类
                var newCluster = new FaceCluster
                {
                    Name = $"未知人物 {clusters.Count + 1}",
                    CreatedAt = DateTime.UtcNow
                };

                dbContext.FaceClusters.Add(newCluster);
                await dbContext.SaveChangesAsync();

                face.ClusterId = newCluster.Id;
                clusters.Add(newCluster);
            }
        }

        await dbContext.SaveChangesAsync();
        logger.LogInformation("人脸聚类完成，共处理 {FaceCount} 个人脸，生成 {ClusterCount} 个聚类",
            unclusteredFaces.Count, clusters.Count);

        return clusters;
    }

    public async Task<FaceCluster?> AssignFaceToClusterAsync(int faceId)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        var face = await dbContext.Faces
            .Include(f => f.Picture)
            .FirstOrDefaultAsync(f => f.Id == faceId);

        if (face?.Embedding == null) return null;

        // 获取所有现有聚类的代表人脸
        var existingClusters = await dbContext.FaceClusters
            .Include(c => c.Faces.Take(1))
            .ToListAsync();

        foreach (var cluster in existingClusters)
        {
            if (cluster.Faces?.Any() == true)
            {
                var representativeFace = cluster.Faces.First();
                if (representativeFace.Embedding != null)
                {
                    var similarity = CalculateSimilarity(face.Embedding, representativeFace.Embedding);
                    if (similarity >= SIMILARITY_THRESHOLD)
                    {
                        face.ClusterId = cluster.Id;
                        await dbContext.SaveChangesAsync();
                        return cluster;
                    }
                }
            }
        }

        // 创建新聚类
        var newCluster = new FaceCluster
        {
            Name = $"未知人物 {DateTime.Now:yyyyMMddHHmmss}",
            CreatedAt = DateTime.UtcNow
        };

        dbContext.FaceClusters.Add(newCluster);
        await dbContext.SaveChangesAsync();

        face.ClusterId = newCluster.Id;
        await dbContext.SaveChangesAsync();

        return newCluster;
    }

    public double CalculateSimilarity(float[] embedding1, float[] embedding2)
    {
        if (embedding1.Length != embedding2.Length) return 0;

        // 计算余弦相似度
        double dot = 0, norm1 = 0, norm2 = 0;

        for (int i = 0; i < embedding1.Length; i++)
        {
            dot += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }

        if (norm1 == 0 || norm2 == 0) return 0;

        return dot / (Math.Sqrt(norm1) * Math.Sqrt(norm2));
    }

    private async Task<FaceCluster?> FindBestClusterAsync(Face face, List<FaceCluster> newClusters, MyDbContext dbContext)
    {
        if (face.Embedding == null) return null;

        double bestSimilarity = 0;
        FaceCluster? bestCluster = null;

        // 检查现有数据库中的聚类
        var existingClusters = await dbContext.FaceClusters
            .Include(c => c.Faces.Take(5)) // 取前5个人脸作为比较
            .ToListAsync();

        foreach (var cluster in existingClusters.Concat(newClusters))
        {
            if (cluster.Faces?.Any() == true)
            {
                foreach (var clusterFace in cluster.Faces)
                {
                    if (clusterFace.Embedding != null)
                    {
                        var similarity = CalculateSimilarity(face.Embedding, clusterFace.Embedding);
                        if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD)
                        {
                            bestSimilarity = similarity;
                            bestCluster = cluster;
                        }
                    }
                }
            }
        }

        return bestCluster;
    }

    public async Task<List<FaceCluster>> ClusterUserFacesAsync(int userId)
    {
        await using var dbContext = await contextFactory.CreateDbContextAsync();

        // 获取指定用户所有有嵌入向量但未分类的人脸
        var unclusteredFaces = await dbContext.Faces
            .Where(f => f.Embedding != null && f.ClusterId == null && f.Picture.UserId == userId)
            .Include(f => f.Picture)
            .ToListAsync();

        var clusters = new List<FaceCluster>();

        foreach (var face in unclusteredFaces)
        {
            var assignedCluster = await FindBestUserClusterAsync(face, userId, clusters, dbContext);

            if (assignedCluster != null)
            {
                face.ClusterId = assignedCluster.Id;
            }
            else
            {
                var newCluster = new FaceCluster
                {
                    Name = $"未知人物 {DateTime.Now:yyyyMMddHHmmss}",
                    CreatedAt = DateTime.UtcNow
                };

                dbContext.FaceClusters.Add(newCluster);
                await dbContext.SaveChangesAsync();

                face.ClusterId = newCluster.Id;
                clusters.Add(newCluster);
            }
        }

        await dbContext.SaveChangesAsync();
        logger.LogInformation("用户 {UserId} 人脸聚类完成，共处理 {FaceCount} 个人脸，生成 {ClusterCount} 个聚类",
            userId, unclusteredFaces.Count, clusters.Count);

        return clusters;
    }

    private async Task<FaceCluster?> FindBestUserClusterAsync(Face face, int userId, List<FaceCluster> newClusters, MyDbContext dbContext)
    {
        if (face.Embedding == null) return null;

        double bestSimilarity = 0;
        FaceCluster? bestCluster = null;

        // 检查该用户现有的聚类
        var existingClusters = await dbContext.FaceClusters
            .Where(c => dbContext.Faces.Any(f => f.ClusterId == c.Id && f.Picture.UserId == userId))
            .Include(c => c.Faces.Where(f => f.Picture.UserId == userId).Take(5))
            .ToListAsync();

        foreach (var cluster in existingClusters.Concat(newClusters))
        {
            if (cluster.Faces?.Any() == true)
            {
                foreach (var clusterFace in cluster.Faces)
                {
                    if (clusterFace.Embedding != null)
                    {
                        var similarity = CalculateSimilarity(face.Embedding, clusterFace.Embedding);
                        if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD)
                        {
                            bestSimilarity = similarity;
                            bestCluster = cluster;
                        }
                    }
                }
            }
        }

        return bestCluster;
    }
}