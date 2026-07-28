import { Role } from '@prisma/client';

export type AuthUser = {
  userId: string;
  email: string;
  role: Role;
};
