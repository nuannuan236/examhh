# 部署说明

本项目是纯前端静态网站。题库、做题记录、错题本都保存在用户自己的浏览器 IndexedDB 中，服务器只负责托管静态文件。

## 构建

```powershell
npm install
npm run build
```

构建完成后，上传 `dist/` 目录中的全部文件到服务器网站根目录。

## Nginx 示例

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/testH;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

如果部署到子目录，例如 `https://example.com/quiz/`，需要先在 `vite.config.ts` 配置 `base: '/quiz/'`，再重新构建。

## 更新版本

每次更新代码后重新执行：

```powershell
npm run build
```

然后用新的 `dist/` 覆盖服务器上的旧静态文件。覆盖静态文件不会清空用户浏览器里的题库和答题记录。
