const user = require("./user")
const post = require("./post")
const customResolvers = require("./customResolvers")
const category = require("./category")

module.exports = {
  Query: {
    ...user.Query,
    ...post.Query,
    ...category.Query
  },
  Mutation: {
    ...user.Mutation,
    ...post.Mutation,
    ...category.Mutation
  },

  ...customResolvers
}
