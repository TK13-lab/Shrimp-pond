# App quản lý ao tôm - Client-server MVP

Bộ tài liệu này dùng để bắt đầu lại project với Codex theo hướng mới:

```text
Mobile app cài trên điện thoại nhân viên
Web portal mở bằng trình duyệt
        ↓ REST API / HTTPS
Backend server kiểm soát nghiệp vụ
        ↓
PostgreSQL database trung tâm
```

## Mục tiêu Phase 1

Hoàn thành MVP nội bộ cho module **Nhập hàng vật tư** với:

- Đăng nhập người dùng
- Phân quyền `ADMIN`, `MANAGER`, `STAFF`
- Danh mục vật tư
- Tạo phiếu nhập hàng
- Gửi phiếu cho quản lý duyệt
- Quản lý duyệt phiếu
- Cập nhật tồn kho sau khi duyệt
- Chống nhập trùng bằng `client_request_id` / idempotency key
- Audit log để truy vết ai đã làm gì
- Build file cài Android cho nhân viên dùng thử
- Web responsive cho staff nhập phiếu/xem lịch sử, manager/admin duyệt phiếu, xem lịch sử và tồn kho

## Stack đề xuất

### Mobile

```text
React Native Expo
TypeScript
React Navigation
expo-secure-store
REST API client
```

Mobile hiện dành cho STAFF nhập phiếu tại ao.

### Web

```text
Responsive HTML/CSS/JavaScript
REST API client
Browser session storage
Serve static files through Caddy/Nginx
```

Web hiện cho phép STAFF, MANAGER và ADMIN đăng nhập; các hành động nhạy cảm vẫn được backend phân quyền theo vai trò.

### Backend

```text
Node.js
NestJS
TypeScript
Prisma ORM
PostgreSQL
Docker Compose
JWT authentication
Role-based access control
```

### Database

```text
PostgreSQL server
Không dùng SQLite làm database chính
Không để app mobile kết nối trực tiếp PostgreSQL
```

## Cấu trúc project đề xuất

```text
shrimp-pond-app/
  AGENTS.md
  README.md
  docs/
  apps/
    mobile/
    web/
    api/
  docker-compose.yml
```

## Cách làm với Codex

Không đưa cho Codex một prompt quá lớn. Làm theo từng file:

1. Đọc `AGENTS.md`
2. Đọc `docs/00_PROJECT_BRIEF.md`
3. Đọc `docs/01_ARCHITECTURE_DECISION.md`
4. Làm theo từng sprint trong `docs/11_SPRINT_TASKS_FOR_CODEX.md`
5. Copy prompt từ `docs/12_CODEX_PROMPTS.md`

## CI/CD và cài Android nội bộ

GitHub Actions đã có workflow kiểm tra backend/mobile và workflow build APK Android preview qua EAS.

Xem hướng dẫn ở:

```text
docs/22_CICD_AND_ANDROID_INSTALL.md
```

## Git workflow bắt buộc

Sau mỗi bước/task đã hoàn thành và kiểm tra xong:

```bash
git add .
git commit -m "<type>(scope): <short description>"
git push origin main
```

Trong workspace lab hiện tại, `.git` bị môi trường khóa read-only nên lệnh `git` thường nhận repo cha. Dùng wrapper repo riêng này nếu gặp tình huống đó:

```bash
scripts/setup/git-shrimp add .
scripts/setup/git-shrimp commit -m "<type>(scope): <short description>"
scripts/setup/git-shrimp push origin main
```

Remote GitHub của dự án:

```text
git@github.com:TK13-lab/Shrimp-pond.git
```

Nếu local repo chưa có remote, cấu hình một lần:

```bash
git remote add origin git@github.com:TK13-lab/Shrimp-pond.git
```

Không commit `.env`, secret, raw data, log nặng, cache, hoặc output lớn.

## Nguyên tắc chính

```text
Server là source of truth.
Mobile chỉ là client nhập liệu cho staff.
Manager/admin dùng web để duyệt và theo dõi.
Không cập nhật tồn kho trực tiếp từ mobile.
Tồn kho chỉ thay đổi khi backend duyệt phiếu trong database transaction.
Không hard-delete dữ liệu nghiệp vụ.
Mọi thao tác quan trọng phải có audit log.
```
