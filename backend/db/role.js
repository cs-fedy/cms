/* eslint-disable linebreak-style */
const prisma = require("../lib/prisma")
class Role {
  async getRoles() {
    return await prisma.role.findMany()
  }

  async getRole(roleName) {
    return await prisma.role.findUnique({
      where: { roleName },
    })
  }

  async addRoleToUser(email, roleId) {
    return await prisma.userToRole.create({
      data: {
        userEmail: email,
        roleId,
      },
    })
  }

  async deleteGivenRole(userEmail, roleId) {
    return await prisma.userToRole.delete({
      where: {
        userEmail,
        roleId,
      },
    })
  }
}

module.exports = new Role()
