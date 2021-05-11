/* eslint-disable no-undef */
const { v4: uuid } = require("uuid")
const prisma = require("./prisma")
const REFRESH_TOKEN_COOKIE_OPTIONS = require("./cookiesOptions")

module.exports = async (email) => {
  const refreshToken = uuid()
  const refreshTokenExpiry = new Date(
    Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRY) * 1000
  )

  await prisma.refreshToken.create({
    data: {
      userEmail: email,
      token: refreshToken,
      expiry: refreshTokenExpiry,
    },
  })

  return {
    name: "refreshToken",
    value: refreshToken,
    options: {
      ...REFRESH_TOKEN_COOKIE_OPTIONS,
      expires: refreshTokenExpiry,
    },
  }
}
