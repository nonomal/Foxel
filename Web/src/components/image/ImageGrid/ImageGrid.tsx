import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Empty, message, Pagination, Modal } from 'antd';
import type { PictureResponse } from '../../../api';
import { favoritePicture, unfavoritePicture, getPictures, deleteMultiplePictures } from '../../../api';
import ImageViewer from '../ImageViewer';
import ShareImageDialog from '../ShareImageDialog';
import EditImageDialog from '../EditImageDialog';
import './ImageGrid.css';
import { useAuth } from '../../../auth/AuthContext';
import ImageCard from './ImageCard';
import ContextMenu, { type ContextMenuAction } from './ContextMenu';

interface PaginationParams {
  page: number;
  pageSize: number;
  albumId?: number;
  excludeAlbumId?: number;
  onlyFavorites?: boolean;
  tags?: string;
  searchQuery?: string;
  sortBy?: string;
  includeAllPublic?: boolean;
  useVectorSearch?: boolean;
  similarityThreshold?: number;
}

// 右键菜单类型接口 - This specific state structure is for ImageGrid
interface ContextMenuComponentState {
  visible: boolean;
  x: number;
  y: number;
  image: PictureResponse | null; // Store the whole image object
}

// 简化Props接口，使用默认值
interface ImageGridProps {
  // 核心功能属性
  onToggleFavorite?: (image: PictureResponse) => void;
  showFavoriteCount?: boolean;
  emptyText?: string;
  showPagination?: boolean;

  // 数据源属性集合
  dataSource?: PictureResponse[];
  totalImages?: number;
  loading?: boolean;

  // 查询相关参数
  queryParams?: {
    albumId?: number;
    excludeAlbumId?: number;
    onlyFavorites?: boolean;
    tags?: string[];
    searchQuery?: string;
    sortBy?: string;
    includeAllPublic?: boolean;
    useVectorSearch?: boolean;
    similarityThreshold?: number;
    _searchId?: number; // 添加搜索ID属性
  };

  // 分页相关属性
  pageSize?: number;
  defaultPage?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  onImagesLoaded?: (images: PictureResponse[], totalCount: number) => void;

  // 选择模式相关属性
  selectedIds?: number[];
  selectable?: boolean;
  onSelectionChange?: (selectedIds: number[]) => void;

