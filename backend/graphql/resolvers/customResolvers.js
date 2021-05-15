/* eslint-disable linebreak-style */
/* eslint-disable no-unused-vars */
const prisma = require("../../util/prisma")

module.exports = {
  User: {
    roles: async (parent) => {
      const roles = await prisma.userToRole.findMany({
        where: { userEmail: parent.email },
      })
      return roles.map(role => role.roleId)
    },
  },
}
