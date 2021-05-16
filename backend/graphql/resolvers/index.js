const user = require("./user")
const post = require("./post")
const customResolvers = require("./customResolvers")

module.exports = {
  Query: {
    ...user.Query,
    ...post.Query
  },
  Mutation: {
    ...user.Mutation,
    ...post.Mutation,
  },

  ...customResolvers
}
