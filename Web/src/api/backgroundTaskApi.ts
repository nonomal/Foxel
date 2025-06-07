import { fetchApi, type BaseResult } from './fetchClient';

// 通用任务视图模型
export interface TaskDetailsViewModel {
  taskId: string;
  taskName: string; // 任务的描述性名称
  taskType: number; // 任务类型 (例如 0 for "PictureProcessing")
  status: TaskExecutionStatus; // 修改: 类型将是数字枚举
  progress: number; // 0-100
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  relatedEntityId?: number; 
}
// 修改: TaskExecutionStatus 定义为数字枚举
export enum TaskExecutionStatus {
  Pending = 0,    // 等待处理
  Processing = 1, // 处理中
  Completed = 2,  // 处理完成
  Failed = 3      // 处理失败
}

/**
 * 获取当前用户的所有处理任务
 */
export const getUserTasks = async (): Promise<BaseResult<TaskDetailsViewModel[]>> => {
  return fetchApi<TaskDetailsViewModel[]>('/background-tasks/user-tasks');
};

/**
 * 获取特定图片的处理状态 (实际获取的是与该图片关联的任务状态)
 * @param pictureId 图片ID
 */
export const getPictureTaskExecutionStatus = async (pictureId: number): Promise<BaseResult<TaskDetailsViewModel>> => {
  return fetchApi<TaskDetailsViewModel>(`/background-tasks/picture-status/${pictureId}`);
};
