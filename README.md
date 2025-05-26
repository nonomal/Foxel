<p align="center">
    <img src="Web/public/logo.png" alt="Foxel Logo" width="150"><br>
    <strong>Foxel - 智能图像检索与管理系统</strong>
</p>
<p align="center">
    <a href="#-核心功能"><img src="https://img.shields.io/badge/核心功能-Features-blue?style=for-the-badge" alt="核心功能"></a>
    <a href="#-部署指南"><img src="https://img.shields.io/badge/部署-Deploy-orange?style=for-the-badge" alt="部署"></a>
    <a href="#-适配存储"><img src="https://img.shields.io/badge/存储-Storage-green?style=for-the-badge" alt="适配存储"></a>
    <a href="#-贡献指南"><img src="https://img.shields.io/badge/贡献-Contribute-brightgreen?style=for-the-badge" alt="贡献"></a>
</p>

<p>
    <strong>Foxel</strong> 是一个基于 <strong>.NET 9</strong> 开发的现代化智能图像检索与管理系统，集成先进的 <strong>AI 视觉模型</strong> 和 <strong>向量嵌入技术</strong>，提供高效的图像搜索与管理功能。
</p>

---

> 🖥️ **在线演示：**  
> 访问 [https://foxel.cc](https://foxel.cc) 体验 Foxel 部分功能。  
> 管理员账号：`demo@foxel.cc` 密码: `foxel_demo`  
> ⚠️ **注意：演示环境数据可能不定期清理，请勿存放重要信息。**

---

## 🌐 社区交流

加入我们的社区，与其他用户交流使用心得，获取技术支持，参与项目讨论：

|     平台     | 群组信息                                                | 联系方式                                                                                                            |
|:----------:|:----------------------------------------------------|:----------------------------------------------------------------------------------------------------------------|
| 📱 **微信群** | **群名：** Foxel 小狐狸 <br>*如二维码失效，可添加 `drizzle2001` 拉群* | <img src="https://foxel.cc/Uploads/2025/05/d09d7db9-e669-4fa4-9ece-bd33ddf07623.webp" alt="微信群二维码" width="100"> |

> 💡 **社区规则：**
> - 保持友善，互相帮助
> - 发布问题时请提供详细信息
> - 禁止发布与项目无关的广告内容
> - 遵守各平台社区准则

## ✨ 核心功能

| 功能模块      | 主要特性                                |
|:----------|:------------------------------------|
| 🤖 智能图像检索 | - 基于 AI 的图像内容检索与相似度匹配<br>- 快速定位目标图片 |
| 🗂️ 图像管理  | - 支持图片分类、标签管理、批量操作<br>- 多分辨率与格式化处理  |
| 🖼️ 图床功能  | - 图片上传、存储与分享<br>- 支持多种链接格式，访问权限灵活控制 |
| 👥 多用户支持  | - 用户注册、登录、权限与分组管理                   |
| 💬 轻社交功能  | - 点赞、评论、分享                          |
| 🔗 第三方登录  | - 支持 GitHub、LinuxDo 等第三方账号快捷登录      |

---

## 🚀 部署指南

### 📋 前提条件

- 已安装 [Docker](https://www.docker.com/)。

### ⚙️ 一键部署

> ⚠️ **重要提示：**  
> Foxel 目前处于早期开发阶段，适合**尝鲜体验**和功能测试。当前版本在升级过程中可能包含**破坏性变更**，暂不提供数据迁移流程，升级时需要**重新安装**。如需**长期稳定使用**，建议等待 **Preview 版本** 发布后再部署，届时将提供完善的自动化版本升级流程。

**1. 准备数据库**

Foxel 依赖 PostgreSQL 数据库，需要启用 [vector 扩展](https://github.com/pgvector/pgvector)：

**2. 拉取并运行容器**

```bash
docker run -d -p 80:80 --name foxel \
    -v /path/to/uploads:/app/Uploads \
    -e DEFAULT_CONNECTION="Host=your_host;Username=your_user;Password=your_password;Database=your_db" \
    --pull always \
    ghcr.io/drizzletime/foxel:dev
```

**参数说明：**

- `-p 80:80`：端口映射（可修改为 `-p 8080:80` 等）
- `-v /path/to/uploads:/app/Uploads`：数据目录挂载
- `DEFAULT_CONNECTION`：PostgreSQL 数据库连接字符串

**3. 访问服务**

打开浏览器访问您的域名或者IP，**第一个注册的用户将自动获得管理员权限**。



---

## 📖 适配存储

Foxel 提供多种存储后端选择，满足不同场景下的部署需求：

- 📁 本地存储
- 📡 Telegram Channel
- ☁️ Amazon S3
- 🔐 Tencent Cloud COS
- 🌐 WebDAV

未来将持续适配更多主流云存储平台，欢迎社区贡献新的存储适配器！

---

## 🤝 贡献指南

我们欢迎所有对 Foxel 感兴趣的开发者加入贡献，共同改进和提升这个项目。

|      步骤      | 说明                                                                                          |
|:------------:|:--------------------------------------------------------------------------------------------|
| **提交 Issue** | - 发现 Bug 或有建议时，请提交 Issue。<br>- 请详细描述问题及复现步骤，便于快速定位和修复。                                      |
|   **贡献代码**   | - Fork 本项目并创建新分支。<br>- 遵循项目代码规范。                                                            |
|   **功能扩展**   | - 欢迎参与以下重点功能开发：<br>• 更智能的图像检索算法<br>• 增强社交互动<br>• 云存储/网盘集成<br>• 更多智能图像处理方法（如自动标注、风格迁移、图像增强等） |

如有任何疑问或建议，欢迎通过 Issue 与我们联系。感谢您的贡献！

---

![Star History Chart](https://api.star-history.com/svg?repos=DrizzleTime/Foxel&type=Date)

<p align="center">
    <img src="https://img.shields.io/badge/License-MIT-blueviolet?style=for-the-badge" alt="MIT License" style="display:inline-block; vertical-align:middle;">
    <span style="display:inline-block; width:20px;"></span>
    <img src="https://img.shields.io/badge/感谢您的支持-Thanks-yellow?style=for-the-badge" alt="感谢" style="display:inline-block; vertical-align:middle;">
</p>