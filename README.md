# My Edge Start Page

一个把 Edge 书签整理成可视化导航站的小项目，适合本地使用，也适合部署到 `GitHub + Netlify`。

## 主要功能

- 自动读取本机 Edge `Bookmarks` 文件
- 手动导入 Edge 导出的 `HTML` 或原始 `Bookmarks JSON`
- 左侧分组导航和右侧卡片画布联动
- 网站图标、访问状态、失效提示
- 书签新增、编辑、删除、置顶、拖拽改分组
- 部署后自动保存编辑结果，不会下次打开又重置

## 编辑权限

- 默认编辑口令：`admin`
- 安全重设密码：`a1015358818`
- 正常浏览和跳转不需要口令
- 只有点击右上角 `编辑模式` 并输入正确口令后，才可以修改书签
- 单次会话只需要输入一次口令
- 进入编辑模式后，可以在前端直接修改新口令
- 如果忘记编辑口令，可以用安全密码重设

## 本地启动

确保本机已经安装 Node.js，然后在项目目录执行：

```powershell
node server.js
```

访问地址：

```text
http://127.0.0.1:4173/
```

## Netlify 部署

- 发布目录：`.`
- Build command：留空
- 函数目录已经在 [netlify.toml](./netlify.toml) 里配置完成
- 书签状态和编辑口令会保存在 Netlify Blobs 中

详细步骤见 [NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md)。

## 本地数据位置

本地运行时会在项目目录下生成：

- `.state/bookmark-state.json`
- `.state/editor-config.json`

这两个文件已经被 `.gitignore` 忽略，不会污染仓库。

## 自动导入路径

程序会优先尝试读取以下 Edge 文件：

- `%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Bookmarks`
- `%USERPROFILE%\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Bookmarks`
