# react-img-view 设计文档

三份文档的本地源文件。已发布为在线版本，改本地文件后重新发布可更新同一链接。

| 文档 | 在线 |
|---|---|
| 01-市场调研.html | https://claude.ai/code/artifact/5ef7d3c8-3bdb-4e3f-8c63-218f41e63432 |
| 02-决策书.html | https://claude.ai/code/artifact/2ed6aa84-c3f3-4c4f-86f5-6841e9277fe9 |
| 03-架构设计.html | https://claude.ai/code/artifact/754f8900-e5a2-48b3-8606-c05eb83f42ba |
| ../design/react-image-view-ui.html（界面设计稿） | https://claude.ai/code/artifact/d2ec975b-38a3-4538-8ea9-dae20f28db7e |

## design/ 目录说明

- `*.dc.html` — 各画板源文件
- `canvas.json` — 画板布局
- `gen.py` / `mkpalette.py` — 画板生成脚本，改配色和图标从这两个文件改
- `react-image-view-ui.html` — 打包产物，由上面的文件生成

改设计稿的流程：改 `gen.py` 或 `.dc.html` → 重新生成 → 重新发布到同一链接。
