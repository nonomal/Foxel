import type { AlbumResponse } from './albumApi';
import { fetchApi, type BaseResult, type BatchDeleteResult, type PaginatedResult } from './fetchClient';
import type { PictureResponse } from './pictureApi'; // For pictures within an album


export interface AlbumCreateRequest {
  name: string;
  description?: string;
  coverPictureId?: number | null;
}

export interface AlbumUpdateRequest {
  name?: string;
  description?: string;
  coverPictureId?: number | null;
}

export const getManagementAlbums = async (
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
  userId?: number
): Promise<PaginatedResult<AlbumResponse>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString()
  });
  if (searchQuery) params.append('searchQuery', searchQuery);
  if (userId) params.append('userId', userId.toString());
  
  const response = await fetchApi(`/management/album/get_albums?${params.toString()}`);
  return response as PaginatedResult<AlbumResponse>;
};

// Get album by ID
export const getManagementAlbumById = async (id: number): Promise<BaseResult<AlbumResponse>> => {
  return fetchApi<AlbumResponse>(`/management/album/get_album/${id}`);
};

// Create album
export const createManagementAlbum = async (request: AlbumCreateRequest): Promise<BaseResult<AlbumResponse>> => {
  return fetchApi<AlbumResponse>(
    '/management/album/create_album',
    {
      method: 'POST',
      body: JSON.stringify(request)
    }
  );
};

// Update album
export const updateManagementAlbum = async (id: number, request: AlbumUpdateRequest): Promise<BaseResult<AlbumResponse>> => {
  return fetchApi<AlbumResponse>(
    `/management/album/update_album/${id}`,
    {
      method: 'POST',
      body: JSON.stringify(request)
    }
  );
};

// Delete album
export const deleteManagementAlbum = async (id: number): Promise<BaseResult<boolean>> => {
  return fetchApi<boolean>(
    '/management/album/delete_album',
    {
      method: 'POST',
      body: JSON.stringify(id) // Backend expects int id in body
    }
  );
};

// Batch delete albums
export const batchDeleteManagementAlbums = async (ids: number[]): Promise<BaseResult<BatchDeleteResult>> => {
  return fetchApi<BatchDeleteResult>(
    '/management/album/batch_delete_albums',
    {
      method: 'POST',
      body: JSON.stringify(ids)
    }
  );
};

// Get pictures in album
export const getPicturesInAlbum = async (
  albumId: number,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResult<PictureResponse>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString()
  });
  const response = await fetchApi(`/management/album/${albumId}/pictures?${params.toString()}`);
  return response as PaginatedResult<PictureResponse>;
};
