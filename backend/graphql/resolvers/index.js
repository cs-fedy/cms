const user = require("./user")
const prisma = require("../../util/prisma")

module.exports = {
  Query: {
    // eslint-disable-next-line no-unused-vars
    async hello(parent, args, context, info) {
      const users = await prisma.user.find()
      return users
    },
  },
  Mutation: {
    ...user.Mutation,
  },
}
