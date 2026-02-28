const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Marking all unverified users as verified...");
    const updatedUsers = await prisma.user.updateMany({
        where: {
            emailVerified: null
        },
        data: {
            emailVerified: new Date()
        }
    });
    console.log(`Successfully verified ${updatedUsers.count} users!`);

    const users = await prisma.user.findMany();
    console.log("Current users in DB:");
    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(e => {
        console.error(e)
        // process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    });
