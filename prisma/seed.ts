import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding plans...')
  
  const freePlan = await prisma.plan.upsert({
    where: { name: 'FREE' },
    update: {},
    create: {
      name: 'FREE',
      price: 0,
      currency: 'USD',
      limits: {
        maxStaff: 1,
        maxMonthlyAppointments: 30,
        features: []
      }
    }
  })

  const proPlan = await prisma.plan.upsert({
    where: { name: 'PRO' },
    update: {},
    create: {
      name: 'PRO',
      price: 15,
      currency: 'USD',
      limits: {
        maxStaff: 5,
        maxMonthlyAppointments: 500,
        features: ['stats', 'push_notifications']
      }
    }
  })

  console.log({ freePlan, proPlan })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
