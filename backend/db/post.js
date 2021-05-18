/* eslint-disable linebreak-style */
const prisma = require("../util/prisma")

class Post {
  async getPosts() {
    return await prisma.post.findMany()
  }

  async getPost(postId) {
    return await prisma.post.findUnique({
      where: { id: postId },
    })
  }

  async createPost(data) {
    return await prisma.post.create({ data })
  }

  async updatePost({ id, title, content, oldPost }) {
    return await prisma.post.update({
      where: { id },
      data: {
        title: title && title.trim() != "" ? title : oldPost.title,
        content: content && content.trim() != "" ? content : oldPost.content,
      },
    })
  }

  async deletePost(postId) {
    return await prisma.post.delete({
      where: { id: postId },
    })
  }
}

module.exports = new Post()
