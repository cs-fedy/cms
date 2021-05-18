/* eslint-disable linebreak-style */
const prisma = require("../util/prisma")

class Category {
  async getCategory(categoryLabel) {
    return await prisma.category.findUnique({
      where: { categoryLabel },
    })
  }

  async addCategoryToPost(postId, categoryId) {
    return await prisma.postToCategory.create({
      data: {
        postId,
        categoryId,
      },
    })
  }

  async removeCategoriesFromPost(postId) {
    return await prisma.postToCategory.deleteMany({
      where: { postId },
    })
  }
}

module.exports = new Category()
