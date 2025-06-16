using Foxel.Models;
using Foxel.Models.Response.Face;
using Foxel.Models.Response.Picture;
using Foxel.Api.Management;

namespace Foxel.Services.Management;

public interface IFaceManagementService
{
    /// <summary>
    /// 获取所有人脸聚类（管理员）
    /// </summary>
    Task<PaginatedResult<FaceClusterResponse>> GetFaceClustersAsync(int page = 1, int pageSize = 20);
    
    /// <summary>
    /// 获取指定用户的人脸聚类
    /// </summary>
    Task<PaginatedResult<FaceClusterResponse>> GetUserFaceClustersAsync(int userId, int page = 1, int pageSize = 20);
    
    /// <summary>
    /// 根据聚类ID获取相关图片（管理员）
    /// </summary>
    Task<PaginatedResult<PictureResponse>> GetPicturesByClusterAsync(int clusterId, int page = 1, int pageSize = 20);
    
    /// <summary>
    /// 根据聚类ID获取指定用户的相关图片
    /// </summary>
    Task<PaginatedResult<PictureResponse>> GetUserPicturesByClusterAsync(int userId, int clusterId, int page = 1, int pageSize = 20);
    
    /// <summary>
    /// 更新聚类信息（管理员）
    /// </summary>
    Task<FaceClusterResponse> UpdateClusterAsync(int clusterId, string? personName, string? description = null);
    
    /// <summary>
    /// 更新用户聚类信息
    /// </summary>
    Task<FaceClusterResponse> UpdateUserClusterAsync(int userId, int clusterId, string? personName, string? description = null);
    
    /// <summary>
    /// 合并两个聚类（管理员）
    /// </summary>
    Task<bool> MergeClustersAsync(int sourceClusterId, int targetClusterId);
    
    /// <summary>
    /// 合并用户的两个聚类
    /// </summary>
    Task<bool> MergeUserClustersAsync(int userId, int sourceClusterId, int targetClusterId);
    
    /// <summary>
    /// 从聚类中移除人脸（管理员）
    /// </summary>
    Task<bool> RemoveFaceFromClusterAsync(int faceId);
    
    /// <summary>
    /// 从用户聚类中移除人脸
    /// </summary>
    Task<bool> RemoveUserFaceFromClusterAsync(int userId, int faceId);
    
    /// <summary>
    /// 删除聚类（管理员）
    /// </summary>
    Task<bool> DeleteClusterAsync(int clusterId);
    
    /// <summary>
    /// 获取聚类统计信息（管理员）
    /// </summary>
    Task<FaceClusterStatistics> GetClusterStatisticsAsync();
}