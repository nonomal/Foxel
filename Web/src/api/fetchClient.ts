import { clearAuthData } from './index'; 

// API响应的基础结构
export interface BaseResult<T> {
  success: boolean;
  message: string;
  data?: T;
  code: number;
}

// 分页结果通用结构
export interface PaginatedResult<T> {
  success: boolean;
  message: string;
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  code: number;
}

export const BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5153/api';

export async function fetchApi<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<BaseResult<T>> {
    try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers as Record<string, string>,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${BASE_URL}${url}`, {
            ...options,
            headers,
        });

        if (response.status === 401 && !url.includes('/login')) {
            clearAuthData();
            const { message } = await import('antd');
            message.error('授权过期重新登录');
            window.location.href = `/login`;
            return {
            success: false,
            message: '授权过期重新登录',
            code: 401,
            } as BaseResult<T>;
        }

        if (response.status === 403) {
            const { message } = await import('antd');
            message.error('没有权限');
            return {
            success: false,
            message: '没有权限',
            code: 403,
            } as BaseResult<T>;
        }

        const data = await response.json();
        return data as BaseResult<T>;
    } catch (error) {
        console.error('API请求错误:', error);
        return {
            success: false,
            message: '网络请求失败，请检查您的网络连接',
            code: 500,
        };
    }
}
