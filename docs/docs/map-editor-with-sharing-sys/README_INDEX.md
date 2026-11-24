# map editor with sharing sys 文档索引

本目录对应用户自制地图系统（编辑器与本地导出），按功能拆为两部分：

1. 地图编辑器本身

- 子目录：map-editor-core-地图编辑器本身
- 文档：MAP_EDITOR_CORE_TECHNICAL.md

2. 保存功能怎么用

- 子目录：save-feature-how-to-use-保存功能怎么用
- 文档：SAVE_FEATURE_USAGE.md

相关核心代码入口：

- js/develop-mode/MapEditor.js
- js/develop-mode/EditorExporter.js
- js/AppCoordinator.js
- js/user-levels/LevelParser.js
- js/user-levels/LevelEmpty10Room.js
