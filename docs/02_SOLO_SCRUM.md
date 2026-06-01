# 02 - Solo Scrum

Project này chỉ có một người làm, nên dùng Scrum-lite / Solo Scrum.

## Vai trò

### Product Owner

Do chính bạn đảm nhiệm.

Quyết định:

- Chức năng nào làm trước
- Nghiệp vụ nào đúng thực tế ao tôm
- Tính năng nào để sau
- Giao diện có đủ dễ dùng không

### Scrum Master

Do chính bạn đảm nhiệm.

Theo dõi:

- Sprint có quá rộng không
- Task có rõ để Codex làm không
- Có bị scope creep không
- Có đang làm UI quá sớm không

### Developer

Bạn là developer chính. Codex là trợ lý code.

Codex có thể:

- Tạo project
- Tạo schema
- Viết API
- Viết màn hình
- Sửa lỗi
- Viết test

Bạn phải:

- Review code
- Chạy app
- Test nghiệp vụ
- Quyết định đúng/sai
- Không để Codex tự mở rộng scope

## Sprint length

Vì chỉ có một người:

```text
1 sprint = 3 đến 5 ngày
1 ngày = 1 đến 3 task nhỏ
Mỗi task phải có output rõ ràng
```

## Daily Scrum cá nhân

Mỗi ngày trả lời 3 câu:

```text
Hôm qua đã làm gì?
Hôm nay làm gì?
Đang bị kẹt ở đâu?
```

Ghi vào `docs/14_DAILY_LOG_TEMPLATE.md`.

## Sprint Review cá nhân

Cuối sprint tự demo:

```text
Flow chạy được không?
Có đúng nghiệp vụ không?
Dữ liệu có lưu đúng server không?
Phân quyền có đúng không?
Có bug nào nghiêm trọng không?
```

## Sprint Retrospective cá nhân

Cuối sprint ghi:

```text
Cái gì làm tốt?
Cái gì mất thời gian?
Sprint sau cần thay đổi gì?
```

## Nguyên tắc làm việc với Codex

Không prompt:

```text
Làm toàn bộ app quản lý ao tôm.
```

Nên prompt:

```text
Create NestJS auth module with login endpoint, JWT guard, roles guard, and password hashing.
Do not create mobile screens yet.
```

Mỗi prompt chỉ nên yêu cầu:

- Một module
- Một màn hình
- Một nhóm API
- Một bug fix
- Một refactor nhỏ

## Git sau mỗi bước

Sau mỗi task nhỏ đã hoàn thành và kiểm tra xong, phải commit local và push lên GitHub.

Remote của dự án:

```text
git@github.com:TK13-lab/Shrimp-pond.git
```

Lệnh chuẩn:

```bash
git add .
git commit -m "<type>(scope): <short description>"
git push origin main
```

Không commit `.env`, secret, raw data, log nặng, cache, hoặc output lớn.
