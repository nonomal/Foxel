import { fetchApi, type PaginatedResult, type BaseResult } from './fetchClient';

// 相册响应数据
export interface AlbumResponse {
  id: number;
  name: string;
  description: string;
  pictureCount: number;
  userId: number;
  username?: string;
  createdAt: Date;
  updatedAt: Date;
  coverPictureId?: number | null; 
  coverPicturePath?: string; 
  coverPictureThumbnailPath?: string; 
}

// 创建相册请求
export interface CreateAlbumRequest {
  name: string;
  description: string;
  coverPictureId?: number | null; // 新增：封面图片ID
}

// 更新相册请求
export interface UpdateAlbumRequest {
  id: number;
  name: string;
  description: string;
  coverPictureId?: number | null; // 新增：封面图片ID
}

// 相册图片操作请求
export interface AlbumPictureRequest {
  albumId: number;
  pictureId: number;
}

// 批量添加图片到相册请求
export interface AlbumPicturesRequest {
  albumId: number;
  pictureIds: number[];
}

// 获取相册列表
export async function getAlbums(
  page: number = 1, 
  pageSize: number = 10,
  userId?: number
): Promise<PaginatedResult<AlbumResponse>> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('pageSize', pageSize.toString());
    if (userId) {
      queryParams.append('userId', userId.toString());
    }

    const url = `/album/get_albums?${queryParams.toString()}`;
    const result = await fetchApi<PaginatedResult<AlbumResponse>>(url);
    if (result.success) {
      return result as unknown as PaginatedResult<AlbumResponse>; 
    } else {
      console.error('获取相册列表失败:', result.message);
      return {
        success: false,
        message: result.message || '获取相册列表失败',
        data: [],
        page: page,
        pageSize: pageSize,
        totalCount: 0,
        totalPages: 0,
        code: result.code || 500,
      };
    }
  } catch (error) {
    console.error('获取相册列表时发生意外错误:', error);
    return {
      success: false,
      message: '网络请求失败，请检查您的网络连接',
      data: [],
      page: page,
      pageSize: pageSize,
      totalCount: 0,
      totalPages: 0,
      code: 500,
    };
  }
}

// 获取单个相册详情
export async function getAlbumById(id: number): Promise<BaseResult<AlbumResponse>> {
  return fetchApi<AlbumResponse>(`/album/get_album/${id}`);
}

// 创建相册
export async function createAlbum(data: CreateAlbumRequest): Promise<BaseResult<AlbumResponse>> {
  return fetchApi<AlbumResponse>('/album/create_album', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 更新相册
export async function updateAlbum(data: UpdateAlbumRequest): Promise<BaseResult<AlbumResponse>> {
  return fetchApi<AlbumResponse>('/album/update_album', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 删除相册
export async function deleteAlbum(id: number): Promise<BaseResult<boolean>> {
  return fetchApi<boolean>('/album/delete_album', {
    method: 'POST',
    body: JSON.stringify(id),
  });
}

// 添加多张图片到相册
export async function addPicturesToAlbum(albumId: number, pictureIds: number[]): Promise<BaseResult<boolean>> {
  const data: AlbumPicturesRequest = {
    albumId,
    pictureIds,
  };
  return fetchApi<boolean>('/album/add_pictures', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 添加图片到相册
export async function addPictureToAlbum(albumId: number, pictureId: number): Promise<BaseResult<boolean>> {
  const data: AlbumPictureRequest = {
    albumId,
    pictureId,
  };
  return fetchApi<boolean>('/album/add_picture', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 从相册移除图片
export async function removePictureFromAlbum(albumId: number, pictureId: number): Promise<BaseResult<boolean>> {
  const data: AlbumPictureRequest = {
    albumId,
    pictureId,
  };
  return fetchApi<boolean>('/album/remove_picture', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
