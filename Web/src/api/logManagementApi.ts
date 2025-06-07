import { fetchApi, type BaseResult, type PaginatedResult } from './fetchClient';
import { type BatchDeleteResult } from './userManagementApi';


// 日志级别枚举
export type LogLevel = 'Trace' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Critical';

export const LogLevel = {
  Trace: 'Trace' as LogLevel,
  Debug: 'Debug' as LogLevel,
  Information: 'Information' as LogLevel,
  Warning: 'Warning' as LogLevel,
  Error: 'Error' as LogLevel,
  Critical: 'Critical' as LogLevel
};

// 日志响应数据
export interface LogResponse {
  id: number;
  level: LogLevel | number; // 支持数字和字符串两种形式
  message: string;
  category: string;
  eventId?: number;
  timestamp: Date;
  exception?: string;
  requestPath?: string;
  requestMethod?: string;
  statusCode?: number;
  ipAddress?: string;
  userId?: string;
  properties?: string;
}

// 日志筛选请求参数
export interface LogFilterRequest {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  level?: LogLevel | number; // 支持数字和字符串两种形式
  startDate?: string;
  endDate?: string;
}

// 清空日志请求
export interface ClearLogsRequest {
  clearAll?: boolean;
  beforeDate?: Date;
}

// 日志统计信息
export interface LogStatistics {
  totalCount: number;
  todayCount: number;
  errorCount: number;
  warningCount: number;
}


// 获取日志列表
export const getLogs = async (
  filters: LogFilterRequest = {}
): Promise<PaginatedResult<LogResponse>> => {
  const { page = 1, pageSize = 10, searchQuery, level, startDate, endDate } = filters;
  
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  
  if (searchQuery) params.append('searchQuery', searchQuery);
  if (level) params.append('level', level.toString());
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await fetchApi(`/management/log/get_logs?${params.toString()}`);
  return response as PaginatedResult<LogResponse>;
};

// 根据ID获取单个日志
export const getLogById = async (id: number): Promise<BaseResult<LogResponse>> => {
  return fetchApi<LogResponse>(
    `/management/log/get_log/${id}`,
    { method: 'GET' }
  );
};

// 删除日志
export const deleteLog = async (id: number): Promise<BaseResult<boolean>> => {
  return fetchApi<boolean>(
    '/management/log/delete_log',
    {
      method: 'POST',
      body: JSON.stringify(id)
    }
  );
};

// 批量删除日志
export const batchDeleteLogs = async (
  ids: number[]
): Promise<BaseResult<BatchDeleteResult>> => {
  return fetchApi<BatchDeleteResult>(
    '/management/log/batch_delete_logs',
    {
      method: 'POST',
      body: JSON.stringify(ids)
    }
  );
};

// 清空日志
export const clearLogs = async (
  request: ClearLogsRequest
): Promise<BaseResult<number>> => {
  return fetchApi<number>(
    '/management/log/clear_logs',
    {
      method: 'POST',
      body: JSON.stringify(request)
    }
  );
};

// 获取日志统计信息
export const getLogStatistics = async (): Promise<BaseResult<LogStatistics>> => {
  return fetchApi<LogStatistics>(
    '/management/log/get_statistics',
    { method: 'GET' }
  );
};
