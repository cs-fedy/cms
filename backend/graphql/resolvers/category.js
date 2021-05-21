/* eslint-disable linebreak-style */
/* eslint-disable no-unused-vars */
const { ForbiddenError, UserInputError } = require("apollo-server")
const categories = require("../../db/category")
const checkAuth = require("../../util/checkAuth")
const { verifyCatArgs, verifyString } = require("../../util/validator")

module.exports = {
  Query: {
    async getCats(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to get categories")
      const cats = await categories.getCategories()
      return cats
    },
  },
  Mutation: {
    async createCat(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to create a category")
      const { valid, errors } = verifyCatArgs(args.catInput)
      if (!valid) throw new UserInputError("invalid arguments", { errors })
      const cat = await categories.getCategory(args.catInput.categoryLabel)
      if (cat) throw new UserInputError("category already exist")
      const createdCat = await categories.createCategory(args.catInput)
      return createdCat
    },
    
    async updateCat(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to create a category")
      const { categoryId, newCategoryLabel, newCategoryDescription} = args.updateCatInput
      const cat = await categories.getCategory(categoryId)
      if (!cat) throw new UserInputError("category doesn't exist")
      try {
        const updatedCategory = await categories.updateCat(categoryId, {
          categoryLabel: newCategoryLabel? newCategoryLabel: cat.categoryLabel,
          categoryDescription: newCategoryDescription? newCategoryDescription: cat.categoryDescription
        })
        return updatedCategory
      } catch (error) {
        throw new UserInputError("invalid input", { categoryId: "invalid category id"})
      }

    },

    async deleteCat(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to create a category")
      const cat = await categories.getCategory(args.catId)
      if (!cat) throw new UserInputError("category doesn't exist")
      await categories.deleteCategory(args.catId)
      return true
    },
  },
}
