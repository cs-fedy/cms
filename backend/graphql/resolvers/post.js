/* eslint-disable linebreak-style */
/* eslint-disable no-unused-vars */
const { ForbiddenError, UserInputError } = require("apollo-server")
const checkAuth = require("../../util/checkAuth")
const prisma = require("../../util/prisma")
const { verifyCreatePostArgs } = require("../../util/validator")

module.exports = {
  Query: {
    async getPost(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to get posts")

      const post = await prisma.post.findUnique({
        where: { id: args.id },
      })

      if (!post) throw new UserInputError("wrong post id")
      return post
    },

    async getPosts(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to get posts")

      const posts = await prisma.post.findMany()
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

      const categories = args.createPostInput.map(async (category) => {
        const cat = await prisma.category.findUnique({
          where: { categoryLabel: category },
        })
        return cat
      })

      for (let category of categories) {
        if (!category)
          throw new UserInputError(
            `wrong category name ${category.categoryLabel}`
          )
      }

      const {
        title,
        content,
        categories: inputCategories,
      } = args.createPostInput
      const post = await prisma.post.create({
        data: {
          userEmail: email,
          title,
          content,
        },
      })

      inputCategories.map(async (category) => {
        await prisma.postToCategory.create({
          data: {
            postId: post.id,
            categoryId: category,
          },
        })
      })

      return post
    },

    async updatePost(parent, args, context, info) {
      const { roles, email } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to update a post")

      const user = await prisma.user.findUnique({
        where: { email },
      })
      if (!user) throw new UserInputError("Wrong user")

      const post = await prisma.post.findUnique({
        where: { id: args.updatePostInput.id },
      })

      if (!post) throw new UserInputError("invalid post id")
      if (post.userEmail != email)
        throw new ForbiddenError("You can't update a post that you don't own")

      const { id, title, content, categories } = args.updatePostInput
      if (categories) {
        const cats = categories.map(async (category) => {
          const cat = await prisma.category.findUnique({
            where: { categoryLabel: category },
          })
          return cat
        })

        for (let category of cats) {
          if (!category)
            throw new UserInputError(
              `wrong category name ${category.categoryLabel}`
            )
        }

        await prisma.postToCategory.deleteMany({
          where: { postId: id },
        })

        for (let category of cats) {
          await prisma.postToCategory.create({
            data: {
              postId: id,
              categoryId: category.categoryLabel,
            },
          })
        }
      }

      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          title: title && title.trim() != "" ? title : post.title,
          content: content && content.trim() != "" ? content : post.content,
        },
      })

      return updatedPost
    },

    async deletePost(parent, args, context, info) {
      const { roles, email } = checkAuth(context.req)
      if (roles.includes("NOT_AUTHORIZED"))
        throw new ForbiddenError("You are not authorized to update a post")

      const user = await prisma.user.findUnique({
        where: { email },
      })
      if (!user) throw new UserInputError("Wrong user")

      const post = await prisma.post.findUnique({
        where: { id: args.postId },
      })
      if (!post) throw new UserInputError("invalid post id")
      
      await prisma.postToCategory.deleteMany({
        where: { postID: args.postId }
      })

      await prisma.post.delete({
        where: { id: args.postId }
      })

      return true
    }
  },
}
