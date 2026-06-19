# 03 - Phase 1 scope and requirements

## Phase 1 name

Client-server MVP cho nhập hàng vật tư

## Phase 1 goal

Hoàn thành flow:

```text
Đăng nhập
→ Tạo phiếu nhập
→ Gửi duyệt
→ Quản lý duyệt
→ Tồn kho cập nhật
→ Audit log
```

## Must have

### Client split

```text
STAFF: Android mobile app for receipt entry
MANAGER/ADMIN: responsive web portal for approval, history, and inventory
```

### Authentication

- User đăng nhập bằng username/password
- Backend trả về access token
- Mobile lưu token an toàn
- Có endpoint lấy thông tin user hiện tại

### Role-based access control

Role:

```text
ADMIN
MANAGER
STAFF
```

Backend phải kiểm tra quyền cho từng endpoint.

### Materials

Vật tư gồm:

```text
- id
- farm_id
- name
- default_unit
- note
- is_active
```

Chức năng:

- Xem danh sách vật tư
- Tạo vật tư
- Sửa vật tư
- Vô hiệu hóa vật tư

### Purchase receipts

Phiếu nhập gồm:

```text
- receipt_code
- receipt_date
- supplier_name
- note
- status
- total_amount
- created_by
- submitted_by
- approved_by
```

Mỗi dòng phiếu gồm:

```text
- material_id
- material_name
- quantity
- unit
- unit_price
- line_total
```

### Workflow

```text
DRAFT -> SUBMITTED -> APPROVED
DRAFT -> SUBMITTED -> REJECTED
APPROVED -> VOIDED
```

Tồn kho chỉ tăng khi phiếu được `APPROVED`.

### Inventory

Tồn kho gồm:

```text
- material
- unit
- current_quantity
- average_price
```

Giá trung bình:

```text
new_average_price =
((old_quantity * old_average_price) + (incoming_quantity * incoming_unit_price))
/ (old_quantity + incoming_quantity)
```

### Duplicate prevention

- Mobile gửi `client_request_id`
- Backend lưu idempotency key
- Backend không tạo trùng phiếu nếu request bị gửi lại
- Backend không cộng tồn kho 2 lần cho cùng một phiếu
- Backend cảnh báo phiếu nghi trùng

### Audit log

Ghi log cho:

```text
LOGIN
CREATE_RECEIPT
SUBMIT_RECEIPT
APPROVE_RECEIPT
REJECT_RECEIPT
VOID_RECEIPT
CREATE_MATERIAL
UPDATE_MATERIAL
DISABLE_MATERIAL
```

## Should have

- Web danh sách phiếu chờ duyệt cho quản lý
- Web lịch sử phiếu cho quản lý/admin
- Màn hình lịch sử phiếu của nhân viên
- Tìm kiếm vật tư
- Hiển thị cảnh báo nghi nhập trùng
- Device ID trong audit log

## Could have

- Export Excel/CSV
- Backup thủ công từ admin dashboard
- iOS TestFlight only if web is not enough later

## Not now

- Offline sync
- Push notification
- IoT
- Camera/QR
- AI
- Advanced analytics
