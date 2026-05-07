const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const hash = await bcrypt.hash('TowneConnect1', 10)
  await prisma.user.upsert({
    where: { username: 'gene' },
    update: {},
    create: {
      name: 'Gene',
      email: 'gene@townebodyshop.com',
      username: 'gene',
      password: hash,
      role: 'ADMIN',
    },
  })

  // Default templates
  const templates = [
    { name: 'Vehicle Ready', body: 'Hi {name}, your vehicle is ready for pickup at Towne Body Shop. Please call us at your convenience!', sortOrder: 1 },
    { name: 'Parts Arrived', body: 'Hi {name}, the parts for your vehicle have arrived. We will begin repairs shortly and keep you updated!', sortOrder: 2 },
    { name: 'Estimate Ready', body: 'Hi {name}, your repair estimate is ready. Please give us a call or stop by to review it at your convenience.', sortOrder: 3 },
    { name: 'Rental Ready', body: 'Hi {name}, your loaner vehicle is ready for pickup at Towne Body Shop. Please bring your drivers license.', sortOrder: 4 },
    { name: 'Rental Due', body: 'Hi {name}, your loaner vehicle is due back today. Please call us if you need an extension.', sortOrder: 5 },
    { name: 'Update', body: 'Hi {name}, just wanted to give you an update — your vehicle is currently in the repair process. We will follow up with a completion estimate soon!', sortOrder: 6 },
  ]

  for (const t of templates) {
    const existing = await prisma.template.findFirst({ where: { name: t.name } })
    if (!existing) {
      await prisma.template.create({ data: t })
    }
  }

  console.log('Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
