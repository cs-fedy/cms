const user = require("./user")
const customResolvers = require("./customResolvers")

module.exports = {
  Query: {
    ...user.Query
  },
  Mutation: {
    ...user.Mutation,
  },

  ...customResolvers
}
