# 快速开始 {#getting-started}

## 在线体验 {#try-it-online}

在开始部署之前，您可以先通过在线演示体验 Foxel 的核心功能：

::: info 在线演示
🖥️ **演示地址：** [https://demo.foxel.cc](https://foxel.cc)

**演示账号：**
- 管理员账号：`demo@foxel.cc`
- 密码：`foxel_demo`
:::

::: warning 注意
演示环境数据可能不定期清理，请勿存放重要信息。
:::

## 部署准备 {#prerequisites}

在开始部署 Foxel 之前，请确保您的环境满足以下要求：

::: tip 环境要求
- 已安装 [Docker](https://www.docker.com/) 和 Docker Compose
- 开放端口 8088（可自定义）
:::

## 安装部署 {#installation}

### 🐳 Docker Compose 一键部署（推荐） {#docker-compose}

这是最简单的部署方式，适合大多数用户：

::: code-group

```bash [下载文件]
# 下载 compose.yaml 文件
wget https://raw.githubusercontent.com/DrizzleTime/Foxel/master/compose.yaml

# 或使用 curl
curl -O https://raw.githubusercontent.com/DrizzleTime/Foxel/master/compose.yaml
```

```bash [创建目录]
# 创建必要的数据目录
mkdir -p ./uploads ./db

# 设置正确的目录权限
chmod 755 ./uploads
chmod 700 ./db
```

```bash [启动服务]
# 启动所有服务
docker compose up -d

# 查看启动状态
docker compose ps
```

:::

::: details 访问应用
- 打开浏览器访问：`http://你的服务器地址:8088`
- **第一个注册的用户将自动获得管理员权限**
:::

### 🐋 Docker 单容器部署 {#docker-standalone}

如果您已有 PostgreSQL 数据库或需要更灵活的配置：

::: code-group

```bash [准备数据库]
# 确保您有可用的 PostgreSQL 数据库（版本 12 或更高）
```

```bash [运行容器]
docker run -d -p 8088:80 --name foxel \
    -v /path/to/data:/app/data \
    -v /path/to/logs:/app/logs \
    -v /path/to/uploads:/app/Uploads \
    -e DEFAULT_CONNECTION="Host=your_host;Username=your_user;Password=your_password;Database=your_db" \
    -e TZ=Asia/Shanghai \
    --pull always \
    ghcr.io/drizzletime/foxel:dev
```

:::

::: details 参数说明
- `-p 8088:80`：端口映射，可修改为其他端口
- `-v`：数据目录挂载，请替换为实际路径  
- `DEFAULT_CONNECTION`：PostgreSQL 连接字符串
- `TZ`：时区设置
:::

## 基础配置 {#basic-configuration}

### 首次使用设置 {#initial-setup}

1. **注册管理员账号**
   - 访问 Foxel 主页
   - 点击"注册"按钮
   - 填写必要信息完成注册
   - 第一个注册用户自动获得管理员权限

2. **配置存储后端**
   - 登录管理后台
   - 进入"系统设置" > "存储配置"
   - 选择合适的存储方案（本地存储、云存储等）

3. **设置用户权限**
   - 在"用户管理"中配置用户角色

## 重要提示 {#important-notes}

::: danger 开发阶段提醒
Foxel 目前处于早期开发阶段，适合**尝鲜体验**和功能测试。当前版本在升级过程中可能包含**破坏性变更**，暂不提供数据迁移流程。

- **体验用户**：可直接使用当前版本
- **生产环境**：建议等待 Preview 版本发布  
- **升级注意**：可能需要重新安装
:::