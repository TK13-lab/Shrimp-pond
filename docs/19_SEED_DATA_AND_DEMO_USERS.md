# 19 - Seed data and demo users

## Demo farm

```text
Name: Trại tôm demo
Address: Chưa cấu hình
```

## Demo users

### Admin

```text
username: admin
password: Admin@123
role: ADMIN
```

### Manager

```text
username: manager1
password: Manager@123
role: MANAGER
```

### Staff

```text
username: staff1
password: Staff@123
role: STAFF

username: staff2
password: Staff@123
role: STAFF

username: staff3
password: Staff@123
role: STAFF

username: staff4
password: Staff@123
role: STAFF
```

## Demo materials

```text
Thức ăn CP 9001 | bao
Thức ăn Grobest | bao
Men vi sinh | gói
Vôi CaCO3 | kg
Khoáng tạt | kg
Chế phẩm xử lý đáy | gói
Test kit pH | bộ
Test kit NH3 | bộ
```

## Demo receipt

Supplier:

```text
Đại lý vật tư A
```

Items:

```text
Thức ăn CP 9001 | 10 bao | 450000
Men vi sinh | 5 gói | 120000
Vôi CaCO3 | 50 kg | 8000
```

Expected total:

```text
10*450000 + 5*120000 + 50*8000 = 5500000
```

## Important

Demo passwords are for local development only.

Before real deployment:

```text
Change all passwords
Use strong JWT secret
Use real database password
Do not expose seed passwords in production logs
```
