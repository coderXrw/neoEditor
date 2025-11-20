# NeoEditor

NeoEditor 是一个基于 Vue 3 + Vite + Fabric.js 的画布编辑器实验项目，用于快速拼装营销素材。项目目前包含以下模块：

- 左侧素材库：通过 `src/data/assetLibrary.js` 管理预置素材；
- 中央画布：`src/components/CanvasEditor.vue` 负责画布、标尺、对齐辅助线等核心交互；
- 右侧属性面板：支持图片、文本、图形等不同元素的属性编辑；
- 快速菜单：选中元素后显示常用操作（复制、删除、层级调整等）。

## 快速开始

```bash
pnpm install
pnpm dev
```

或使用 npm：

```bash
npm install
npm run dev
```

默认开发端口为 `http://localhost:5173`，可在 `vite.config.ts` 中调整。

## 常见脚本

| 命令           | 说明         |
| -------------- | ------------ |
| `pnpm dev`     | 启动开发环境 |
| `pnpm build`   | 打包生产构建 |
| `pnpm preview` | 预览打包产物 |

## 目录结构

```
src/
  App.vue               # 布局入口
  components/
    CanvasEditor.vue    # 核心画布编辑器
    AddPanel.vue        # 素材库面板
    RightPanel.vue      # 属性/图层面板
  data/
    assetLibrary.js     # 素材配置
```

## 近期调整

- 修正画布缩放时快速菜单 `fast-menu` 定位偏移的问题，使其跟随 viewportTransform；
- 优化 README，补充运行方式与项目结构说明。
