/* eslint-disable linebreak-style */
const prisma = require("../util/prisma")

class RefreshToken {
  async deleteRefreshToken(userEmail, token) {
    return await prisma.refreshToken.delete({
      where: {
        userEmail_token: { userEmail, token },
      },
    })
  }

  async deleteExpiredRefreshTokens(userEmail, expiry) {
    // TODO: test deleting expired tokens
    return await prisma.refreshToken.deleteMany({
      where: { userEmail, expiry },
    })
  }

  async deleteRefreshTokens(email) {
    return await prisma.refreshToken.deleteMany({
      where: { email },
    })
  }

  async updateRefreshToken(condition, data) {
    return await prisma.refreshToken.update({
      where: condition,
      data,
    })
  }
}

module.exports = new RefreshToken()
