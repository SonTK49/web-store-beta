# Cài đặt trang "Gửi app" (dành cho chủ Web Store)

Trang `submit.html` cho phép bạn bè không có tài khoản GitHub vẫn gửi được app. Luồng hoạt động:

```
Bạn bè (submit.html) ──mã mời──▶ Server mini (Cloudflare Worker) ──token của bạn──▶ GitHub
                                                                      │
                                     Pull Request chờ duyệt  ◀────────┘  (hoặc đăng thẳng)
                                                │ Merge
                                                ▼
                                  GitHub Actions build → Web Store hiển thị app
```

Token GitHub chỉ nằm trên server mini, trình duyệt của bạn bè không bao giờ thấy nó.

## Bước 1: Tạo token GitHub

1. Vào GitHub → ảnh đại diện → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Token name:** `web-store-api`. **Expiration:** chọn thời hạn dài nhất (nhớ ghi lịch để gia hạn).
3. **Repository access:** chọn **Only select repositories** → `web-store`.
4. **Permissions → Repository permissions:**
   - **Contents:** Read and write
   - **Pull requests:** Read and write
5. Bấm **Generate token** và **sao chép token ngay** (GitHub chỉ hiện một lần).

## Bước 2: Tạo server mini trên Cloudflare (miễn phí)

1. Đăng ký tài khoản tại dash.cloudflare.com.
2. Vào **Workers & Pages → Create → Create Worker** (chọn mẫu "Hello World"). Đặt tên `web-store-api` rồi bấm **Deploy**.
3. Bấm **Edit code**, xóa hết code mẫu, dán toàn bộ nội dung file `server/worker.js`, rồi bấm **Deploy**.
4. Vào **Settings → Variables and Secrets**, thêm lần lượt:

| Tên | Loại | Giá trị |
|---|---|---|
| `GITHUB_TOKEN` | **Secret** | token ở bước 1 |
| `INVITE_CODES` | **Secret** | các mã mời, ví dụ `Nam:caro-2026,Linh:hoa-sen-77` |
| `REPO` | Text | `<tên-tài-khoản>/web-store` |
| `ALLOWED_ORIGIN` | Text | `https://<tên-tài-khoản>.github.io` |
| `PUBLISH_MODE` | Text | `review` (cần bạn duyệt) hoặc `direct` (đăng thẳng) |

5. Sao chép địa chỉ của Worker, dạng `https://web-store-api.<tên>.workers.dev`.

**Về mã mời:** mỗi người một mã, dạng `Tên:mã`. Tên sẽ hiện trong Pull Request để bạn biết ai gửi. Muốn thu hồi mã của ai, chỉ cần xóa mã đó khỏi `INVITE_CODES`.

## Bước 3: Nối trang Web Store với server

Trong repo GitHub, mở file `config.js`, bấm ✏️ và điền địa chỉ Worker:

```js
window.WEB_STORE = {
  api: "https://web-store-api.<tên>.workers.dev",
};
```

Bấm **Commit changes**. Khoảng 1 phút sau, trang `…/web-store/submit.html` sẵn sàng.

## Bước 4: Duyệt app (chế độ `review`)

- Khi có người gửi, GitHub gửi email cho bạn và tab **Pull requests** của repo có thêm một mục mới.
- Mở ra, xem tab **Files changed** (nên mở thử `index.html` để chắc không có gì lạ), rồi bấm **Merge pull request → Confirm merge**.
- Không muốn nhận thì bấm **Close pull request**.
- Nên bật **Settings → General → Automatically delete head branches** để repo tự dọn nhánh sau khi merge.

## Giới hạn

- Mỗi file tối đa 25 MB, mỗi app tối đa 100 MB và 1.000 file.
- Cloudflare Workers miễn phí: 100.000 lượt gọi/ngày, quá đủ cho nhóm bạn bè.
- Gói miễn phí giới hạn thời gian xử lý mỗi lượt gọi. Server đã được viết để chuyển file thẳng sang GitHub mà không xử lý nặng, nhưng nếu gặp lỗi khi gửi app rất lớn thì hãy thử lại.

## Khi có sự cố

| Thông báo | Cách xử lý |
|---|---|
| "Mã mời không đúng…" | Kiểm tra `INVITE_CODES` (không có khoảng trắng thừa trong mã). |
| "Trang này không được phép gửi app" | `ALLOWED_ORIGIN` phải đúng `https://<tên>.github.io`, không có `/web-store` phía sau. |
| "Token GitHub của server hết hạn hoặc thiếu quyền" | Tạo token mới (bước 1) và cập nhật `GITHUB_TOKEN`. |
| "Không kết nối được tới server" | Kiểm tra địa chỉ trong `config.js`. |
