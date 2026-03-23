import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding plans...')

  const freePlan = await prisma.plan.upsert({
    where: { name: 'FREE' },
    update: {
      price: 0,
      currency: 'Bs',
      limits: {
        maxStaff: 1,
        maxMonthlyAppointments: 20,
        features: []
      }
    },
    create: {
      name: 'FREE',
      price: 0,
      currency: 'Bs',
      limits: {
        maxStaff: 1,
        maxMonthlyAppointments: 20,
        features: []
      }
    }
  })

  const proPlan = await prisma.plan.upsert({
    where: { name: 'PRO' },
    update: {
      price: 8,
      currency: 'USD',
      limits: {
        maxStaff: 1,
        maxMonthlyAppointments: 999999,
        features: ['stats', 'push_notifications', 'promotions']
      }
    },
    create: {
      name: 'PRO',
      price: 8,
      currency: 'USD',
      limits: {
        maxStaff: 1, // Es independiente
        maxMonthlyAppointments: 999999,
        features: ['stats', 'push_notifications', 'promotions']
      }
    }
  })

  const teamPlan = await prisma.plan.upsert({
    where: { name: 'TEAM' },
    update: {
      price: 5,
      currency: 'USD',
      limits: {
        maxStaff: 10,
        maxMonthlyAppointments: 999999,
        features: ['stats', 'push_notifications', 'promotions', 'unified_agenda', 'staff_control']
      }
    },
    create: {
      name: 'TEAM',
      price: 5,
      currency: 'USD',
      limits: {
        maxStaff: 10,
        maxMonthlyAppointments: 999999,
        features: ['stats', 'push_notifications', 'promotions', 'unified_agenda', 'staff_control']
      }
    }
  })

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
