# 01 - Architecture decision

## Quyết định chính

Dùng kiến trúc client-server.

```text
Staff mobile app
Manager/admin web
  ↓
REST API backend
  ↓
PostgreSQL database
```

## Lý do không dùng local-only database

Nếu dùng SQLite local-only trên điện thoại:

- Mất điện thoại là mất dữ liệu
- Xóa app là mất dữ liệu
- Nhân viên nghỉ việc khó thu hồi dữ liệu
- Nhiều người cùng nhập dễ lệch dữ liệu
- Không kiểm soát được ai nhập, ai duyệt
- Khó chống trùng lặp khi nhiều thiết bị cùng làm việc

## Lý do cần backend API

Backend giúp:

- Kiểm soát đăng nhập
- Kiểm soát phân quyền
- Validate dữ liệu tập trung
- Cập nhật tồn kho bằng transaction
- Ghi audit log
- Chống nhập trùng
- Backup dữ liệu server
- Phục vụ staff mobile app và manager/admin web từ cùng một API

## Stack được chọn

### Backend

```text
NestJS + TypeScript
Prisma ORM
PostgreSQL
Docker Compose
JWT
bcrypt hoặc argon2
```

### Mobile

```text
React Native Expo
TypeScript
React Navigation
expo-secure-store
REST API client
```

Mobile là client cho STAFF nhập phiếu tại ao.

### Web

```text
Responsive HTML/CSS/JavaScript
REST API client
Static hosting behind Caddy/Nginx
```

Web là client cho MANAGER và ADMIN duyệt phiếu, xem lịch sử và xem tồn kho.

## Folder structure

```text
shrimp-pond-app/
  apps/
    api/
      src/
        auth/
        users/
        farms/
        materials/
        purchase-receipts/
        inventory/
        audit-logs/
        common/
      prisma/
        schema.prisma
        seed.ts
    mobile/
      src/
        screens/
        components/
        navigation/
        api/
        auth/
        types/
        utils/
    web/
      index.html
      src/
        main.js
        styles.css
  docs/
  AGENTS.md
  README.md
  docker-compose.yml
```

## Data ownership

Server là source of truth.

Client có thể cache một số dữ liệu để hiển thị nhanh, nhưng Phase 1 chưa cần offline sync.

Nếu mất kết nối mạng:

- Không gửi được phiếu
- Có thể hiển thị thông báo "Không có kết nối"
- Có thể lưu draft tạm trên app ở Phase 2, nhưng không cập nhật tồn kho offline

## Nguyên tắc bảo mật kiến trúc

Sai:

```text
Mobile app/web -> PostgreSQL
```

Đúng:

```text
Mobile app/web -> Backend API -> PostgreSQL
```

Client không được chứa:

- Database URL
- Database password
- JWT secret
- Admin credentials
- Private API keys
