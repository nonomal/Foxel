import React, { useState } from 'react';
import { Divider } from 'antd';
import { CloseOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import type { PictureResponse } from '../../api';
import './ImageViewer.css';
import './ImageInfo.css';

interface ImageInfoProps {
  image: PictureResponse;
  onClose: () => void;
  visible: boolean;
}

const ImageInfo: React.FC<ImageInfoProps> = ({
  image,
  onClose,
  visible
}) => {
  const [expandDescription, setExpandDescription] = useState(false);

  // 切换描述展开/折叠状态
  const toggleDescription = () => {
    setExpandDescription(!expandDescription);
  };

  // 格式化EXIF数据
  const formatExifInfo = (exifInfo: any) => {
    if (!exifInfo) return [];

    // 定义EXIF信息分类
    const categories = {
      basic: { title: "基本信息", items: [] as any[] },
      camera: { title: "相机信息", items: [] as any[] },
      settings: { title: "拍摄参数", items: [] as any[] },
      time: { title: "时间信息", items: [] as any[] },
      location: { title: "位置信息", items: [] as any[] }
    };

    // 将EXIF信息映射到对应字段
    const exifMapping: Record<string, { key: string; category: keyof typeof categories; formatter?: (value: any) => string }> = {
      // 基本信息
      width: { key: "width", category: "basic", formatter: (v) => `${v}px` },
      height: { key: "height", category: "basic", formatter: (v) => `${v}px` },

      // 相机信息
      cameraMaker: { key: "make", category: "camera" },
      cameraModel: { key: "model", category: "camera" },
      software: { key: "software", category: "camera" },

      // 拍摄参数
      exposureTime: { key: "exposureTime", category: "settings" },
      aperture: { key: "fNumber", category: "settings", formatter: (v) => `f/${v}` },
      isoSpeed: { key: "iso", category: "settings", formatter: (v) => `ISO ${v}` },
      focalLength: { key: "focalLength", category: "settings", formatter: (v) => `${v}mm` },
      flash: { key: "flash", category: "settings" },
      meteringMode: { key: "meteringMode", category: "settings" },
      whiteBalance: { key: "whiteBalance", category: "settings" },
      dateTimeOriginal: {
        key: "dateTime",
        category: "time",
        formatter: (v) => {
          if (typeof v === 'string' && v.match(/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/)) {
            const normalized = v.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
            const date = new Date(normalized);
            if (!isNaN(date.getTime())) {
              return date.toLocaleString();
            }
          }
          return v.toString();
        }
      },

      // 位置信息
      gpsLatitude: { key: "latitude", category: "location" },
      gpsLongitude: { key: "longitude", category: "location" }
    };

    // 处理每个EXIF字段
    Object.entries(exifInfo).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;

      const mapping = exifMapping[key];
      if (mapping) {
        const formattedValue = mapping.formatter ? mapping.formatter(value) : value.toString();
        const label = formatExifLabel(mapping.key);

        categories[mapping.category].items.push({
          key: mapping.key,
          label,
          value: formattedValue
        });
      }
    });

    // 返回包含数据的分类
    return Object.values(categories).filter(category => category.items.length > 0);
  };

  // 格式化EXIF标签名称
  const formatExifLabel = (key: string): string => {
    const labels: Record<string, string> = {
      // 基本信息
      width: "宽度",
      height: "高度",

      // 相机信息
      make: "相机品牌",
      model: "相机型号",
      software: "软件",

      // 拍摄参数
      exposureTime: "曝光时间",
      fNumber: "光圈值",
      iso: "ISO感光度",
      focalLength: "焦距",
      flash: "闪光灯",
      meteringMode: "测光模式",
      whiteBalance: "白平衡",

      // 时间信息
      dateTime: "拍摄时间",

      // 位置信息
      latitude: "纬度",
      longitude: "经度"
    };

    return labels[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
  };

  // 渲染EXIF信息
  const renderExifInfo = () => {
    if (!image?.exifInfo) return <div className="imageinfo-exif-empty">无EXIF信息</div>;

    const formattedCategories = formatExifInfo(image.exifInfo);

    if (formattedCategories.length === 0) {
      return <div className="imageinfo-exif-empty">无EXIF信息</div>;
    }

    return (
      <div className="imageinfo-exif-container">
        {formattedCategories.map(category => (
          <div key={category.title} className="imageinfo-exif-category">
            <Divider
              orientation="left"
              className="imageinfo-exif-divider"
            >
              {category.title}
            </Divider>
            <div className="imageinfo-exif-table">
              {category.items.map(item => (
                <div key={item.key} className="imageinfo-exif-row">
                  <div className="imageinfo-exif-label">{item.label}</div>
                  <div className="imageinfo-exif-value">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`imageinfo-drawer${visible ? ' imageinfo-drawer-visible' : ''}`}
    >
      <div className="imageinfo-header">
        <h3 className="imageinfo-header-title">图片信息</h3>
        <button className="imageinfo-close-btn" onClick={onClose}>
          <CloseOutlined />
        </button>
      </div>
      <div className="imageinfo-body">
        <div className="imageinfo-title-container">
          <h4 className="imageinfo-title">{image?.name}</h4>
          <div className="imageinfo-date">上传于{new Date(image?.createdAt).toLocaleString()}</div>
        </div>

        {image?.description && (
          <div className="imageinfo-desc-section">
            <div
              className={`imageinfo-desc-text${expandDescription ? ' imageinfo-desc-text-expand' : ''}`}
            >
              {image.description}
            </div>
            {image.description.split('\n').length > 8 || image.description.length > 200 ? (
              <button className="imageinfo-expand-btn" onClick={toggleDescription}>
                {expandDescription ? (
                  <>收起 <UpOutlined style={{ fontSize: '12px', marginLeft: '4px' }} /></>
                ) : (
                  <>展开 <DownOutlined style={{ fontSize: '12px', marginLeft: '4px' }} /></>
                )}
              </button>
            ) : null}
          </div>
        )}

        {image?.tags && image.tags.length > 0 && (
          <div className="imageinfo-tags-section">
            <div className="imageinfo-tag-title">标签</div>
            <div>
              {image.tags.map(tag => (
                <span key={tag} className="imageinfo-tag-item">#{tag}</span>
              ))}
            </div>
          </div>
        )}

        {image?.exifInfo && (
          <div className="imageinfo-specs-section">
            <div className="imageinfo-specs-container">
              <div className="imageinfo-spec-item">
                <div className="imageinfo-spec-value">{image.exifInfo.width}×{image.exifInfo.height}</div>
                <div className="imageinfo-spec-label">分辨率</div>
              </div>
              {image.exifInfo.focalLength && (
                <div className="imageinfo-spec-item">
                  <div className="imageinfo-spec-value">{image.exifInfo.focalLength}</div>
                  <div className="imageinfo-spec-label">焦距</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 渲染EXIF信息 */}
        {renderExifInfo()}
      </div>
    </div>
  );
};

export default ImageInfo;
