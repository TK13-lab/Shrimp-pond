import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

type SeedUser = {
  farmId: string | null;
  fullName: string;
  password: string;
  phone?: string;
  role: Role;
  username: string;
};

async function upsertUser(user: SeedUser): Promise<void> {
  const passwordHash = await hash(user.password, 10);

  await prisma.user.upsert({
    where: {
      username: user.username
    },
    update: {
      farmId: user.farmId,
      fullName: user.fullName,
      phone: user.phone ?? null,
      passwordHash,
      role: user.role,
      isActive: true
    },
    create: {
      farmId: user.farmId,
      fullName: user.fullName,
      username: user.username,
      phone: user.phone ?? null,
      passwordHash,
      role: user.role,
      isActive: true
    }
  });
}

async function main(): Promise<void> {
  const existingFarm = await prisma.farm.findFirst({
    where: {
      name: 'Trại tôm demo'
    }
  });

  const farm =
    existingFarm ??
    (await prisma.farm.create({
      data: {
        name: 'Trại tôm demo',
        address: 'Chưa cấu hình',
        isActive: true
      }
    }));

  if (existingFarm) {
    await prisma.farm.update({
      where: {
        id: existingFarm.id
      },
      data: {
        address: 'Chưa cấu hình',
        isActive: true
      }
    });
  }

  const users: SeedUser[] = [
    {
      username: 'admin',
      password: 'Admin@123',
      fullName: 'Admin Demo',
      role: Role.ADMIN,
      farmId: null
    },
    {
      username: 'manager1',
      password: 'Manager@123',
      fullName: 'Manager Demo',
      role: Role.MANAGER,
      farmId: farm.id
    },
    {
      username: 'staff1',
      password: 'Staff@123',
      fullName: 'Staff 1',
      role: Role.STAFF,
      farmId: farm.id
    },
    {
      username: 'staff2',
      password: 'Staff@123',
      fullName: 'Staff 2',
      role: Role.STAFF,
      farmId: farm.id
    },
    {
      username: 'staff3',
      password: 'Staff@123',
      fullName: 'Staff 3',
      role: Role.STAFF,
      farmId: farm.id
    },
    {
      username: 'staff4',
      password: 'Staff@123',
      fullName: 'Staff 4',
      role: Role.STAFF,
      farmId: farm.id
    }
  ];

  for (const user of users) {
    await upsertUser(user);
  }
}

main()
  .catch(async (error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
