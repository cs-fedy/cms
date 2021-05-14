const user = require("./user")

module.exports = {
  Query: {
    ...user.Query
  },
  Mutation: {
    ...user.Mutation,
  },
}
