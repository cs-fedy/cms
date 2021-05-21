/* eslint-disable linebreak-style */
/* eslint-disable no-unused-vars */
const { ForbiddenError, UserInputError } = require("apollo-server")
const post = require("../../db/post")
const category = require("../../db/category")
const checkAuth = require("../../util/checkAuth")
const { verifyCreatePostArgs } = require("../../util/validator")

module.exports = {
  Query: {
    async getPost(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to get posts")
      const foundPost = await post.getPost(args.id)
      if (!foundPost) throw new UserInputError("wrong post id")
      return foundPost
    },

    async getPosts(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to get posts")
      const posts = await post.getPosts()
      return posts
    },
  },
  Mutation: {
    async createPost(parent, args, context, info) {
      const { roles, email } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to create a post")

      const { valid, errors } = verifyCreatePostArgs(args.createPostInput)
      if (!valid) throw new UserInputError("invalid arguments", { errors })

      const categories = args.createPostInput.map(
        async (categoryLabel) => await category.getCategory(categoryLabel)
      )

      for (let cat of categories) {
        if (!cat)
          throw new UserInputError(
            `wrong category name ${category.categoryLabel}`
          )
      }

      const {
        title,
        content,
      } = args.createPostInput
      const foundPost = await post.createPost({
        userEmail: email,
        title,
        content,
      })

      categories.map(async (cat) => await post.addCategoryToPost(args.id, cat.id))

      return foundPost
    },

    async updatePost(parent, args, context, info) {
      const { roles, email } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to update a post")

      const foundPost = await post.getPost(args.updatePostInput.id)
      if (!foundPost) throw new UserInputError("invalid post id")

      if (foundPost.userEmail != email)
        throw new ForbiddenError("You can't update a post that you don't own")

      const { id, title, content, categories } = args.updatePostInput
      if (categories) {
        const cats = categories.map(async (cat) => await category.getCategory(cat))

        for (let cat of cats) {
          if (!cat)
            throw new UserInputError(
              `wrong category name ${cat.categoryLabel}`
            )
        }

        await category.removeCategoriesFromPost(id)

        for (let category of cats) {
          await category.addCategoryToPost(id, category.id)
        }
      }

      const updatedPost = await post.updatePost({ id, title, content, oldPost: foundPost })

      return updatedPost
    },

    async deletePost(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to update a post")

      const foundPost = await post.getPost(args.postId)
      if (!foundPost) throw new UserInputError("invalid post id")

      await category.removeCategoriesFromPost(args.postId)
      await foundPost.deletePost(args.postId)

      return true
    },
  },
}
