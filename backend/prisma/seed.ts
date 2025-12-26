import { PrismaClient, MembershipType, MembershipStatus } from '@prisma/client';

const prisma = new PrismaClient();

const samplePlayers = [
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@email.com',
    phone: '555-0101',
    membershipType: MembershipType.GOLD,
    membershipStatus: MembershipStatus.ACTIVE,
    classCredits: 0,
    dropInCredits: 0,
  },
  {
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@email.com',
    phone: '555-0102',
    membershipType: MembershipType.DROP_IN,
    membershipStatus: MembershipStatus.ACTIVE,
    classCredits: 0,
    dropInCredits: 8,
  },
  {
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily.rodriguez@email.com',
    phone: '555-0103',
    membershipType: MembershipType.NONE,
    membershipStatus: MembershipStatus.ACTIVE,
    classCredits: 5,
    dropInCredits: 3,
  },
  {
    firstName: 'David',
    lastName: 'Kim',
    email: 'david.kim@email.com',
    phone: '555-0104',
    membershipType: MembershipType.GOLD,
    membershipStatus: MembershipStatus.PAUSED,
    classCredits: 0,
    dropInCredits: 0,
  },
  {
    firstName: 'Jessica',
    lastName: 'Williams',
    email: 'jessica.williams@email.com',
    phone: '555-0105',
    membershipType: MembershipType.DROP_IN,
    membershipStatus: MembershipStatus.ACTIVE,
    classCredits: 0,
    dropInCredits: 12,
  },
  {
    firstName: 'Chris',
    lastName: 'Anderson',
    email: 'chris.anderson@email.com',
    phone: '555-0106',
    membershipType: MembershipType.NONE,
    membershipStatus: MembershipStatus.ACTIVE,
    classCredits: 10,
    dropInCredits: 0,
  },
  {
    firstName: 'Amanda',
    lastName: 'Taylor',
    email: 'amanda.taylor@email.com',
    phone: '555-0107',
    membershipType: MembershipType.GOLD,
    membershipStatus: MembershipStatus.CANCELLED,
    classCredits: 0,
    dropInCredits: 0,
  },
  {
    firstName: 'Ryan',
    lastName: 'Martinez',
    email: 'ryan.martinez@email.com',
    phone: '555-0108',
    membershipType: MembershipType.NONE,
    membershipStatus: MembershipStatus.ACTIVE,
    classCredits: 2,
    dropInCredits: 5,
  },
  {
    firstName: 'Lauren',
    lastName: 'Brown',
    email: 'lauren.brown@email.com',
    phone: '555-0109',
    membershipType: MembershipType.DROP_IN,
    membershipStatus: MembershipStatus.PAUSED,
    classCredits: 0,
    dropInCredits: 4,
  },
  {
    firstName: 'Kevin',
    lastName: 'Lee',
    email: 'kevin.lee@email.com',
    phone: '555-0110',
    membershipType: MembershipType.GOLD,
    membershipStatus: MembershipStatus.ACTIVE,
    classCredits: 0,
    dropInCredits: 0,
  },
  {
    firstName: 'Nicole',
    lastName: 'Garcia',
    email: 'nicole.garcia@email.com',
    phone: '555-0111',
    membershipType: MembershipType.NONE,
    membershipStatus: MembershipStatus.ACTIVE,
    classCredits: 7,
    dropInCredits: 2,
  },
  {
    firstName: 'Brandon',
    lastName: 'Davis',
    email: 'brandon.davis@email.com',
    phone: '555-0112',
    membershipType: MembershipType.DROP_IN,
    membershipStatus: MembershipStatus.ACTIVE,
    classCredits: 0,
    dropInCredits: 15,
  },
];

async function main() {
  console.log('Seeding database with sample players...');

  for (const player of samplePlayers) {
    await prisma.player.upsert({
      where: { email: player.email },
      update: player,
      create: player,
    });
  }

  console.log(`Seeded ${samplePlayers.length} players.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
