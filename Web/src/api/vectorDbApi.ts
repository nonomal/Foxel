import { fetchApi, type BaseResult } from './fetchClient';

export type VectorDbType = "InMemory" | "Qdrant";

export const VectorDbType = {
  InMemory: "InMemory" as VectorDbType,
  Qdrant: "Qdrant" as VectorDbType,
};

export interface VectorDbInfo {
  type: string;
}

// 获取当前向量数据库类型
export const getCurrentVectorDb = async (): Promise<BaseResult<VectorDbInfo>> => {
  try {
    return await fetchApi<VectorDbInfo>('/management/system/vector-db/current');
  } catch (error: any) {
    return {
      success: false,
      message: `获取当前向量数据库失败: ${error.message}`,
      code: 500
    };
  }
};

// 切换向量数据库类型
export const switchVectorDb = async (type: VectorDbType): Promise<BaseResult<boolean>> => {
  try {
    return await fetchApi<boolean>('/management/system/vector-db/switch', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  } catch (error: any) {
    return {
      success: false,
      message: `切换向量数据库失败: ${error.message}`,
      code: 500
    };
  }
};

// 清空向量数据库
export const clearVectors = async (): Promise<BaseResult<boolean>> => {
  try {
    return await fetchApi<boolean>('/management/system/vector-db/clear', {
      method: 'DELETE'
    });
  } catch (error: any) {
    return {
      success: false,
      message: `清空向量数据库失败: ${error.message}`,
      code: 500
    };
  }
};

// 重建向量数据库
export const rebuildVectors = async (): Promise<BaseResult<boolean>> => {
  try {
    return await fetchApi<boolean>('/management/system/vector-db/rebuild', {
      method: 'POST'
    });
  } catch (error: any) {
    return {
      success: false,
      message: `重建向量数据库失败: ${error.message}`,
      code: 500
    };
  }
};
