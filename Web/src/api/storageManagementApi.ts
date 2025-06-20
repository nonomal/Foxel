import { fetchApi, type BaseResult, type BatchDeleteResult, type PaginatedResult } from './fetchClient';

export enum StorageTypeEnum {
    Local = 0,
    Telegram = 1,
    S3 = 2,
    Cos = 3,
    WebDAV = 4,
}
export const StorageTypeLabels: Record<StorageTypeEnum, string> = {
    [StorageTypeEnum.Local]: "本地存储",
    [StorageTypeEnum.Telegram]: "Telegram",
    [StorageTypeEnum.S3]: "S3 对象存储",
    [StorageTypeEnum.Cos]: "腾讯云 COS",
    [StorageTypeEnum.WebDAV]: "WebDAV",
};

export interface StorageModeResponse {
    id: number;
    name: string;
    storageType: StorageTypeEnum;
    storageTypeName: string;
    configurationJson?: string;
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateStorageModeRequest {
    name: string;
    storageType: StorageTypeEnum;
    configurationJson?: string;
    isEnabled: boolean;
}

export interface UpdateStorageModeRequest {
    id: number;
    name: string;
    storageType: StorageTypeEnum;
    configurationJson?: string;
    isEnabled: boolean;
}

export interface StorageTypeResponse {
    value: StorageTypeEnum;
    name: string;
}

export interface StorageModeFilterRequest {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    storageType?: StorageTypeEnum;
    isEnabled?: boolean;
}

// 获取存储模式列表
export const getStorageModes = async (
    filters: StorageModeFilterRequest = {}
): Promise<PaginatedResult<StorageModeResponse>> => {
    const { page = 1, pageSize = 10, searchQuery, storageType, isEnabled } = filters;

    const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
    });

    if (searchQuery) params.append('searchQuery', searchQuery);
    if (storageType !== undefined) params.append('storageType', storageType.toString());
    if (isEnabled !== undefined) params.append('isEnabled', isEnabled.toString());

    const response = await fetchApi(`/management/storage/get_modes?${params.toString()}`);
    return response as PaginatedResult<StorageModeResponse>;
};

// 根据ID获取单个存储模式
export const getStorageModeById = async (id: number): Promise<BaseResult<StorageModeResponse>> => {
    return fetchApi<StorageModeResponse>(
        `/management/storage/get_mode/${id}`,
        { method: 'GET' }
    );
};

// 创建存储模式
export const createStorageMode = async (
    data: CreateStorageModeRequest
): Promise<BaseResult<StorageModeResponse>> => {
    return fetchApi<StorageModeResponse>(
        '/management/storage/create_mode',
        {
            method: 'POST',
            body: JSON.stringify(data)
        }
    );
};

// 更新存储模式
export const updateStorageMode = async (
    data: UpdateStorageModeRequest
): Promise<BaseResult<StorageModeResponse>> => {
    return fetchApi<StorageModeResponse>(
        '/management/storage/update_mode',
        {
            method: 'POST',
            body: JSON.stringify(data)
        }
    );
};

// 删除存储模式
export const deleteStorageMode = async (id: number): Promise<BaseResult<boolean>> => {
    return fetchApi<boolean>(
        '/management/storage/delete_mode',
        {
            method: 'POST',
            body: JSON.stringify(id) // 后端期望body中直接是id
        }
    );
};

// 批量删除存储模式
export const batchDeleteStorageModes = async (
    ids: number[]
): Promise<BaseResult<BatchDeleteResult>> => {
    return fetchApi<BatchDeleteResult>(
        '/management/storage/batch_delete_modes',
        {
            method: 'POST',
            body: JSON.stringify(ids)
        }
    );
};

// 获取所有可用的存储类型
export const getStorageTypes = async (): Promise<BaseResult<StorageTypeResponse[]>> => {
    return fetchApi<StorageTypeResponse[]>(
        '/management/storage/get_storage_types',
        { method: 'GET' }
    );
};

// 获取可用的存储模式 (通常是启用的模式，用于选择)
export const getAvailableStorageModes = async (): Promise<BaseResult<StorageModeResponse[]>> => {
    return fetchApi<StorageModeResponse[]>(
        '/management/storage/get_available_modes',
        { method: 'GET' }
    );
};

// 获取默认存储模式ID
export const getDefaultStorageModeId = async (): Promise<BaseResult<number | null>> => {
    return fetchApi<number | null>(
        '/management/storage/get_default_mode_id',
        { method: 'GET' }
    );
};

// 设置默认存储模式
export const setDefaultStorageMode = async (id: number): Promise<BaseResult<boolean>> => {
    return fetchApi<boolean>(
        `/management/storage/set_default_mode/${id}`,
        { method: 'POST' }
    );
};
