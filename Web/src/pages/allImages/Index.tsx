import { useState, useRef, useMemo, useCallback } from 'react';
import { Typography, Button, Dropdown, message, Row, Col } from 'antd';
import { SortAscendingOutlined, UploadOutlined } from '@ant-design/icons';
import type { PictureResponse } from '../../api';
import ImageUploadDialog from '../../components/upload/ImageUploadDialog';
import ImageGrid from '../../components/image/ImageGrid/ImageGrid';
import useIsMobile from '../../hooks/useIsMobile';

const { Title } = Typography;

function AllImages() {
  const isMobile = useIsMobile();
  const [, setImages] = useState<PictureResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState<string>('uploadDate_desc');
  const [isUploadDialogVisible, setIsUploadDialogVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const sortByRef = useRef(sortBy);
  const handleSortChange = (newSortBy: string) => {
    if (sortBy !== newSortBy) {
      setSortBy(newSortBy);
      sortByRef.current = newSortBy;
    }
  };

  const queryParamsObject = useMemo(() => {
    return { 
      sortBy,
      refreshTrigger 
    };
  }, [sortBy, refreshTrigger]);

  const handleToggleFavorite = (image: PictureResponse) => {
    // 只需处理 viewer 中的图片
    setImages(prevImages =>
      prevImages.map(img =>
        img.id === image.id ? {
          ...img,
          isFavorited: !img.isFavorited,
          favoriteCount: img.isFavorited
            ? Math.max(0, img.favoriteCount - 1)
            : img.favoriteCount + 1
        } : img
      )
    );
  };

  const handleUploadComplete = () => {
    message.success('图片上传完成，刷新列表');
    setRefreshTrigger(prev => prev + 1);
    setImages([]);
  };

  // 当分页变化时，保存当前浏览的页码
  const handlePageChange = (page: number, pageSize: number) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const handleImagesLoaded = useCallback((loadedImages: PictureResponse[]) => {
    setImages(loadedImages);
  }, []); 

  const sortMenu = {
    items: [
      { key: 'takenAt_desc', label: '最新拍摄' },
      { key: 'takenAt_asc', label: '最早拍摄' },
      { key: 'uploadDate_desc', label: '最新上传' },
      { key: 'uploadDate_asc', label: '最早上传' },
      { key: 'name_asc', label: '名称 A-Z' },
      { key: 'name_desc', label: '名称 Z-A' },
    ],
    onClick: ({ key }: { key: string }) => handleSortChange(key),
  };

  return (
    <>
      <div style={{
        marginBottom: isMobile ? 30 : 50,
        position: 'relative',
        zIndex: 1
      }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={12} lg={12}>
            <Title level={2} style={{
              margin: 0,
              marginBottom: isMobile ? 5 : 10,
              fontWeight: 600,
              letterSpacing: '0.5px',
              fontSize: isMobile ? 24 : 32,
              background: 'linear-gradient(120deg, #000000, #444444)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: isMobile ? 'center' : 'left',
            }}>所有图片</Title>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12}>
            <div style={{ 
              display: 'flex', 
              gap: isMobile ? 8 : 12,
              justifyContent: isMobile ? 'center' : 'flex-end' 
            }}>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                style={{
                  borderRadius: 10,
                  height: isMobile ? 40 : 46,
                  padding: isMobile ? '0 15px' : '0 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: isMobile ? 14 : 15
                }}
                onClick={() => setIsUploadDialogVisible(true)}
              >
                上传图片
              </Button>
              <Dropdown menu={sortMenu} placement="bottomRight">
                <Button style={{
                  borderRadius: 10,
                  height: isMobile ? 40 : 46,
                  border: '1px solid #f0f0f0',
                  padding: isMobile ? '0 15px' : '0 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: isMobile ? 14 : 15,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  background: '#ffffff'
                }}>
                  <SortAscendingOutlined />
                  {!isMobile && "排序方式"}
                </Button>
              </Dropdown>
            </div>
          </Col>
        </Row>
      </div>

      <ImageGrid
        queryParams={queryParamsObject}
        pageSize={pageSize}
        defaultPage={currentPage}
        onPageChange={handlePageChange}
        onToggleFavorite={handleToggleFavorite}
        showFavoriteCount={true}
        onImagesLoaded={handleImagesLoaded}
      />

      <ImageUploadDialog
        visible={isUploadDialogVisible}
        onClose={() => setIsUploadDialogVisible(false)}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
}

export default AllImages;