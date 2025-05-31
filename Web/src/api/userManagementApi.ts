import { fetchApi } from './fetchClient';
import {
  type BaseResult,
  type PaginatedResult,
  type UserResponse,
  type CreateUserRequest,
  type AdminUpdateUserRequest,
  type BatchDeleteResult
} from './types';

// 获取用户列表
export const getUsers = async (
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResult<UserResponse>> => {
  const response = await fetchApi(`/management/user/get_users?page=${page}&pageSize=${pageSize}`);
  return response as PaginatedResult<UserResponse>;
};

// 根据ID获取单个用户
export const getUserById = async (id: number): Promise<BaseResult<UserResponse>> => {
  return fetchApi<UserResponse>(
    `/management/user/get_user/${id}`,
    { method: 'GET' }
  );
};

// 创建用户
export const createUser = async (
  userData: CreateUserRequest
): Promise<BaseResult<UserResponse>> => {
  return fetchApi<UserResponse>(
    '/management/user/create_user',
    {
      method: 'POST',
      body: JSON.stringify(userData)
    }
  );
};

// 更新用户
export const updateUser = async (
  userData: AdminUpdateUserRequest
): Promise<BaseResult<UserResponse>> => {
  return fetchApi<UserResponse>(
    '/management/user/update_user',
    {
      method: 'POST',
      body: JSON.stringify(userData)
    }
  );
};

// 删除用户
export const deleteUser = async (id: number): Promise<BaseResult<boolean>> => {
  return fetchApi<boolean>(
    '/management/user/delete_user',
    {
      method: 'POST',
      body: JSON.stringify(id)
    }
  );
};

// 批量删除用户
export const batchDeleteUsers = async (
  ids: number[]
): Promise<BaseResult<BatchDeleteResult>> => {
  return fetchApi<BatchDeleteResult>(
    '/management/user/batch_delete_users',
    {
      method: 'POST',
      body: JSON.stringify(ids)
    }
  );
};
