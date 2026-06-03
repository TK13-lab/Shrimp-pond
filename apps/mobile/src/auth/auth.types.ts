export type AppRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export type AuthUser = {
  farmId: string | null;
  fullName: string;
  id: string;
  role: AppRole;
  username: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type LoginInput = {
  password: string;
  username: string;
};
