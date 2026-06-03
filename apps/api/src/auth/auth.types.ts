import { Role } from '@prisma/client';

export type AuthUserProfile = {
  farmId: string | null;
  fullName: string;
  id: string;
  role: Role;
  username: string;
};

export type AccessTokenPayload = {
  farmId: string | null;
  role: Role;
  sub: string;
  username: string;
};
