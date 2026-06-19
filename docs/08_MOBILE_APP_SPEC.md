# 08 - Mobile app spec

Mobile is now scoped to STAFF receipt entry. MANAGER and ADMIN use the responsive web portal in `apps/web`.

## Mobile stack

```text
React Native Expo
TypeScript
React Navigation
expo-secure-store
REST API client
```

## Main screens

### 1. LoginScreen

Fields:

```text
Tên đăng nhập
Mật khẩu
```

Actions:

```text
Đăng nhập
```

Rules:

- Show loading while logging in
- Store access token/refresh token securely
- Navigate to the staff menu after login
- Manager/admin accounts should be told to use the web portal
- Show Vietnamese error message if login fails

### 2. MenuScreen

Display staff menu.

For STAFF:

```text
- Tạo phiếu nhập
- Phiếu của tôi
- Danh mục vật tư
```

### 3. MaterialListScreen

Show:

```text
Tên vật tư
Đơn vị tính mặc định
Ghi chú
```

STAFF: read-only.

Manager/admin material management should happen from web/admin workflows.

### 4. PurchaseReceiptFormScreen

Form header:

```text
Ngày nhập
Nhà cung cấp
Ghi chú
```

Item rows:

```text
Tên hàng hóa
Số lượng
Đơn vị tính
Giá nhập
Thành tiền
```

Actions:

```text
+ Thêm dòng
Lưu nháp
Gửi duyệt
```

Validation on mobile:

- At least 1 item
- Material name required
- Quantity > 0
- Unit required
- Unit price >= 0

Important:

- Generate `client_request_id` UUID before submit
- Disable button while request is pending
- Do not update inventory locally

### 5. MyReceiptsScreen

For STAFF.

Show own receipts:

```text
Mã phiếu
Ngày nhập
Trạng thái
Tổng tiền
```

Status labels:

```text
DRAFT = Nháp
SUBMITTED = Chờ duyệt
APPROVED = Đã duyệt
REJECTED = Bị trả lại
VOIDED = Đã hủy
```

### 6. ReceiptDetailScreen

Show:

```text
Mã phiếu
Trạng thái
Người tạo
Ngày tạo
Ngày nhập
Nhà cung cấp
Danh sách vật tư
Tổng tiền
Ghi chú
```

Manager/admin approval, void, inventory, and audit workflows are handled by the web portal.

## API client structure

```text
src/api/
  httpClient.ts
  authApi.ts
  materialApi.ts
  receiptApi.ts
```

## Auth structure

```text
src/auth/
  AuthProvider.tsx
  tokenStorage.ts
  useAuth.ts
  roles.ts
```

## UI principles

The app will be used in farm conditions.

Design:

- Large buttons
- Clear Vietnamese labels
- High contrast
- Minimal screens
- Avoid tiny icons without text
- Avoid complex gestures
- Show clear success/error states

## Mobile validation

Mobile validation improves UX, but backend validation is mandatory.

Never assume mobile validation is enough.

## Network error handling

If no network:

```text
Không thể kết nối server. Vui lòng kiểm tra mạng và thử lại.
```

Phase 1 should not attempt complex offline sync.

## Token storage

Do not store tokens in plain AsyncStorage.

Use secure storage.

## No unnecessary permissions

Phase 1 should not request:

```text
Camera
Location
Contacts
Microphone
Bluetooth
Photo library
```
