import React from 'react';
import {
  HeartOutlined, HeartFilled, DeleteOutlined, EditOutlined, DownloadOutlined, ShareAltOutlined
} from '@ant-design/icons';
import type { PictureResponse } from '../../../api';

export type ContextMenuAction = 'favorite' | 'delete' | 'edit' | 'download' | 'share';

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  image: PictureResponse | null;
  isOwner: boolean;
  onAction: (action: ContextMenuAction, image: PictureResponse) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  x,
  y,
  image,
  isOwner,
  onAction,
}) => {
  if (!visible || !image) return null;

  const menuStyle = {
    position: 'fixed' as const,
    top: y,
    left: x,
  };

  const handleAction = (action: ContextMenuAction) => {
    if (image) {
      onAction(action, image);
    }
  };

  return (
    <div className="context-menu" style={menuStyle}>
      <div
        className="context-menu-item"
        onClick={() => handleAction('favorite')}
      >
        {image.isFavorited ? (
          <><HeartFilled style={{ color: '#ff4d4f' }} /> 取消收藏</>
        ) : (
          <><HeartOutlined /> 收藏</>
        )}
      </div>

      <div
        className="context-menu-item"
        onClick={() => handleAction('download')}
      >
        <DownloadOutlined /> 下载
      </div>

      {isOwner && (
        <div
          className="context-menu-item"
          onClick={() => handleAction('edit')}
        >
          <EditOutlined /> 编辑
        </div>
      )}

      <div
        className="context-menu-item"
        onClick={() => handleAction('share')}
      >
        <ShareAltOutlined /> 分享
      </div>

      {isOwner && (
        <div
          className="context-menu-item"
          style={{ color: '#ff4d4f' }}
          onClick={() => handleAction('delete')}
        >
          <DeleteOutlined /> 删除
        </div>
      )}
    </div>
  );
};

export default ContextMenu;
