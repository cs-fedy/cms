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

  Post: {
    categories: async (parent) => {
      const post = await prisma.post.findUnique({
        where: { id: parent.id },
        include: {
          categories: {
            select: { categoryId: true }
          }
        }
      })
      return post.categories.map(category => category.categoryId)
    }
  }
}
