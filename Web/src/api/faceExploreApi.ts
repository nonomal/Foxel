import { fetchApi, type BaseResult } from './fetchClient';
import type { FaceClusterResponse, UpdateClusterRequest } from './faceManagementApi';

// 获取当前用户的人脸聚类列表
export async function getMyFaceClusters(
  page: number = 1,
  pageSize: number = 20
): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('pageSize', pageSize.toString());
  const url = `/face/clusters?${queryParams.toString()}`;
  const result = await fetchApi(url);
  return result;
}

// 根据聚类获取当前用户的图片
export async function getMyPicturesByCluster(
  clusterId: number,
  page: number = 1,
  pageSize: number = 20
): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('pageSize', pageSize.toString());
  const url = `/face/clusters/${clusterId}/pictures?${queryParams.toString()}`;
  const result = await fetchApi(url);
  return result;
}

// 更新当前用户的人脸聚类信息
export async function updateMyCluster(
  clusterId: number,
  data: UpdateClusterRequest
): Promise<BaseResult<FaceClusterResponse>> {
  return fetchApi<FaceClusterResponse>(`/face/clusters/${clusterId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// 开始当前用户的人脸聚类
export async function startMyFaceClustering(): Promise<BaseResult<boolean>> {
  return fetchApi<boolean>('/face/clusters/analyze', {
    method: 'POST',
  });
}

// 合并当前用户的聚类
export async function mergeMyUserClusters(
  targetClusterId: number,
  sourceClusterId: number
): Promise<BaseResult<boolean>> {
  const data = { sourceClusterId };
  return fetchApi<boolean>(`/face/clusters/${targetClusterId}/merge`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 从聚类中移除人脸
export async function removeFaceFromCluster(faceId: number): Promise<BaseResult<boolean>> {
  return fetchApi<boolean>(`/face/faces/${faceId}/cluster`, {
    method: 'DELETE',
  });
}
