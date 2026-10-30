# Góp app vào Web Store

> **Cách dễ nhất:** bấm **+ Gửi app** trên trang Web Store, kéo thả thư mục app (hoặc file .html, .zip), nhập mã mời và bấm gửi. Không cần tài khoản GitHub. Hướng dẫn dưới đây dành cho người muốn tải trực tiếp qua GitHub, nhưng phần chuẩn bị thư mục app thì cách nào cũng giống nhau.

Mỗi app (game hoặc tiện ích) là **một thư mục** nằm trong `apps/`. Bạn chỉ cần tải thư mục đó lên, Web Store sẽ tự thêm app vào cửa hàng sau khoảng 1–2 phút.

## 1. Chuẩn bị thư mục app

```
ten-app-cua-ban/          ← tên thư mục: chữ thường, không dấu, nối bằng gạch ngang
├── index.html            ← BẮT BUỘC: file mở đầu của app
├── app.json              ← nên có: tên, mô tả, loại app
├── icon.png              ← tùy chọn: biểu tượng vuông (ví dụ 256×256)
├── cover.png             ← tùy chọn: ảnh minh họa ngang (16:9)
├── css/ …                ← tùy ý: css, js, ảnh, âm thanh…
└── js/ …
```

**Lưu ý quan trọng:** trong code, hãy dùng **đường dẫn tương đối**:

- ✅ `css/style.css`, `./js/game.js`, `img/hero.png`
- ❌ `/css/style.css` (dấu `/` ở đầu sẽ làm app lỗi trên GitHub Pages)

Game chỉ có 1 file HTML cũng được: tạo thư mục, đặt file vào và đổi tên thành `index.html`.

## 2. Tạo file `app.json`

```json
{
  "title": "Tên app hiển thị",
  "type": "game",
  "category": "Giải đố",
  "description": "Một hai câu giới thiệu app.",
  "author": "Tên của bạn",
  "color": "#2b7fd6"
}
```

- `type`: `"game"` hoặc `"tool"` (tiện ích).
- `color`: màu biểu tượng khi không có `icon.png`.
- Thiếu `app.json` thì app vẫn lên kệ, tên lấy từ thẻ `<title>` trong `index.html`.

## 3. Tải lên GitHub

**Cách A: bạn đã được mời làm Collaborator**

1. Mở repo, vào thư mục `apps/`.
2. Bấm **Add file → Upload files**.
3. Kéo **cả thư mục app** vào khung tải lên.
4. Ghi chú ngắn (ví dụ "Thêm game Cờ Caro") rồi bấm **Commit changes**.

**Cách B: chưa có quyền (Fork + Pull Request)**

1. Bấm **Fork** ở góc phải trên của repo để tạo bản sao về tài khoản của bạn.
2. Trên bản sao, làm như cách A.
3. Bấm **Contribute → Open pull request**. Chủ repo duyệt xong là app lên kệ.

## 4. Sửa hoặc cập nhật app

Vào đúng thư mục app của bạn, tải file mới lên (trùng tên sẽ được ghi đè) hoặc bấm biểu tượng ✏️ để sửa trực tiếp.

## Giới hạn

- Mỗi file tải qua trình duyệt: tối đa **25 MB**.
- Toàn bộ trang: tối đa **1 GB**, nên hãy nén ảnh và âm thanh trước khi tải lên.
- Không đưa mật khẩu, khóa API hay thông tin cá nhân vào code: repo này công khai.
