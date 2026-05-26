# Cloudflare Pages 说明

这个仓库当前主目标是 `GitHub + Netlify`。

如果你只是想把纯前端静态页面部署到 Cloudflare Pages，也可以上传根目录里的静态资源，但需要注意：

- Cloudflare 静态托管不能直接读取你本机的 Edge 书签文件
- 也不能使用当前项目的 Netlify Functions / Blobs 持久化能力
- 你需要在页面里手动导入书签文件
- 编辑后的状态只能保存在当前浏览器本地

如果你更在意“部署后还能持续编辑并保存”，优先使用 Netlify 版本。
