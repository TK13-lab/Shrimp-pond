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

type SeedMaterial = {
  defaultUnit: string;
  farmId: string;
  name: string;
  note?: string;
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

async function upsertMaterial(material: SeedMaterial): Promise<void> {
  await prisma.material.upsert({
    where: {
      farmId_name_defaultUnit: {
        farmId: material.farmId,
        name: material.name,
        defaultUnit: material.defaultUnit
      }
    },
    update: {
      note: material.note ?? null,
      isActive: true
    },
    create: {
      farmId: material.farmId,
      name: material.name,
      defaultUnit: material.defaultUnit,
      note: material.note ?? null,
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

  const materials: SeedMaterial[] = [
    {
      farmId: farm.id,
      name: 'Thức ăn CP 9001',
      defaultUnit: 'bao'
    },
    {
      farmId: farm.id,
      name: 'Thức ăn Grobest',
      defaultUnit: 'bao'
    },
    {
      farmId: farm.id,
      name: 'Men vi sinh',
      defaultUnit: 'gói'
    },
    {
      farmId: farm.id,
      name: 'Vôi CaCO3',
      defaultUnit: 'kg'
    },
    {
      farmId: farm.id,
      name: 'Khoáng tạt',
      defaultUnit: 'kg'
    },
    {
      farmId: farm.id,
      name: 'Chế phẩm xử lý đáy',
      defaultUnit: 'gói'
    },
    {
      farmId: farm.id,
      name: 'Test kit pH',
      defaultUnit: 'bộ'
    },
    {
      farmId: farm.id,
      name: 'Test kit NH3',
      defaultUnit: 'bộ'
    }
  ];

  for (const material of materials) {
    await upsertMaterial(material);
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
