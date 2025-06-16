import { fetchApi, type BaseResult } from './fetchClient';

// 人脸聚类响应数据
export interface FaceClusterResponse {
  id: number;
  name: string;
  personName?: string;
  description?: string;
  faceCount: number;
  lastUpdatedAt: Date;
  createdAt: Date;
  thumbnailPath?: string;
}

// 更新聚类请求
export interface UpdateClusterRequest {
  personName?: string;
  description?: string;
}

// 合并聚类请求
export interface MergeClustersRequest {
  sourceClusterId: number;
}

// 人脸聚类统计信息
export interface FaceClusterStatistics {
  totalClusters: number;
  totalFaces: number;
  unclusteredFaces: number;
  namedClusters: number;
  clustersByUser: Record<number, number>;
}

// 获取人脸聚类列表（管理员）
export async function getFaceClusters(
  page: number = 1,
  pageSize: number = 20,
  userId?: number
): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('pageSize', pageSize.toString());
    if (userId) {
      queryParams.append('userId', userId.toString());
    }
    const url = `/management/face/clusters?${queryParams.toString()}`;
    const result = await fetchApi(url);
    return result;
}

// 根据聚类获取图片（管理员）
export async function getPicturesByCluster(
  clusterId: number,
  page: number = 1,
  pageSize: number = 20
): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('pageSize', pageSize.toString());
    const url = `/management/face/clusters/${clusterId}/pictures?${queryParams.toString()}`;
    const result = await fetchApi(url);
    return result;
}

// 更新人脸聚类信息（管理员）
export async function updateCluster(
  clusterId: number,
  data: UpdateClusterRequest
): Promise<BaseResult<FaceClusterResponse>> {
  return fetchApi<FaceClusterResponse>(`/management/face/clusters/${clusterId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// 开始人脸聚类（管理员）
export async function startFaceClustering(userId?: number): Promise<BaseResult<boolean>> {
  const queryParams = userId ? `?userId=${userId}` : '';
  return fetchApi<boolean>(`/management/face/clusters/analyze${queryParams}`, {
    method: 'POST',
  });
}

// 合并聚类（管理员）
export async function mergeClusters(
  targetClusterId: number,
  sourceClusterId: number
): Promise<BaseResult<boolean>> {
  const data: MergeClustersRequest = {
    sourceClusterId,
  };
  return fetchApi<boolean>(`/management/face/clusters/${targetClusterId}/merge`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 删除聚类（管理员）
export async function deleteCluster(clusterId: number): Promise<BaseResult<boolean>> {
  return fetchApi<boolean>(`/management/face/clusters/${clusterId}`, {
    method: 'DELETE',
  });
}

// 从聚类中移除人脸（管理员）
export async function removeFaceFromCluster(faceId: number): Promise<BaseResult<boolean>> {
  return fetchApi<boolean>(`/management/face/faces/${faceId}/cluster`, {
    method: 'DELETE',
  });
}

// 获取人脸聚类统计信息（管理员）
export async function getClusterStatistics(): Promise<BaseResult<FaceClusterStatistics>> {
  return fetchApi<FaceClusterStatistics>('/management/face/statistics');
}

