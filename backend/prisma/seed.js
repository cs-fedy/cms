const { PrismaClient } = require("@prisma/client")

const permissions = [
  {
    permissionName: "MANAGE_USER",
    permissionDescription:
      "who have this permission can manage users to the dashboard",
  },
  {
    permissionName: "MANAGE_BLOG",
    permissionDescription:
      "who have this permission can get, update, delete and create a blog",
  },
  {
    permissionName: "MANAGE_CATEGORY",
    permissionDescription: "who have this permission can manage categories",
  },
]

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

const roleToPermission = [
  {
    roleId: "ADMIN",
    permissionId: "MANAGE_USER",
  },
  {
    roleId: "ADMIN",
    permissionId: "MANAGE_BLOG",
  },
  {
    roleId: "ADMIN",
    permissionId: "MANAGE_CATEGORY",
  },
  {
    roleId: "USER",
    permissionId: "MANAGE_BLOG",
  },
  {
    roleId: "USER",
    permissionId: "MANAGE_CATEGORY",
  },
]

//* seeding the db
const prisma = new PrismaClient()
const seedDb = async () => {
  await prisma.permission.createMany({ data: permissions })
  await prisma.role.createMany({ data: roles })
  await prisma.userToRole.createMany({ data: userToRole })
  await prisma.roleToPermission.createMany({ data: roleToPermission })
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
