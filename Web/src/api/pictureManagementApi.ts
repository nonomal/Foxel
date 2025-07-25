import { fetchApi, type BaseResult, type BatchDeleteResult, type PaginatedResult } from './fetchClient';
import { type PictureResponse } from './pictureApi';


// 获取图片列表
export const getManagementPictures = async (
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
  userId?: number
): Promise<PaginatedResult<PictureResponse>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString()
  });
  
  if (searchQuery) params.append('searchQuery', searchQuery);
  if (userId) params.append('userId', userId.toString());
  
  const response = await fetchApi(`/management/picture/get_pictures?${params.toString()}`);
  return response as PaginatedResult<PictureResponse>;
};

// 根据ID获取单张图片
export const getManagementPictureById = async (id: number): Promise<BaseResult<PictureResponse>> => {
  return fetchApi<PictureResponse>(
    `/management/picture/get_picture/${id}`,
    { method: 'GET' }
  );
};

// 删除图片
export const deleteManagementPicture = async (id: number): Promise<BaseResult<boolean>> => {
  return fetchApi<boolean>(
    '/management/picture/delete_picture',
    {
      method: 'POST',
      body: JSON.stringify(id)
    }
  );
};

// 批量删除图片
export const batchDeleteManagementPictures = async (
  ids: number[]
): Promise<BaseResult<BatchDeleteResult>> => {
  return fetchApi<BatchDeleteResult>(
    '/management/picture/batch_delete_pictures',
    {
      method: 'POST',
      body: JSON.stringify(ids)
    }
  );
};

// 根据用户ID获取图片
export const getManagementPicturesByUserId = async (
  userId: number,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResult<PictureResponse>> => {
  const response = await fetchApi(`/management/picture/get_pictures_by_user/${userId}?page=${page}&pageSize=${pageSize}`);
  return response as PaginatedResult<PictureResponse>;
};
