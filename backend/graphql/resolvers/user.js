/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const {
  ForbiddenError,
  UserInputError,
  AuthenticationError,
} = require("apollo-server")
const jwt = require("jsonwebtoken")
const { v4: uuid } = require("uuid")
const bcrypt = require("bcrypt")
const hash = require("../../util/hash")
const redis = require("../../util/redis")
const prisma = require("../../util/prisma")
const {
  serverSignupInputValidator,
  serverLoginInputValidator,
  resetPasswordInputValidator,
  verifyEmail,
} = require("../../util/validator")
const checkAuth = require("../../util/checkAuth")
const generateRefreshToken = require("../../util/refreshToken")
const REFRESH_TOKEN_COOKIE_OPTIONS = require("../../util/cookiesOptions")
const addToBlackList = require("../../util/blackList")
const sendEmail = require("../../util/sendEmail")

module.exports = {
  Query: {
    async getUsers(parent, args, context, info) {
      const userData = checkAuth(context.req)
      const users = await prisma.user.findMany()
      return users
    },

    async getUser(parent, args, context, info) {
      const userData = checkAuth(context.req)
      const user = await prisma.user.findUnique({
        where: { email: args.email },
      })
      return user
    },

    async getUnauthorizedUsers(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (!roles.includes("ADMIN"))
        throw new ForbiddenError("You are not an ADMIN")
      const unauthorizedUsers = await prisma.user.findMany({
        where: {
          roles: { some: { roleId: "NOT_AUTHORIZED" } },
        },
      })

      return unauthorizedUsers
    },

    async getRoles(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (!roles.includes("ADMIN"))
        throw new ForbiddenError("You are not an ADMIN")

      const savedRoles = await prisma.role.findMany()
      return savedRoles
    },
  },

  Mutation: {
    async signup(parent, args, context, info) {
      const { valid, errors } = serverSignupInputValidator(args.signupInput)
      if (!valid) {
        throw new UserInputError("invalid credentials", { errors })
      }

      const { email, fullName, password, profilePictureURL } = args.signupInput
      const isRegistered = await prisma.user.findUnique({
        where: { email },
      })
      if (isRegistered) {
        errors.email = "email already taken"
        throw new UserInputError("username is taken", { errors })
      }

      const hashedPassword = await hash(password)

      let newProfilePictureURL = profilePictureURL
      if (!profilePictureURL) {
        //* if profilePictureURL isn't provided return the first letter of the full name
        newProfilePictureURL = fullName[0].toUpperCase()
      }

      await prisma.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          profilePictureURL: newProfilePictureURL,
        },
      })

      //* give the user a default role: NOT_AUTHORIZED
      await prisma.userToRole.create({
        data: {
          userEmail: email,
          roleId: "NOT_AUTHORIZED",
        },
      })

      context.setCookies.push(await generateRefreshToken(email))

      const token = await jwt.sign(
        { email, roles: ["NOT_AUTHORIZED"] },
        process.env.JWT_SECRET,
        {
          expiresIn: "15m",
        }
      )
      return { token }
    },

    async login(parent, args, context, info) {
      const { valid, errors } = serverLoginInputValidator(args.loginInput)
      if (!valid) {
        throw new UserInputError("invalid credentials", { errors })
      }

      const { email, password } = args.loginInput
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          roles: {
            select: { roleId: true },
          },
        },
      })
      if (!user) {
        errors.global = "Wrong credentials"
        throw new UserInputError("Wrong credentials", { errors })
      }

      const validPassword = await bcrypt.compare(password, user.password)
      if (!validPassword) {
        errors.global = "Wrong credentials"
        throw new UserInputError("Wrong credentials", { errors })
      }

      context.setCookies.push(await generateRefreshToken(email))

      const userRoles = user.roles.map((role) => role.roleId)
      const token = await jwt.sign(
        { email, roles: userRoles },
        process.env.JWT_SECRET,
        {
          expiresIn: "15m",
        }
      )

      return { token }
    },

    async logout(parent, args, context, info) {
      const { refreshToken, setCookies, req } = context
      const { email, exp, token } = checkAuth(req)
      if (!refreshToken) throw new UserInputError("No refresh token provided")

      const foundUser = await prisma.user.findUnique({
        where: { email },
      })
      if (!foundUser) throw new ForbiddenError("Invalid user")

      //* delete refresh token if exist
      try {
        await prisma.refreshToken.delete({
          where: {
            userEmail_token: { userEmail: email, token: refreshToken },
          },
        })
      } catch (error) {
        throw new ForbiddenError("Invalid refresh token")
      }

      //* clear cookies list
      // TODO: debug deleting cookies
      setCookies.splice(0, setCookies.length)

      //* add access token to the black list
      await addToBlackList(token, email, exp)

      //* return true if sign out is done
      return true
    },

    async refreshUser(parent, args, context, info) {
      const { refreshToken, req, setCookies } = context
      const { email, token, exp } = checkAuth(req)
      if (!refreshToken) throw new UserInputError("No refresh token provided")

      const foundUser = await prisma.user.findUnique({
        where: { email },
        include: {
          roles: { select: { roleId: true } },
        },
      })
      if (!foundUser) throw new ForbiddenError("Invalid user")

      //* delete all expired refresh tokens
      // TODO: test deleting expired tokens
      await prisma.refreshToken.deleteMany({
        where: {
          userEmail: email,
          expiry: { lt: new Date(Date.now()) },
        },
      })

      //* Create new refresh token
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

      setCookies.push({
        name: "refreshToken",
        value: newRefreshToken,
        ...REFRESH_TOKEN_COOKIE_OPTIONS,
        expires: newRefreshTokenExpiry,
      })

      //* add old access token to the black list
      await addToBlackList(token, email, exp)

      const userRoles = foundUser.roles.map((role) => role.roleId)
      const newToken = await jwt.sign(
        { email: foundUser.email, roles: userRoles },
        process.env.JWT_SECRET,
        {
          expiresIn: "15m",
        }
      )

      return { token: newToken }
    },

    async requestReset(parent, args, context, info) {
      const { email } = args
      const foundUser = await prisma.user.findUnique({
        where: { email },
      })
      if (!foundUser) throw new ForbiddenError("Invalid user")

      //* reset password code
      const resetPasswordCode = uuid()
      const resetPasswordCodeExpiry = new Date(
        Date.now() + parseInt(process.env.RESET_PASSWORD_CODE_EXPIRY) * 1000
      )

      //* Adds resetToken and resetTokenExpiry to the user in the db(redis)
      await redis.set(resetPasswordCode, resetPasswordCodeExpiry)

      //* Sends an email to the user that has the token
      await sendEmail(
        email,
        "cms reset password code",
        `hello ${email} this is your code ${resetPasswordCode}`
      )

      //* if success return code expiry date
      return { expiry: resetPasswordCodeExpiry }
    },

    async resetPassword(parent, args, context, info) {
      const { errors, valid } = resetPasswordInputValidator(
        args.resetPasswordInput
      )
      if (!valid) {
        throw new UserInputError("invalid credentials", { errors })
      }

      const { email, password, resetCode } = args.resetPasswordInput
      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      })
      if (!user) {
        errors.global = "Wrong credentials"
        throw new UserInputError("Wrong credentials", { errors })
      }

      //* check reset password code in redis db
      redis.get(resetCode, async (err, res) => {
        if (err) throw new AuthenticationError("Invalid/Expired code")
        if (res < Date.now()) {
          await redis.del(resetCode)
          throw new AuthenticationError("Invalid/Expired code")
        }
      })

      const newHashedPassword = await hash(password)

      try {
        await prisma.user.update({
          where: { email },
          data: { password: newHashedPassword },
        })
      } catch (error) {
        throw new Error("Error while changing ur password")
      }

      //* invalidate all refresh tokens
      // TODO: debug deleting refresh tokens
      try {
        await prisma.refreshToken.deleteMany({
          where: { email },
        })
      } catch {}

      //* Return true if resetPassword succeed
      return true
    },

    //* - when a new account is created, it must be verified by an admin with the 'ADMIN' role
    async giveUserRole(parent, args, context, info) {
      const { email, roles } = checkAuth(context.req)
      if (!roles.includes("ADMIN"))
        throw new ForbiddenError("You are not an ADMIN")

      const { userEmail: inputEmail, role: inputRole } = args.roleInput
      const isValidEmail = verifyEmail(inputEmail)
      if (!isValidEmail) throw new ForbiddenError("Invalid email format")
      const isValidRole = await prisma.role.findUnique({
        where: { roleName: inputRole },
      })
      if (!isValidRole) throw new UserInputError("undefined Role")

      const user = await prisma.user.findUnique({
        where: { email: inputEmail },
        include: {
          roles: {
            select: { roleId: true },
          },
        },
      })
      if (!user) throw new ForbiddenError("Invalid user")

      const userRoles = user.roles.map((role) => role.roleId)
      if (userRoles.includes(inputRole))
        throw new UserInputError(`User already have the role ${inputRole}`)

      await prisma.userToRole.create({
        data: {
          userEmail: inputEmail,
          roleId: inputRole,
        },
      })

      if (userRoles.includes("NOT_AUTHORIZED")) {
        await prisma.userToRole.delete({
          where: {
            userEmail: inputEmail,
            roleId: "NOT_AUTHORIZED"
          }
        })
      }

      //* notify the user with his new role
      await sendEmail(
        inputEmail,
        "new granted role",
        `hello ${inputEmail} - ${email} granted you the ${inputRole} role. You can now login to the dashboard`
      )

      return true
    },
  },
}
