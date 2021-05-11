const prisma = require("../util/prisma")
const refreshUserRouter = require("express").Router()
const REFRESH_TOKEN_COOKIE_OPTIONS = require("../util/cookiesOptions")

refreshUserRouter.post("/", (req, res) => {
  const { refreshToken } = req.cookies
  const { email } = checkAuth(req)
  if (!refreshToken) throw new UserInputError("No refresh token provided")

  const isValidEmail = verifyEmail(email || "")
  if (!isValidEmail) throw new ForbiddenError("Invalid email format")

  const foundUser = await prisma.user.findUnique({
    where: { email },
  })
  if (!foundUser) throw new ForbiddenError("Invalid user")

  //* delete all expired refresh tokens
  await prisma.refreshToken.deleteMany({
    where: {
      userEmail: email,
      expiry: { lt: new Date(Date.now()) },
    },
  })

  //* refresh the token
  const newRefreshToken = uuid()
  const newRefreshTokenExpiry = new Date(
    Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRY) * 1000
  )

  try {
    await prisma.refreshToken.update({
      where: {
        userEmail_token: {
          userEmail: email,
          token: refreshToken,
        },
      },
      data: {
        token: newRefreshToken,
        expiry: newRefreshTokenExpiry,
      },
    })
  } catch (error) {
    throw new ForbiddenError("Refresh token is invalid or expired")
  }

  res.cookie("refreshToken", newRefreshToken, {
    ...REFRESH_TOKEN_COOKIE_OPTIONS,
    expires: newRefreshTokenExpiry,
  })

  const newToken = await jwt.sign(
    { email: foundUser.email },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
    }
  )
  
  return res.status(201).json({ token: newToken })
})

module.exports = refreshUserRouter
