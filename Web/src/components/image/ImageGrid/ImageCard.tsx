import React from 'react';
import { Typography } from 'antd';
import {
  HeartOutlined, HeartFilled, EditOutlined, DownloadOutlined, ShareAltOutlined,
  GlobalOutlined, TeamOutlined, LockOutlined
} from '@ant-design/icons';
import type { PictureResponse } from '../../../api';

const { Text } = Typography;

const permissionTypeMap: Record<number, { label: string; icon: React.ReactNode; color: string }> = {
  0: { label: '公开', icon: <GlobalOutlined />, color: '#52c41a' },
  1: { label: '好友可见', icon: <TeamOutlined />, color: '#1890ff' },
  2: { label: '私人', icon: <LockOutlined />, color: '#ff4d4f' }
};

const formatDate = (dateString: string | Date | undefined): string => {
  try {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    if (isNaN(date.getTime())) return '-';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('日期格式化错误:', error);
    return '-';
  }
};

const calculateImageMinWidth = (image: PictureResponse): number => {
  const fixedHeight = 200;
  const defaultMinWidth = 180;

  if (image.exifInfo?.width && image.exifInfo?.height) {
    const aspectRatio = image.exifInfo.width / image.exifInfo.height;
    const calculatedWidth = Math.round(fixedHeight * aspectRatio);
    return Math.max(180, Math.min(400, calculatedWidth));
  }
  return defaultMinWidth;
};

interface ImageCardProps {
  image: PictureResponse;
  isSelected: boolean;
  selectable: boolean;
  onClick: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onToggleFavorite: (image: PictureResponse) => void;
  onEdit: (image: PictureResponse) => void;
  onShare: (image: PictureResponse) => void;
  onDownload: (image: PictureResponse) => void;
  isOwner: boolean;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  isSelected,
  selectable,
  onClick,
  onContextMenu,
  onToggleFavorite,
  onEdit,
  onShare,
  onDownload,
  isOwner,
}) => {
  const imageMinWidth = calculateImageMinWidth(image);

  return (
    <div
      className={`custom-card ${isSelected ? 'custom-card-selected' : ''} ${selectable ? 'custom-card-selectable-mode' : ''}`}
      style={{
        minWidth: imageMinWidth,
        flexBasis: imageMinWidth
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div className="custom-card-cover">
        <img
          alt={image.name}
          src={image.thumbnailPath || image.path}
          className="custom-card-thumbnail"
        />

        {!selectable && (
          <>
            <div className="custom-card-indicators">
              <div className="custom-card-left-indicators"> 
                <div className="custom-card-permission" style={{
                  backgroundColor: permissionTypeMap[image.permission]?.color || 'rgba(0, 0, 0, 0.6)'
                }}>
                  {permissionTypeMap[image.permission]?.icon} {permissionTypeMap[image.permission]?.label || '公开'}
                </div>
                {image.storageModeName && (
                  <div className="custom-card-storage-mode">
                    {image.storageModeName}
                  </div>
                )}
              </div>

              <div className="custom-card-metadata">
                {image.exifInfo && image.exifInfo.width && image.exifInfo.height
                  ? `${Math.round(image.exifInfo.width * image.exifInfo.height / 1000000)}MP`
                  : 'N/A'}
                {' | '}
                {formatDate(image.takenAt || image.createdAt)}
              </div>
            </div>

            <div className="custom-card-overlay">
              <div className="custom-card-info">
                <div className="custom-card-title">{image.name}</div>

                {image.tags && image.tags.length > 0 && (
                  <div className="custom-card-tags-container">
                    {image.tags.slice(0, 3).map((tag, tagIndex) => (
                      <Text key={`${image.id}-${tag}-${tagIndex}`} className="image-tag">#{tag}</Text>
                    ))}
                    {image.tags.length > 3 && (
                      <Text className="image-tag">+{image.tags.length - 3}</Text>
                    )}
                  </div>
                )}

                <div className="custom-card-actions">
                  <div
                    className="custom-card-action-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(image);
                    }}
                  >
                    {image.isFavorited ? (
                      <HeartFilled style={{ fontSize: 14, color: '#ff4d4f' }} />
                    ) : (
                      <HeartOutlined style={{ fontSize: 14, color: '#ffffff' }} />
                    )}
                  </div>

                  {isOwner && (
                    <div
                      className="custom-card-action-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(image);
                      }}
                    >
                      <EditOutlined style={{ fontSize: 14, color: '#ffffff' }} />
                    </div>
                  )}

                  <div
                    className="custom-card-action-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(image);
                    }}
                  >
                    <ShareAltOutlined style={{ fontSize: 14, color: '#ffffff' }} />
                  </div>

                  <div
                    className="custom-card-action-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(image);
                    }}
                  >
                    <DownloadOutlined style={{ fontSize: 14, color: '#ffffff' }} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageCard;
