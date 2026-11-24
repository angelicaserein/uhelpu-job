# 保存功能怎么用（导出）

## 1. 保存能力

在当前编辑器里，“保存”是本地导出代码（Save 按钮）：

- 触发 MapEditor.\_handleSave()
- 调用 EditorExporter.copyToClipboard(...)
- 结果是可直接粘贴到关卡代码中的类代码片段

## 2. 玩家实际使用步骤

### A. 先进入编辑器

1. 在选世界页点击“地图编辑器”
2. 系统加载 empty_editor 并进入编辑状态

### B. 编辑地图

1. 在工具栏选择实体
2. 在场景中点击放置
3. 需要时可拖拽、缩放、删除、撤销
4. 设置出生点和房间数量

### C. 保存为代码（给开发调试）

1. 点击 Save
2. 输入 Level Class Name
3. 系统自动标准化类名并复制到剪贴板
4. 控制台会打印导出代码

## 3. 关键参数说明

导出会使用以下核心参数：

- records：当前编辑器内全部实体记录
- roomCount：房间数
- canvasWidth/canvasHeight：关卡画布尺寸
- spawn：玩家出生点
- meta：地图标题、作者、创建时间等元信息

## 4. 常见失败点

1. Save 导出后代码不可用

- 检查类名是否合法
- 检查关卡依赖实体是否已导入

## 5. 关联源码

- js/develop-mode/MapEditor.js
- js/develop-mode/EditorExporter.js
- js/AppCoordinator.js
