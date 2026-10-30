# Web Store

Cửa hàng game và tiện ích HTML do bạn bè cùng đóng góp, chạy trên GitHub Pages.

- Mỗi app nằm trong một thư mục `apps/<tên-app>/` với `index.html` là file mở đầu.
- Mỗi khi có thay đổi, GitHub Actions (`.github/workflows/deploy.yml`) chạy `scripts/build-apps.mjs` để tạo `apps.json`, rồi đăng trang.
- Muốn góp app? Bấm **+ Gửi app** trên trang (không cần tài khoản GitHub), hoặc xem [CONTRIBUTING.md](CONTRIBUTING.md).
- Trang gửi app (`submit.html`) dùng một server mini trên Cloudflare (`server/worker.js`). Cách cài đặt: [server/HUONG-DAN-CAI-DAT.md](server/HUONG-DAN-CAI-DAT.md).

## Chạy thử trên máy

`index.html` cần đọc `apps.json`, nên không mở trực tiếp bằng file:// được. Trong thư mục repo, chạy:

```
node scripts/build-apps.mjs
npx serve .
```

rồi mở địa chỉ mà lệnh trên in ra.
