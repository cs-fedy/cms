/* eslint-disable linebreak-style */
const prisma = require("../lib/prisma")

class User {
  async getUsers() {
    return await prisma.user.findMany()
  }

  async getUser(userEmail, options = null) {
    options = options === null ? {} : options
    return await prisma.user.findUnique({
      where: { email: userEmail },
      include: options,
    })
  }

  async getUnauthorizedUsers() {
    return await prisma.user.findMany({
      where: {
        roles: { some: { roleId: "NOT_AUTHORIZED" } },
      },
    })
  }

  async createUser(user) {
    const { fullName, email, password, profilePictureURL } = user
    return await prisma.user.create({
      data: {
        fullName,
        email,
        password,
        profilePictureURL,
      },
    })
  }

  async updateUser(email, data) {
    return await prisma.user.update({
      where: { email },
      data,
    })
  }
}

module.exports = new User()
