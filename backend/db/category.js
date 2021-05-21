/* eslint-disable linebreak-style */
const prisma = require("../util/prisma")

class Category {
  async getCategories() {
    return await prisma.category.findMany()
  }

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

  async createCategory(data) {
    return await prisma.category.create({ data })
  }

  async updateCat(categoryLabel, data) {
    return await prisma.category.update({
      where: { categoryLabel },
      data
    })
  }

  async deleteCategory(categoryLabel) {
    return await prisma.category.delete({
      where: { categoryLabel }
    })
  }
}

module.exports = new Category()
