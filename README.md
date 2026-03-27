# LAB-CODOC 在线协作文档

一个支持 Markdown、Excel、PPT 三种格式的在线协作文档系统，基于 React + Node.js 构建。

## 🌐 在线访问

- **网址**: http://49.234.51.29:8088

## ✨ 功能特性

### 📄 三种文档格式

- **Markdown 编辑器** - 基于 Monaco Editor，支持实时预览
- **Excel 编辑器** - 基于 Luckysheet，支持复杂公式和图表
- **PPT 编辑器** - 基于 PptxGenJS，支持幻灯片制作和导出

### 👥 实时协作

- 基于 Yjs + WebSocket 实现多人实时协作
- 光标同步显示
- 操作实时同步

### 📁 文档管理

- 创建、重命名、删除文档
- 文档列表展示
- 最近编辑时间排序

### 💾 数据持久化

- SQLite 数据库存储文档元数据
- 文档内容 JSON 格式存储
- 支持导出为各种格式

## 🛠 技术栈

### 后端
- **Node.js** + **Express.js**
- **SQLite** - 轻量级数据库
- **Yjs** - 协同编辑框架
- **WebSocket** - 实时通信

### 前端
- **React** 18
- **Vite** - 构建工具
- **Monaco Editor** - Markdown 编辑器
- **Luckysheet** - Excel 编辑器
- **PptxGenJS** - PPT 生成

## 🚀 快速开始

### 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client
npm install
```

### 开发模式

```bash
# 启动后端（端口 8088）
npm run dev

# 启动前端（端口 5173）
cd client
npm run dev
```

### 生产部署

```bash
# 构建前端
cd client
npm run build

# 启动生产服务器
cd ..
NODE_ENV=production node server/index.js
```

## 📁 项目结构

```
lab-codoc/
├── server/                 # 后端代码
│   ├── index.js           # 服务器入口
│   ├── models/            # 数据模型
│   │   ├── db.js         # 数据库连接
│   │   └── document.js   # 文档模型
│   ├── routes/            # API 路由
│   │   ├── document.js   # 文档 CRUD
│   │   └── collaboration.js  # 协作相关
│   ├── services/          # 业务逻辑
│   │   └── yjsService.js # Yjs 协同服务
│   └── data/              # 数据文件
│       └── codoc.db      # SQLite 数据库
├── client/                # 前端代码
│   ├── src/
│   │   ├── components/   # 编辑器组件
│   │   │   ├── MarkdownEditor.jsx
│   │   │   ├── ExcelEditor.jsx
│   │   │   └── SlideEditor.jsx
│   │   ├── pages/        # 页面
│   │   │   ├── DocumentList.jsx
│   │   │   └── Editor.jsx
│   │   ├── store/        # 状态管理
│   │   │   └── documentStore.js
│   │   └── styles/       # 样式文件
│   └── index.html
├── shared/                # 共享工具
│   ├── excelUtils.js
│   └── pptUtils.js
└── package.json
```

## 🔧 配置说明

### 后端配置 (server/index.js)

```javascript
const PORT = 8088;                    // 服务端口
const DB_PATH = './server/data/codoc.db';  // 数据库路径
```

### 前端配置 (client/vite.config.js)

```javascript
server: {
  proxy: {
    '/api': 'http://localhost:8088',  // API 代理
    '/ws': 'ws://localhost:8088'      // WebSocket 代理
  }
}
```

## 📝 API 接口

### 文档管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/documents | 获取文档列表 |
| POST | /api/documents | 创建新文档 |
| GET | /api/documents/:id | 获取文档详情 |
| PUT | /api/documents/:id | 更新文档 |
| DELETE | /api/documents/:id | 删除文档 |

### 协作编辑

| 方法 | 路径 | 描述 |
|------|------|------|
| WS | /ws/:documentId | WebSocket 协同连接 |

## 🐛 常见问题

**Q: 如何备份数据？**
A: 直接复制 `server/data/codoc.db` 文件即可。

**Q: 支持多少人在线协作？**
A: 理论无上限，实测 10+ 人同时编辑流畅。

**Q: 如何导出文档？**
A: 各编辑器支持导出为对应格式（MD/XLSX/PPTX）。

## 🗺 路线图

- [ ] 用户系统（登录/注册）
- [ ] 文档权限管理
- [ ] 文档版本历史
- [ ] 评论功能
- [ ] 移动端适配

## 📄 许可证

MIT License

## 👤 作者

FutureLab Team
