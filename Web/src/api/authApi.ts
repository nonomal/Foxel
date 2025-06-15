import {fetchApi, BASE_URL, type BaseResult} from './fetchClient';
import { type UserRole } from './userManagementApi';

// 认证数据本地存储键
const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const COOKIE_TOKEN_KEY = 'token';

// 登录请求参数
export interface LoginRequest {
  email: string;
  password: string;
}

// 注册请求参数
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// 用户信息
export interface UserProfile {
  id: number;
  userName: string;
  email: string;
  roleName: UserRole | string; // roleName can be UserRole or a string from server
}

// 认证响应
export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface UpdateUserRequest {
  userName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export type BindType = 0 | 1;

export const BindType = {
  GitHub: 0 as BindType,
  LinuxDo: 1 as BindType,
};

export interface BindAccountRequest {
  email: string;
  password: string;
  bindType: BindType;
  thirdPartyUserId: string;
}

// Cookie操作辅助函数
const setCookie = (name: string, value: string, days: number = 7): void => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};

const deleteCookie = (name: string): void => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;SameSite=Lax`;
};

// 用户注册
export async function register(data: RegisterRequest): Promise<BaseResult<AuthResponse>> {
    return fetchApi<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// 用户登录
export async function login(data: LoginRequest): Promise<BaseResult<AuthResponse>> {
    const response = await fetchApi<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
    });

    if (response.success && response.data) {
        clearAuthData(); // 清除旧的认证数据
        console.log('登录成功，保存认证数据:', response.data);
        saveAuthData(response.data); // 保存新的认证数据
    }

    return response;
}

// 获取当前登录用户
export async function getCurrentUser(): Promise<BaseResult<UserProfile>> {
    try {
        const token = getToken();

        if (!token) {
            return {
                success: false,
                message: '用户未登录',
                code: 401
            };
        }

        const response = await fetchApi<UserProfile>('/auth/get_current_user');

        // 如果成功获取到用户数据，更新本地存储
        if (response.success && response.data) {
            localStorage.setItem(USER_KEY, JSON.stringify(response.data));
        }

        return response;
    } catch (error: any) {
        return {
            success: false,
            message: `获取用户信息失败: ${error.message}`,
            code: 500
        };
    }
}

// 更新用户信息
export async function updateUserInfo(data: UpdateUserRequest): Promise<BaseResult<UserProfile>> {
    try {
        const response = await fetchApi<UserProfile>('/auth/update', {
            method: 'PUT',
            body: JSON.stringify(data),
        });

        // 如果成功更新用户数据，更新本地存储
        if (response.success && response.data) {
            const user = getStoredUser();
            if (user) {
                const updatedUser = {
                    ...user,
                    ...response.data
                };
                localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
            }
        }

        return response;
    } catch (error: any) {
        return {
            success: false,
            message: `更新用户信息失败: ${error.message}`,
            code: 500
        };
    }
}

// 绑定账户
export async function bindAccount(data: BindAccountRequest): Promise<BaseResult<AuthResponse>> {
    const response = await fetchApi<AuthResponse>('/auth/bind', {
        method: 'POST',
        body: JSON.stringify(data),
    });

    if (response.success && response.data) {
        clearAuthData(); // 清除旧的认证数据
        console.log('绑定成功，保存认证数据:', response.data);
        saveAuthData(response.data); // 保存新的认证数据
    }

    return response;
}

// 保存认证数据到本地存储
export const saveAuthData = (authData: AuthResponse): void => {
    localStorage.setItem(TOKEN_KEY, authData.token);
    setCookie(COOKIE_TOKEN_KEY, authData.token, 7); // 保存7天
    if (authData.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
    }
};

// 清除认证数据
export const clearAuthData = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    deleteCookie(COOKIE_TOKEN_KEY);
};

// 检查是否已认证
export const isAuthenticated = (): boolean => {
    return !!getToken();
};

// 获取存储的用户信息
export const getStoredUser = (): UserProfile | null => {
    try {
        const userJson = localStorage.getItem(USER_KEY);
        if (!userJson) return null;

        return JSON.parse(userJson) as UserProfile;
    } catch (error) {
        return null;
    }
};

// 获取存储的令牌
export const getToken = (): string | null => {
    // 优先从localStorage获取
    const localToken = localStorage.getItem(TOKEN_KEY);
    if (localToken) return localToken;
    
    // 备用从cookies获取
    return getCookie(COOKIE_TOKEN_KEY);
};

// 处理GitHub OAuth回调，接收token并保存
export async function handleOAuthCallback(): Promise<boolean> {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (error) return false;

    if (token) {
        try {
            // 保存临时token，用于API调用
            localStorage.setItem(TOKEN_KEY, token);
            
            // 获取完整的用户信息
            const userResponse = await getCurrentUser();
            
            if (userResponse.success && userResponse.data) {
                // 构造完整的认证响应并保存
                const authResponse: AuthResponse = {
                    token: token,
                    user: userResponse.data
                };
                
                saveAuthData(authResponse);
                
                const url = new URL(window.location.href);
                url.searchParams.delete('token');
                window.history.replaceState({}, document.title, url.toString());
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('第三方登录处理失败:', error);
            clearAuthData(); 
            return false;
        }
    }

    return false;
}

export function getGitHubLoginUrl(): string {
    return `${BASE_URL}/auth/github/login`;
}

export function getLinuxDoLoginUrl(): string {
    return `${BASE_URL}/auth/linuxdo/login`;
}