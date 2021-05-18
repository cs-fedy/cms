const { PrismaClient } = require("@prisma/client")

const roles = [
  {
    roleName: "ADMIN",
    roleDescription: "who have this role can manage the dashboard",
  },
  {
    roleName: "USER",
    roleDescription:
      "who have this role can't manage the dashboard. he's allowed to do just some basic stuff",
  },
  {
    roleName: "NOT_AUTHORIZED",
    roleDescription:
      "who have this role doesn't have access to the dashboard. He can be granted to a user by an ADMIN",
  },
]

const userToRole = [
  {
    userEmail: "fedi.abd01@gmail.com",
    roleId: "ADMIN",
  },
]

//* seeding the db
const prisma = new PrismaClient()
const seedDb = async () => {
  await prisma.role.createMany({ data: roles })
  await prisma.userToRole.createMany({ data: userToRole })
}

// eslint-disable-next-line no-unused-vars
const rollBackDb = async () => {
  // TODO: implement roll back db function
}

seedDb().catch((error) => {
  console.error(error)
  // eslint-disable-next-line no-undef
  process.exit(1)
})
