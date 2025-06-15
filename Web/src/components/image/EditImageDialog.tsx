import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Select, Spin } from 'antd';
import { type PictureResponse, updatePicture } from '../../api';
import './EditImageDialog.css';

const { TextArea } = Input;
const { Option } = Select;

interface EditImageDialogProps {
  visible: boolean;
  onClose: () => void;
  image: PictureResponse | null;
  onSuccess?: (updatedImage: PictureResponse) => void;
}

const EditImageDialog: React.FC<EditImageDialogProps> = ({
  visible,
  onClose,
  image,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  
  // 当图片信息变化时重置表单
  useEffect(() => {
    if (visible && image) {
      form.setFieldsValue({
        name: image.name,
        description: image.description,
        tags: image.tags || [],
        permission: image.permission === undefined ? 0 : image.permission // Default to Public if undefined
      });
    }
  }, [visible, image, form]);

  // 提交表单
  const handleSubmit = async () => {
    if (!image) return;
    
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      const result = await updatePicture({
        id: image.id,
        name: values.name,
        description: values.description,
        tags: values.tags,
        permission: values.permission
      });
      
      if (result.success) {
        message.success('图片信息已成功更新');
        if (onSuccess) {
          onSuccess(result.data!);
        }
        onClose();
      } else {
        // 根据错误信息判断提示内容
        if (result.message && result.message.includes('向量')) {
          message.warning('图片信息已更新，但AI索引生成失败。您的图片可能在高级搜索中不可见，但基本功能不受影响。');
          // 尽管AI索引失败，但其他信息已更新，所以仍然调用成功回调
          if (onSuccess && result.data) {
            onSuccess(result.data);
          }
          onClose();
        } else {
          message.error(result.message || '更新图片失败');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        // 解析常见错误消息并提供友好提示
        const errorMsg = error.message;
        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          message.error('AI服务授权失败，请检查服务配置');
        } else if (errorMsg.includes('vector') || errorMsg.includes('dimension')) {
          message.error('AI索引生成失败，请稍后重试');
        } else {
          message.error(`提交失败: ${errorMsg}`);
        }
      } else {
        message.error('提交失败，请检查表单');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 自定义标签选择
  const tagRender = (props: any) => {
    const { label, closable, onClose } = props;
    return (
      <div className="custom-tag">
        #{label}
        {closable && (
          <span className="custom-tag-close" onClick={onClose}>×</span>
        )}
      </div>
    );
  };

  if (!image) return null;

  return (
    <Modal
      title="编辑图片信息"
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      maskClosable={false}
      className="edit-image-dialog"
    >
      <div className="edit-image-container">
        <div className="edit-image-preview">
          <img 
            src={image.thumbnailPath || image.path} 
            alt={image.name} 
            className="edit-preview-img" 
          />
        </div>
        
        <Spin spinning={submitting}>
          <Form
            form={form}
            layout="vertical"
            className="edit-image-form"
            initialValues={{
              name: image.name,
              description: image.description,
              tags: image.tags || []
            }}
          >
            <Form.Item
              name="name"
              label="图片名称"
              rules={[{ required: true, message: '请输入图片名称' }]}
            >
              <Input placeholder="给图片起个名字" maxLength={100} />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="图片描述"
            >
              <TextArea 
                placeholder="添加描述..." 
                autoSize={{ minRows: 3, maxRows: 6 }}
              />
            </Form.Item>
            
            <Form.Item
              name="tags"
              label="标签"
            >
              <Select
                mode="tags"
                placeholder="添加标签..."
                tagRender={tagRender}
                tokenSeparators={[',', ' ']}
                style={{ width: '100%' }}
              >
                {(image.tags || []).map(tag => (
                  <Option key={tag} value={tag}>{tag}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="permission"
              label="权限设置"
              rules={[{ required: true, message: '请选择权限' }]}
            >
              <Select placeholder="选择权限">
                <Option value={0}>公开</Option>
                <Option value={1}>好友可见</Option>
                <Option value={2}>私密</Option>
              </Select>
            </Form.Item>

            <Form.Item className="edit-form-actions">
              <Button onClick={onClose} style={{ marginRight: 8 }}>取消</Button>
              <Button 
                type="primary" 
                onClick={handleSubmit}
                loading={submitting}
              >
                保存
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </div>
    </Modal>
  );
};

export default EditImageDialog;
