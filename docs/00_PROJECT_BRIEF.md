# 00 - Project brief

## Tên project

App quản lý ao tôm

## Bối cảnh thực tế

Project được phát triển bởi một người, với Codex hỗ trợ code từng task nhỏ.

Ứng dụng phục vụ quản lý hoạt động ao tôm. Phase 1 tập trung vào quản lý vật tư nhập kho.

Ở ao tôm có:

```text
1 quản lý
4 nhân viên thay nhau nhập liệu
```

Vì nhiều người cùng nhập dữ liệu, app không nên lưu database chính trên từng điện thoại. Database chính phải nằm trên server.

## Mục tiêu nghiệp vụ Phase 1

Xây dựng module **Nhập hàng vật tư**:

- Nhân viên nhập phiếu mua hàng/vật tư
- Quản lý kiểm tra và duyệt phiếu
- Tồn kho chỉ được cập nhật sau khi quản lý duyệt
- Tránh nhập trùng hoặc bấm lưu nhiều lần
- Truy vết được ai nhập, ai duyệt, lúc nào, từ thiết bị nào

## Hàng hóa/vật tư trong Phase 1

Mỗi vật tư cần có:

```text
- Tên
- Số lượng
- Đơn vị tính
- Giá nhập
```

Ở mức phiếu nhập, mỗi phiếu có thể gồm nhiều dòng vật tư.

## Mục tiêu kỹ thuật

```text
Mobile app cài trên điện thoại nhân viên
Backend API quản lý nghiệp vụ
PostgreSQL lưu database chính
Có phân quyền user
Có audit log
Có chống nhập trùng
Có build Android nội bộ
```

## Không làm trong Phase 1

- Không làm AI
- Không làm IoT
- Không làm camera scan hóa đơn
- Không làm báo cáo nâng cao
- Không làm offline sync phức tạp
- Không public App Store/Google Play ngay
- Không làm đa trại quá phức tạp nếu chưa cần

## Thành công của Phase 1 là gì?

Phase 1 thành công khi có thể demo flow:

```text
Đăng nhập nhân viên
→ Tạo phiếu nhập
→ Gửi duyệt
→ Đăng nhập quản lý
→ Duyệt phiếu
→ Tồn kho tăng
→ Xem lịch sử và audit log
```