  // 操作回调
  onDelete?: (image: PictureResponse) => void;
  onEdit?: (image: PictureResponse) => void;
  onDownload?: (image: PictureResponse) => void;
  onShare?: (image: PictureResponse) => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({
  onToggleFavorite,
  showFavoriteCount = false,
  emptyText = "暂无图片",
  showPagination = true,

  dataSource,
  totalImages: externalTotalImages,
  loading: externalLoading,

  queryParams = {},

  pageSize: externalPageSize = 20,
  defaultPage = 1,
  onPageChange,
  onImagesLoaded,

  selectedIds = [],
  selectable = false,
  onSelectionChange,

  onDelete,
  onEdit,
  onDownload,
}) => {
  const { user, hasRole } = useAuth();

  const [images, setImages] = useState<PictureResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(defaultPage);
  const [pageSize, setPageSize] = useState(externalPageSize);
  const [totalImages, setTotalImages] = useState(0);
  const [viewerState, setViewerState] = useState({ visible: false, index: 0 });
  const [shareDialogState, setShareDialogState] = useState<{
    visible: boolean;
    image: PictureResponse | null;
  }>({
    visible: false,
    image: null
  });

  const [contextMenuState, setContextMenuState] = useState<ContextMenuComponentState>({
    visible: false,
    x: 0,
    y: 0,
    image: null,
  });

  const [editDialogState, setEditDialogState] = useState<{
    visible: boolean;
    image: PictureResponse | null;
  }>({
    visible: false,
    image: null
  });

  const isUsingExternalData = !!dataSource;
  const isLoading = isUsingExternalData ? externalLoading : loading;

  const requestState = useRef({
    inProgress: false,
    lastParams: '',
    noResultsFor: ''
  });

  const favoriteOperationsInProgress = useRef<Map<number, boolean>>(new Map());

  const buildQueryParams = useCallback((): PaginationParams => ({
    page: currentPage,
    pageSize,
    ...queryParams,
    searchQuery: queryParams.searchQuery,
    tags: Array.isArray(queryParams.tags) ? queryParams.tags.join(',') : undefined,
    useVectorSearch: queryParams.useVectorSearch,
    similarityThreshold: queryParams.similarityThreshold
  }), [currentPage, pageSize, queryParams]);

  const loadImages = useCallback(async () => {
    if (isUsingExternalData || requestState.current.inProgress) return;

    const params = buildQueryParams();
    const paramsString = JSON.stringify(params);

    if (requestState.current.noResultsFor === paramsString && images.length === 0) {
      return;
    }

    if (requestState.current.noResultsFor === paramsString) {
      requestState.current.noResultsFor = '';
    }

    if (requestState.current.lastParams === paramsString) {
      return;
    }

    requestState.current = {
      inProgress: true,
      lastParams: paramsString,
      noResultsFor: requestState.current.noResultsFor
    };

    setLoading(true);

    try {
      const result = await getPictures(params);

      requestState.current.lastParams = paramsString;

      if (result.success) {
        setImages(result.data || []);
        setTotalImages(result.totalCount || 0);
        onImagesLoaded?.(result.data || [], result.totalCount || 0);

        if (!result.data || result.data.length === 0) {
          requestState.current.noResultsFor = paramsString;
        }
      } else {
        message.error(result.message || '获取图片失败');
        requestState.current.noResultsFor = paramsString;
      }
    } catch (error) {
      message.error('加载图片列表出错');
      requestState.current.noResultsFor = paramsString;
    } finally {
      setLoading(false);
      requestState.current.inProgress = false;
    }
  }, [buildQueryParams, isUsingExternalData, onImagesLoaded, images.length]);

  useEffect(() => {
    if (!isUsingExternalData) loadImages();
  }, [loadImages, isUsingExternalData]);

  useEffect(() => {
    if (isUsingExternalData && dataSource) setImages(dataSource);
  }, [dataSource, isUsingExternalData]);

  // 防止重复收藏操作
  const handleToggleFavoriteInternal = async (image: PictureResponse) => {
    const { id, isFavorited } = image;

    if (favoriteOperationsInProgress.current.get(id)) {
      return;
    }

    try {
      favoriteOperationsInProgress.current.set(id, true);

      const api = isFavorited ? unfavoritePicture : favoritePicture;
      const result = await api(id);

      if (result.success) {
        message.success(isFavorited ? '已取消收藏' : '已添加到收藏');

        setImages(prevImages =>
          prevImages.map(img =>
            img.id === id ? {
              ...img,
              isFavorited: !isFavorited,
              favoriteCount: isFavorited
                ? Math.max(0, (img.favoriteCount || 0) - 1)
                : (img.favoriteCount || 0) + 1
            } : img
          )
        );

        onToggleFavorite?.(image);
      } else {
        message.error(result.message || (isFavorited ? '取消收藏失败' : '收藏失败'));
      }
    } catch (error) {
      message.error('操作失败，请重试');
    } finally {
      setTimeout(() => {
        favoriteOperationsInProgress.current.delete(id);
      }, 300);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    if (size !== pageSize) setPageSize(size);
    onPageChange?.(page, size);
  };

  const handleImageClick = (image: PictureResponse, index: number) => {
    if (selectable && onSelectionChange) {
      const isSelected = selectedIds.includes(image.id);
      const newSelectedIds = isSelected
        ? selectedIds.filter(id => id !== image.id)
        : [...selectedIds, image.id];
      onSelectionChange(newSelectedIds);
    } else {
      setViewerState({ visible: true, index });
    }
  };

  const handleCardContextMenu = (e: React.MouseEvent, image: PictureResponse) => {
    e.preventDefault();
    setContextMenuState({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      image: image,
    });
  };

  const closeContextMenu = () => {
    setContextMenuState(prev => ({
      ...prev,
      visible: false,
      image: null,
    }));
  };

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (contextMenuState.visible && !target.closest('.context-menu')) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [contextMenuState.visible]);

  const handleShareImage = (image: PictureResponse) => {
    setShareDialogState({
      visible: true,
      image
    });
  };

  const handleDownloadImageInternal = (image: PictureResponse) => {
    if (onDownload) {
      onDownload(image);
      return;
    }
    const link = document.createElement('a');
    link.href = image.path;
    link.download = image.name || `image_${image.id}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseShareDialog = () => {
    setShareDialogState({
      ...shareDialogState,
      visible: false
    });
  };

  const handleEditImageInternal = (image: PictureResponse) => {
    if (onEdit) {
      onEdit(image);
      return;
    }
    setEditDialogState({
      visible: true,
      image
    });
  };

  const handleCloseEditDialog = () => {
    setEditDialogState({
      ...editDialogState,
      visible: false
    });
  };

  const handleImageUpdateSuccess = (updatedImage: PictureResponse) => {
    setImages(prevImages =>
      prevImages.map(img => {
        if (img.id === updatedImage.id) {
          return {
            ...img,
            ...updatedImage,
            userId: img.userId,
            permission: updatedImage.permission ?? img.permission
          };
        }
        return img;
      })
    );
    closeContextMenu();
  };

  const handleDeleteImage = async (image: PictureResponse) => {
    if (onDelete) {
      onDelete(image);
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除图片 "${image.name}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await deleteMultiplePictures([image.id]);

          if (result.success) {
            message.success('图片已成功删除');

            setImages(prevImages =>
              prevImages.filter(img => img.id !== image.id)
            );

            if (images.length === 1 && currentPage > 1) {
              setCurrentPage(currentPage - 1);
            }
          } else {
            message.error(result.message || '删除图片失败');
          }
        } catch (error) {
          message.error('删除图片失败，请重试');
        }
      },
    });
  };

  const handleContextMenuAction = (action: ContextMenuAction, image: PictureResponse) => {
    if (!image) return;

    switch (action) {
      case 'favorite':
        handleToggleFavoriteInternal(image);
        break;
      case 'delete':
        handleDeleteImage(image);
        break;
      case 'edit':
        handleEditImageInternal(image);
        break;
      case 'download':
        handleDownloadImageInternal(image);
        break;
      case 'share':
        handleShareImage(image);
        break;
      default:
        break;
    }

    closeContextMenu();
  };

  const canEditImage = (image: PictureResponse): boolean => {
    if (user && hasRole('Administrator')) {
      return true;
    }
    return !!user && !!image.userId && user.id === image.userId;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="image-grid">
          {Array.from({ length: pageSize }).map((_, index) => (
            <div
              key={`loading-${index}`}
              className="custom-card image-loading-effect"
              style={{ minWidth: 180 }}
            >
              <div className="custom-card-cover" style={{ background: '#f5f5f5' }}>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (images.length === 0) {
      return (
        <Empty
          description={emptyText}
          style={{ margin: '80px 0' }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div className="image-grid">
        {images.map((image, index) => (
          <ImageCard
            key={image.id}
            image={image}
            isSelected={selectedIds.includes(image.id)}
            selectable={selectable}
            onClick={() => handleImageClick(image, index)}
            onContextMenu={(e) => handleCardContextMenu(e, image)}
            onToggleFavorite={handleToggleFavoriteInternal}
            onEdit={handleEditImageInternal}
            onShare={handleShareImage}
            onDownload={handleDownloadImageInternal}
            isOwner={canEditImage(image)}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      <ContextMenu
        visible={contextMenuState.visible}
        x={contextMenuState.x}
        y={contextMenuState.y}
        image={contextMenuState.image}
        isOwner={!!contextMenuState.image && canEditImage(contextMenuState.image)}
        onAction={handleContextMenuAction}
      />

      {showPagination && images.length > 0 && (
        <div className="image-grid-pagination">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={isUsingExternalData ? (externalTotalImages || 0) : totalImages}
            onChange={handlePageChange}
            showSizeChanger
            showQuickJumper
            locale={{
              items_per_page: '条/页',
              jump_to: '跳至',
              jump_to_confirm: '确定',
              page: '页',
              prev_page: '上一页',
              next_page: '下一页',
              prev_5: '向前 5 页',
              next_5: '向后 5 页',
              prev_3: '向前 3 页',
              next_3: '向后 3 页'
            }}
            pageSizeOptions={['8', '16', '20', '32', '64']}
            showTotal={(total) => `共 ${total} 张图片`}
            size="default"
          />
        </div>
      )}

      <ImageViewer
        visible={viewerState.visible}
        onClose={() => setViewerState({ ...viewerState, visible: false })}
        images={images}
        initialIndex={viewerState.index}
        onFavorite={handleToggleFavoriteInternal}
        showFavoriteCount={showFavoriteCount}
        onShare={handleShareImage}
      />

      <ShareImageDialog
        visible={shareDialogState.visible}
        onClose={handleCloseShareDialog}
        image={shareDialogState.image}
      />

      <EditImageDialog
        visible={editDialogState.visible}
        onClose={handleCloseEditDialog}
        image={editDialogState.image}
        onSuccess={handleImageUpdateSuccess}
      />
    </>
  );
};

export default ImageGrid;
