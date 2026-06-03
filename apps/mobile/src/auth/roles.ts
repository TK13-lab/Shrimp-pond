import { AppRole } from './auth.types';

export type MenuEntry = {
  description: string;
  key: string;
  title: string;
};

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên'
};

export const MENU_BY_ROLE: Record<AppRole, MenuEntry[]> = {
  ADMIN: [
    {
      key: 'users',
      title: 'Quản lý người dùng',
      description: 'Tạo tài khoản, khóa tài khoản và phân quyền.'
    },
    {
      key: 'materials',
      title: 'Danh mục vật tư',
      description: 'Xem và cập nhật danh mục vật tư của trại.'
    },
    {
      key: 'receipts',
      title: 'Phiếu nhập',
      description: 'Theo dõi toàn bộ phiếu nhập trong hệ thống.'
    },
    {
      key: 'inventory',
      title: 'Tồn kho',
      description: 'Kiểm tra số lượng tồn và giá trị kho hiện tại.'
    },
    {
      key: 'audit',
      title: 'Audit log',
      description: 'Xem lịch sử thao tác quan trọng của người dùng.'
    }
  ],
  MANAGER: [
    {
      key: 'approvals',
      title: 'Phiếu chờ duyệt',
      description: 'Xem và xử lý các phiếu đang chờ duyệt.'
    },
    {
      key: 'create-receipt',
      title: 'Tạo phiếu nhập',
      description: 'Lập phiếu nhập mới cho vật tư phát sinh.'
    },
    {
      key: 'history',
      title: 'Lịch sử phiếu nhập',
      description: 'Tra cứu các phiếu đã tạo, đã duyệt hoặc bị trả lại.'
    },
    {
      key: 'inventory',
      title: 'Tồn kho',
      description: 'Theo dõi số lượng tồn và giá trị kho hiện tại.'
    },
    {
      key: 'materials',
      title: 'Danh mục vật tư',
      description: 'Xem danh mục vật tư đang hoạt động.'
    },
    {
      key: 'audit',
      title: 'Audit log',
      description: 'Xem lịch sử thao tác trong phạm vi trại.'
    }
  ],
  STAFF: [
    {
      key: 'create-receipt',
      title: 'Tạo phiếu nhập',
      description: 'Tạo phiếu nhập mới và lưu nháp trước khi gửi duyệt.'
    },
    {
      key: 'my-receipts',
      title: 'Phiếu của tôi',
      description: 'Theo dõi các phiếu do bạn đã tạo.'
    },
    {
      key: 'materials',
      title: 'Danh mục vật tư',
      description: 'Xem vật tư đang sử dụng tại trại.'
    }
  ]
};
