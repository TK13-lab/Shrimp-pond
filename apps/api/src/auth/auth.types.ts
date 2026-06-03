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

export type HeaderValue = string | string[] | undefined;

export type HttpRequest = {
  headers: Record<string, HeaderValue>;
  ip?: string | null;
};

export type AuthenticatedRequest = HttpRequest & {
  user?: AuthUserProfile;
};
