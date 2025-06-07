import { fetchApi, type BaseResult } from './fetchClient';
import type { ProcessingStatus } from './pictureApi';

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

/**
 * 获取当前用户的所有处理任务
 */
export const getUserTasks = async (): Promise<BaseResult<PictureProcessingTask[]>> => {
  return fetchApi<PictureProcessingTask[]>('/background-tasks/user-tasks');
};

/**
 * 获取特定图片的处理状态
 * @param pictureId 图片ID
 */
export const getPictureProcessingStatus = async (pictureId: number): Promise<BaseResult<PictureProcessingTask>> => {
  return fetchApi<PictureProcessingTask>(`/background-tasks/picture-status/${pictureId}`);
};
