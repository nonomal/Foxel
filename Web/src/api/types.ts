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
  roleName: string;
}

// 认证响应
export interface AuthResponse {
  token: string;
  user: UserProfile;
}

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
  processingStatus: ProcessingStatus;
  processingError?: string;
  processingProgress: number;
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
  convertToFormat?: ImageFormat;
  quality?: number;
  onProgress?: (percent: number) => void;
}

// 相册响应数据
export interface AlbumResponse {
  id: number;
  name: string;
  description: string;
  coverImageUrl?: string;
  pictureCount: number;
  userId: number;
  username?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 创建相册请求
export interface CreateAlbumRequest {
  name: string;
  description: string;
}

// 更新相册请求
export interface UpdateAlbumRequest {
  id: number;
  name: string;
  description: string;
}

// 相册图片操作请求
export interface AlbumPictureRequest {
  albumId: number;
  pictureId: number;
}

// 批量添加图片到相册请求
export interface AlbumPicturesRequest {
  albumId: number;
  pictureIds: number[];
}

// 删除多张图片请求
export interface DeleteMultiplePicturesRequest {
  pictureIds: number[];
}

// 将类型定义改为枚举，这样既可以作为类型也可以作为值使用
export type ProcessingStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

// 添加常量对象提供运行时值
export const ProcessingStatus = {
  Pending: 'Pending' as ProcessingStatus,
  Processing: 'Processing' as ProcessingStatus,
  Completed: 'Completed' as ProcessingStatus,
  Failed: 'Failed' as ProcessingStatus
};

// 图片处理任务
export interface PictureProcessingTask {
  pictureId: number;
  taskId: string;
  pictureName: string;
  status: ProcessingStatus;
  progress: number; // 0-100
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

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

export type UserRole = "Administrator" | "User" | "";

export const UserRole = {
  Administrator: "Administrator" as UserRole,
  User: "User" as UserRole,
  Guest: "" as UserRole
};

export interface UpdateUserRequest {
  userName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UpdatePictureRequest {
  id: number;
  name?: string;
  description?: string;
  tags?: string[];
}

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

export type VectorDbType = "InMemory" | "Qdrant";

export const VectorDbType = {
  InMemory: "InMemory" as VectorDbType,
  Qdrant: "Qdrant" as VectorDbType,
};

export interface VectorDbInfo {
  type: string;
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
