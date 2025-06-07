import { fetchApi, type BaseResult, type PaginatedResult } from './fetchClient';

export type UserRole = "Administrator" | "User" | "";

export const UserRole = {
  Administrator: "Administrator" as UserRole,
  User: "User" as UserRole,
  Guest: "" as UserRole
};

// 用户管理相关类型
export interface UserResponse {
  id: number;
  userName: string;
  email: string;
  role: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

// 管理员创建用户请求
export interface CreateUserRequest {
  userName: string;
  email: string;
  password: string;
  role: string;
}

// 管理员更新用户请求
export interface AdminUpdateUserRequest {
  id: number;
  userName?: string;
  email?: string;
  role?: string;
}

// 批量删除结果
export interface BatchDeleteResult {
  successCount: number;
  failedCount: number;
  failedIds?: number[];
}

// 用户筛选请求参数
export interface UserFilterRequest {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
}

// 用户统计信息
export interface UserStatistics {
  totalPictures: number;
  totalAlbums: number;
  totalFavorites: number;
  favoriteReceivedCount: number;
  diskUsageMB: number;
  accountAgeDays: number;
}

// 用户详情响应
export interface UserDetailResponse {
  id: number;
  userName: string;
  email: string;
  role: string;
  createdAt: Date;
  statistics: UserStatistics;
}

// 获取用户列表
export const getUsers = async (
  filters: UserFilterRequest = {}
): Promise<PaginatedResult<UserResponse>> => {
  const { page = 1, pageSize = 10, searchQuery, role, startDate, endDate } = filters;
  
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  
  if (searchQuery) params.append('searchQuery', searchQuery);
  if (role) params.append('role', role);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await fetchApi(`/management/user/get_users?${params.toString()}`);
  return response as PaginatedResult<UserResponse>;
};

// 根据ID获取单个用户
export const getUserById = async (id: number): Promise<BaseResult<UserResponse>> => {
  return fetchApi<UserResponse>(
    `/management/user/get_user/${id}`,
    { method: 'GET' }
  );
};

// 根据ID获取用户详情
export const getUserDetail = async (id: number): Promise<BaseResult<UserDetailResponse>> => {
  return fetchApi<UserDetailResponse>(
    `/management/user/get_user_detail/${id}`,
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
