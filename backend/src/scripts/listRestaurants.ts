import { prisma } from '../repositories/db';

async function main() {
  const rows = await prisma.restaurant.findMany({ select: { id: true, name: true, address: true } });
  if (!rows.length) {
    console.log('No restaurants found');
    return;
  }
  console.log('Restaurants:');
  rows.forEach(r => console.log(`- id: ${r.id}\n  name: ${r.name}\n  address: ${r.address}\n`));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
