import { fetchApi, BASE_URL, type PaginatedResult, type BaseResult } from './fetchClient';

// 图片请求参数
export interface FilteredPicturesRequest {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  tags?: string;
  startDate?: string;
  endDate?: string;
  userId?: number;
  sortBy?: string;
  onlyWithGps?: boolean;
  useVectorSearch?: boolean;
  similarityThreshold?: number;
  excludeAlbumId?: number;
  albumId?: number;
  onlyFavorites?: boolean;
  ownerId?: number;
  includeAllPublic?: boolean;
}



// 图片响应数据
export interface PictureResponse {
  id: number;
  name: string;
  path: string;
  thumbnailPath: string;
  description: string;
  takenAt?: Date;
  createdAt: Date;
  exifInfo?: any;
  tags?: string[];
  userId: number;
  username?: string;
  isFavorited: boolean;
  favoriteCount: number;
  permission: number;
  albumId?: number;
  albumName?: string;
  storageModeName:string;
}

// 收藏请求
export interface FavoriteRequest {
  pictureId: number;
}

// 上传队列中的文件项
export interface UploadFile {
  id: string;  // 本地ID，用于跟踪状态
  file: File;  // 原始文件
  status: 'pending' | 'uploading' | 'success' | 'error';  // 上传状态
  percent: number;  // 上传进度百分比 0-100
  error?: string;  // 错误信息
  response?: PictureResponse;  // 上传成功后的响应
}

// 图片格式类型
export type ImageFormat = 0 | 1 | 2 | 3;

// 添加常量对象提供运行时值
export const ImageFormat = {
  Original: 0 as ImageFormat,
  Jpeg: 1 as ImageFormat,
  Png: 2 as ImageFormat,
  WebP: 3 as ImageFormat
};

// 上传图片参数
export interface UploadPictureParams {
  permission?: number;
  albumId?: number;
  storageModeId?: number; // 新增：存储模式ID
  convertToFormat?: ImageFormat;
  quality?: number;
  onProgress?: (percent: number) => void;
}

// 删除多张图片请求
export interface DeleteMultiplePicturesRequest {
  pictureIds: number[];
}

export interface UpdatePictureRequest {
  id: number;
  name?: string;
  description?: string;
  tags?: string[];
  permission?: number;
}

// 获取图片列表
export async function getPictures(params: FilteredPicturesRequest = {}): Promise<PaginatedResult<PictureResponse>> {
  // 构建查询参数
  const queryParams = new URLSearchParams();

  // 添加所有非空参数
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params.searchQuery) queryParams.append('searchQuery', params.searchQuery);
  if (params.tags) queryParams.append('tags', params.tags);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.userId) queryParams.append('userId', params.userId.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.onlyWithGps !== undefined) queryParams.append('onlyWithGps', params.onlyWithGps.toString());
  if (params.useVectorSearch !== undefined) queryParams.append('useVectorSearch', params.useVectorSearch.toString());
  if (params.similarityThreshold) queryParams.append('similarityThreshold', params.similarityThreshold.toString());
  if (params.excludeAlbumId) queryParams.append('excludeAlbumId', params.excludeAlbumId.toString());
  if (params.albumId) queryParams.append('albumId', params.albumId.toString());
  if (params.onlyFavorites !== undefined) queryParams.append('onlyFavorites', params.onlyFavorites.toString());
  if (params.ownerId !== undefined) queryParams.append('ownerId', params.ownerId.toString());
  if (params.includeAllPublic !== undefined) queryParams.append('includeAllPublic', params.includeAllPublic.toString());

  const url = `/picture/get_pictures?${queryParams.toString()}`;
  
  try {
    const result = await fetchApi<PaginatedResult<PictureResponse>>(url);

    if (result.success) {
        return result as unknown as PaginatedResult<PictureResponse>;
    } else {
        console.error('获取图片列表失败:', result.message);
        return {
            success: false,
            message: result.message || '获取图片列表失败',
            data: [],
            page: params.page || 1,
            pageSize: params.pageSize || 10,
            totalCount: 0,
            totalPages: 0,
            code: result.code || 500,
        };
    }
  } catch (error) {
    console.error('获取图片列表时发生意外错误:', error);
    return {
      success: false,
      message: '网络请求失败，请检查您的网络连接',
      data: [],
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      totalCount: 0,
      totalPages: 0,
      code: 500,
    };
  }
}

// 收藏图片
export async function favoritePicture(pictureId: number): Promise<BaseResult<boolean>> {
  return fetchApi<boolean>('/picture/favorite', {
    method: 'POST',
    body: JSON.stringify({ pictureId }),
  });
}

// 取消收藏图片
export async function unfavoritePicture(pictureId: number): Promise<BaseResult<boolean>> {
  return fetchApi<boolean>('/picture/unfavorite', {
    method: 'POST',
    body: JSON.stringify({ pictureId }),
  });
}

// 获取用户收藏的图片
export async function getUserFavorites(page: number = 1, pageSize: number = 8): Promise<PaginatedResult<PictureResponse>> {
  try {
    const url = `/picture/favorites?page=${page}&pageSize=${pageSize}`;
    // 使用 fetchApi 替换原生 fetch
    const result = await fetchApi<PaginatedResult<PictureResponse>>(url);

    if (result.success) {
      return result as unknown as PaginatedResult<PictureResponse>;
    } else {
      console.error('获取收藏图片失败:', result.message);
      return {
        success: false,
        message: result.message || '获取收藏图片失败',
        data: [],
        page: page,
        pageSize: pageSize,
        totalCount: 0,
        totalPages: 0,
        code: result.code || 500,
      };
    }
  } catch (error) {
    console.error('获取收藏图片时发生意外错误:', error);
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

// 上传图片
export async function uploadPicture(
  file: File,
  data: {
    permission?: number;
    albumId?: number;
    storageModeId?: number; // 新增
    onProgress?: (percent: number) => void
  } = {}
): Promise<BaseResult<PictureResponse>> {
  const formData = new FormData();
  formData.append('file', file);

  if (data.permission !== undefined) {
    formData.append('permission', data.permission.toString());
  }

  if (data.albumId !== undefined) {
    formData.append('albumId', data.albumId.toString());
  }

  if (data.storageModeId !== undefined) { // 新增：添加 storageModeId 到 FormData
    formData.append('storageModeId', data.storageModeId.toString());
  }

  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const xhr = new XMLHttpRequest();

    // 返回一个Promise
    return new Promise((resolve, reject) => {
      xhr.open('POST', `${BASE_URL}/picture/upload_picture`);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && data.onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          data.onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } else {
          reject({
            status: xhr.status,
            message: xhr.statusText || '上传失败',
          });
        }
      };

      xhr.onerror = () => {
        reject({
          status: xhr.status,
          message: '网络错误，上传失败',
        });
      };

      xhr.send(formData);
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    return {
      success: false,
      message: '上传图片失败',
      code: 500,
    };
  }
}

// 删除多张图片
export async function deleteMultiplePictures(pictureIds: number[]): Promise<BaseResult<object>> {
  return fetchApi<object>('/picture/delete_pictures', {
    method: 'POST',
    body: JSON.stringify({ pictureIds }),
  });
}

// 更新图片信息
export async function updatePicture(request: UpdatePictureRequest): Promise<BaseResult<PictureResponse>> {
  return fetchApi<PictureResponse>('/picture/update_picture', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

