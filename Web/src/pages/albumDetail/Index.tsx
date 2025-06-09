import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router';
import { 
  Typography, Button, Spin, Empty, message, 
  Popconfirm, Modal, Form, Input, InputNumber, Select // Added InputNumber, Select
} from 'antd';
import { 
  EditOutlined, DeleteOutlined, PlusOutlined} from '@ant-design/icons';
import { getAlbumById, deleteAlbum, favoritePicture, unfavoritePicture, addPicturesToAlbum, updateAlbum } from '../../api';
import type { AlbumResponse, PictureResponse } from '../../api';
import ImageGrid from '../../components/image/ImageGrid/ImageGrid';

const { Title, Text } = Typography;
const { TextArea } = Input;

type OutletContextType = {
  updateBreadcrumbTitle: (title: string) => void;
};

function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateBreadcrumbTitle = () => {} } = useOutletContext<OutletContextType>();
  
  const [album, setAlbum] = useState<AlbumResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedPictures, setSelectedPictures] = useState<number[]>([]);
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  const [albumPicturesForSelect, setAlbumPicturesForSelect] = useState<PictureResponse[]>([]); // 用于编辑时选择封面

  const loadAlbum = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await getAlbumById(parseInt(id));
      if (result.success && result.data) {
        setAlbum(result.data);
        if (typeof updateBreadcrumbTitle === 'function') {
          updateBreadcrumbTitle(result.data.name);
        }
        // 假设相册详情API返回了图片列表，或者需要另外获取
        // setAlbumPicturesForSelect(result.data.pictures || []); 
      } else {
        message.error(result.message || '获取相册失败');
      }
    } catch (error) {
      console.error('加载相册出错:', error);
      message.error('加载相册详情出错');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbum();
    // 如果需要单独获取相册图片用于选择器：
    // if (id) fetchPicturesForAlbumSelect(parseInt(id));
  }, [id, refreshTrigger]); // refreshTrigger 确保编辑后重新加载图片列表（如果需要）

  // 示例：获取相册内图片用于选择封面的函数
  // const fetchPicturesForAlbumSelect = async (albumId: number) => {
  //   try {
  //     // 替换为实际获取相册内图片的API调用
  //     // const picturesResult = await getPicturesInAlbum(albumId, 1, 200); // 获取相册内所有图片
  //     // if (picturesResult.success && picturesResult.data) {
  //     //   setAlbumPicturesForSelect(picturesResult.data);
  //     // }
  //   } catch (error) {
  //     message.error('获取相册内图片列表失败');
  //   }
  // };

  const handleDeleteAlbum = async () => {
    if (!album) return;
    
    try {
      const result = await deleteAlbum(album.id);
      if (result.success) {
        message.success('相册已删除');
        navigate('/albums');
      } else {
        message.error(result.message || '删除相册失败');
      }
    } catch (error) {
      console.error('删除相册出错:', error);
      message.error('删除相册失败，请重试');
    }
  };

  const handleToggleFavorite = async (image: PictureResponse) => {
    try {
      if (image.isFavorited) {
        const result = await unfavoritePicture(image.id);
        if (result.success) {
          message.success('已取消收藏');
         
        } else {
          message.error(result.message || '取消收藏失败');
        }
      } else {
        const result = await favoritePicture(image.id);
        if (result.success) {
          message.success('已添加到收藏');
        
        } else {
          message.error(result.message || '收藏失败');
        }
      }
    } catch (error) {
      console.error('处理收藏操作失败:', error);
      message.error('操作失败，请重试');
    }
  };

  const openAddModal = async () => {
    setIsAddModalVisible(true);
    setSelectedPictures([]);
  };

  const handleAddPictures = async () => {
    if (!album || selectedPictures.length === 0) {
      message.info('请先选择图片');
      return;
    }

    try {
      setIsAddModalVisible(false);
      const result = await addPicturesToAlbum(album.id, selectedPictures);
      
      if (result.success) {
        message.success(`已添加 ${selectedPictures.length} 张图片到相册`);
        setSelectedPictures([]); 
        loadAlbum(); 
        setRefreshTrigger(prev => prev + 1); // 更新刷新触发器
      } else {
        message.error(result.message || '添加图片到相册失败');
      }
    } catch (error) {
      console.error('添加图片到相册出错:', error);
      message.error('添加图片到相册失败，请重试');
    }
  };

  const getFormattedDate = (dateString?: Date) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const imagesLoadedRef = useRef(false);
  
  const handleAlbumImagesLoaded = useCallback(() => {
    if (!imagesLoadedRef.current) {
      imagesLoadedRef.current = true;
    }
  }, []);
  
  useEffect(() => {
    return () => {
      imagesLoadedRef.current = false;
    };
  }, [id]);

  // 打开编辑对话框
  const openEditModal = () => {
    if (album) {
      editForm.setFieldsValue({
        name: album.name,
        description: album.description || '',
        coverPictureId: album.coverPictureId // 设置当前封面ID
      });
      // 如果 album.pictures 存在，可以用它来填充选择器
      // 或者在打开模态框时调用 fetchPicturesForAlbumSelect(album.id)
      // setAlbumPicturesForSelect(album.pictures || []); // 假设 album 对象包含 pictures 数组
      setIsEditModalVisible(true);
    }
  };

  // 提交编辑表单
  const handleEditAlbum = async () => {
    if (!album) return;
    
    try {
      setSubmitting(true);
      const values = await editForm.validateFields(); // values 包含 name, description, coverPictureId
      
      const result = await updateAlbum({
        id: album.id,
        name: values.name,
        description: values.description,
        coverPictureId: values.coverPictureId // 传递封面ID
      });
      
      if (result.success) {
        message.success('相册已更新');
        setIsEditModalVisible(false);
        // 重新加载相册信息
        loadAlbum();
      } else {
        message.error(result.message || '更新相册失败');
      }
    } catch (error) {
      console.error('编辑相册出错:', error);
      message.error('表单验证失败或提交时出错');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !album) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!album) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Empty description="相册不存在或已被删除" />
        <Button type="primary" style={{ marginTop: 20 }} onClick={() => navigate('/albums')}>
          返回相册列表
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* 移除原来的面包屑代码 */}

      <div style={{ 
        marginBottom: 40, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start'
      }}>
        <div>
          <Title level={2} style={{ 
            margin: 0, 
            marginBottom: 10, 
            fontWeight: 600, 
            letterSpacing: '0.5px',
            fontSize: 32,
            background: 'linear-gradient(120deg, #000000, #444444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>{album.name}</Title>
          <Text type="secondary" style={{ 
            fontSize: 16,
            display: 'block',
            marginBottom: 8
          }}>{album.description || "无描述"}</Text>
          <Text type="secondary" style={{ fontSize: 14 }}>
            创建于 {getFormattedDate(album.createdAt)} · {album?.pictureCount || 0} 张照片
          </Text>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <Button 
            icon={<PlusOutlined />}
            onClick={openAddModal}
            style={{ 
              borderRadius: 10, 
              height: 40,
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            添加照片
          </Button>
          <Button 
            icon={<EditOutlined />}
            style={{ 
              borderRadius: 10, 
              height: 40,
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onClick={openEditModal}
          >
            编辑相册
          </Button>
          <Popconfirm
            title="确定要删除这个相册吗？"
            description="删除后不可恢复，但相册中的照片不会被删除。"
            onConfirm={handleDeleteAlbum}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger
              icon={<DeleteOutlined />}
              style={{ 
                borderRadius: 10, 
                height: 40,
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              删除相册
            </Button>
          </Popconfirm>
        </div>
      </div>

      <ImageGrid 
        key={refreshTrigger} 
        queryParams={{ albumId: parseInt(id || '0') }}
        onToggleFavorite={handleToggleFavorite}
        showFavoriteCount={true}
        showPagination={true}
        emptyText="相册中还没有照片"
        onImagesLoaded={handleAlbumImagesLoaded}
      />

      {/* 添加图片到相册的对话框 */}
      <Modal
        title="添加图片到相册"
        open={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onOk={handleAddPictures}
        width={1000}
      >
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px 0' }}>
          <ImageGrid 
            queryParams={{ excludeAlbumId: parseInt(id || '0') }}
            showFavoriteCount={false}
            emptyText="没有可添加的图片"
            pageSize={12}
            selectedIds={selectedPictures}
            selectable={true} // 新增：启用选择模式
            onSelectionChange={setSelectedPictures} // 新增：设置选择变化回调
          />
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{selectedPictures.length} 张图片已选择</span>
          </div>
        </div>
      </Modal>

      {/* 编辑相册的对话框 */}
      <Modal
        title="编辑相册"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsEditModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting} 
            onClick={handleEditAlbum}
          >
            保存
          </Button>,
        ]}
      >
        <Form
          form={editForm}
          layout="vertical"
          initialValues={{
            name: album.name,
            description: album.description || '',
            coverPictureId: album.coverPictureId // 初始化表单的封面ID
          }}
        >
          <Form.Item
            name="name"
            label="相册名称"
            rules={[{ required: true, message: '请输入相册名称' }]}
          >
            <Input placeholder="请输入相册名称" maxLength={50} />
          </Form.Item>
          <Form.Item
            name="description"
            label="相册描述"
          >
            <TextArea 
              placeholder="请输入相册描述" 
              autoSize={{ minRows: 3, maxRows: 6 }} 
              maxLength={500} 
              showCount 
            />
          </Form.Item>
          <Form.Item
            name="coverPictureId"
            label="封面图片 (可选)"
            tooltip="从当前相册中选择一张图片作为封面。实际应用中应为图片选择器。"
          >
            {/* 
              实际应用中替换为图片选择器，例如:
              <Select
                showSearch
                allowClear
                placeholder="选择封面图片"
                // loading={loadingAlbumPicturesForSelect}
                filterOption={(input, option) => 
                  option?.label.toLowerCase().includes(input.toLowerCase())
                }
                options={albumPicturesForSelect.map(p => ({ 
                  value: p.id, 
                  label: p.name || `图片 ${p.id}`, 
                  thumbnail: p.thumbnailPath || p.path 
                }))}
                // optionRender={(option) => (
                //   <Space>
                //     {option.data.thumbnail && <img src={option.data.thumbnail} alt={option.label} style={{width: 24, height: 24, objectFit: 'cover'}}/>}
                //     <span>{option.label}</span>
                //   </Space>
                // )}
              />
            */}
            <InputNumber placeholder="输入封面图片ID" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AlbumDetail;