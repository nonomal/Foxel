import { fetchApi, type BaseResult } from './fetchClient';
import { UserRole } from './userManagementApi';


// 配置响应数据
export interface ConfigResponse {
  id: number;
  key: string;
  value: string;
  description: string;
  isSecret: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SetConfigRequest {
  key: string;
  value: string;
  description?: string;
}

// 获取所有配置
export const getAllConfigs = async (): Promise<BaseResult<ConfigResponse[]>> => {
  try {
    return await fetchApi<ConfigResponse[]>('/config/get_configs');
  } catch (error: any) {
    return {
      success: false,
      message: `获取配置失败: ${error.message}`,
      code: 500
    };
  }
};

// 获取单个配置
export const getConfig = async (key: string): Promise<BaseResult<ConfigResponse>> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('key', key);
    
    return await fetchApi<ConfigResponse>(`/config/get_config?${queryParams.toString()}`);
  } catch (error: any) {
    return {
      success: false,
      message: `获取配置失败: ${error.message}`,
      code: 500
    };
  }
};

// 设置配置
export const setConfig = async (config: SetConfigRequest): Promise<BaseResult<ConfigResponse>> => {
  try {
    return await fetchApi<ConfigResponse>('/config/set_config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  } catch (error: any) {
    return {
      success: false,
      message: `设置配置失败: ${error.message}`,
      code: 500
    };
  }
};

// 删除配置
export const deleteConfig = async (key: string): Promise<BaseResult<boolean>> => {
  try {
    return await fetchApi<boolean>('/config/delete_config', {
      method: 'POST',
      body: JSON.stringify(key),
    });
  } catch (error: any) {
    return {
      success: false,
      message: `删除配置失败: ${error.message}`,
      code: 500
    };
  }
};

// 角色权限检查
export const hasRole = (userRole: string | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  
  // 如果是管理员，拥有所有权限
  if (userRole === UserRole.Administrator) return true;
  
  // 精确匹配角色
  return userRole === requiredRole;
};

// 备份所有配置
export const backupConfigs = async (): Promise<BaseResult<Record<string, string>>> => {
  try {
    return await fetchApi<Record<string, string>>('/config/backup');
  } catch (error: any) {
    return {
      success: false,
      message: `备份配置失败: ${error.message}`,
      code: 500
    };
  }
};

// 恢复配置
export const restoreConfigs = async (configBackup: Record<string, string>): Promise<BaseResult<boolean>> => {
  try {
    return await fetchApi<boolean>('/config/restore', {
      method: 'POST',
      body: JSON.stringify(configBackup),
    });
  } catch (error: any) {
    return {
      success: false,
      message: `恢复配置失败: ${error.message}`,
      code: 500
    };
  }
};
