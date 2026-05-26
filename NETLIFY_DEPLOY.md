# Netlify 部署说明

## 1. 推送到 GitHub

把当前项目推到你自己的 GitHub 仓库。

## 2. 在 Netlify 连接仓库

在 Netlify 中选择：

- `Add new site`
- `Import an existing project`
- 选择你的 GitHub 仓库

部署参数：

- `Build command`：留空
- `Publish directory`：`.`

## 3. 首次访问和编辑

- 页面部署完成后，任何人都可以浏览和点击跳转
- 只有点右上角 `编辑模式` 并输入口令后，才可以修改书签
- 默认编辑口令是 `admin`
- 如果忘记口令，可以在登录弹窗里点 `忘记口令？用安全密码重设`
- 安全重设密码是 `a1015358818`

## 4. 数据保存方式

这个项目已经接好了：

- `Netlify Functions`
- `Netlify Blobs`

它们会保存：

- 导入后的书签数据
- 新增、编辑、删除、置顶
- 拖拽改分组
- 编辑口令变更

所以你下次再打开，不会回到初始状态。

## 5. 本地与线上差异

- 本地 `node server.js`：状态保存到 `.state/`
- Netlify 线上：状态保存到 Netlify Blobs

前端调用方式已经自动判断，不需要你手动切换。
