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
} = require("../../util/validator")
const checkAuth = require("../../util/checkAuth")
const generateRefreshToken = require("../../util/refreshToken")
const REFRESH_TOKEN_COOKIE_OPTIONS = require("../../util/cookiesOptions")
const addToBlackList = require("../../util/blackList")
const transport = require("../../util/nodeMailerTransport")

module.exports = {
  Query: {
    async getUsers(parent, args, context, info) {
      const userData = checkAuth(context.req)
      const users = await prisma.user.findMany()
      return users.map((user) => ({
        ...user,
        password: "GOT YA HHHH NICE TRY",
        token: "not specified",
      }))
    },

    async getUser(parent, args, context, info) {
      const userData = checkAuth(context.req)
      const user = await prisma.user.findUnique({
        where: { email: args.email },
      })

      return {
        ...user,
        password: "GOT YA HHHH NICE TRY",
        token: "not specified",
      }
    },

    async getUnauthorizedUsers(parent, args, context, info) {
      const { email } = checkAuth(context.req)
      
      const foundUser = await prisma.user.findUnique({
        where: { email },
      })
      if (!foundUser) throw new ForbiddenError("Invalid user")

      const userRole = await prisma.userToRole.findUnique({
        where: { email }
      })
      
      if (userRole.roleId !== "ADMIN") throw new ForbiddenError("You are not an ADMIN")
      // TODO: get unauthorized users
      // TODO: return users
    },
  },

  Mutation: {
    async signup(parent, args, context, info) {
      const { signupInput } = args
      const { valid, errors } = serverSignupInputValidator(signupInput)
      if (!valid) {
        throw new UserInputError("invalid credentials", { errors })
      }

      const { email, fullName, password, profilePictureURL } = signupInput
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

      context.setCookies.push(await generateRefreshToken(email))

      const token = await jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "15m",
      })
      return { token }
    },

    async login(parent, args, context, info) {
      const { loginInput } = args
      const { valid, errors } = serverLoginInputValidator(loginInput)
      if (!valid) {
        throw new UserInputError("invalid credentials", { errors })
      }

      const { email, password } = loginInput
      const user = await prisma.user.findUnique({
        where: {
          email,
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

      const token = await jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "15m",
      })

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

      const newToken = await jwt.sign(
        { email: foundUser.email },
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
      // TODO: debug sending the email
      try {
        //* send mail with defined transport object
        await transport.sendMail({
          from: process.env.MAIL_USERNAME, // sender address
          to: email, // list of receivers
          subject: "cms reset password code", // Subject line
          text: `hello ${email} this is your code ${resetPasswordCode}`, // plain text body
        })
        transport.close()
      } catch (error) {
        throw Error("Error while sending reset password code email")
      }

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

    // TODO: debug delete account
    async deleteUser(parent, args, context, info) {
      const { email, token, exp } = checkAuth(context.req)

      const user = await prisma.user.findUnique({
        where: { email },
      })
      if (!user) throw new UserInputError("Wrong credentials")

      const deleteUserPosts = prisma.post.deleteMany({
        where: { userEmail: email },
      })
      const deleteUserRoles = prisma.post.userToRole({
        where: { userEmail: email },
      })
      const deleteUserRefreshTokens = prisma.post.refreshToken({
        where: { userEmail: email },
      })
      await Promise.all([deleteUserPosts, deleteUserRoles, deleteUserRefreshTokens])
      
      //* delete the user
      await prisma.user.delete({
        where: { email },
      })

      //* add access token to the black list
      await addToBlackList(token, email, exp)

      //* return true if sign out is done
      return true
    },
    // TODO ---------
    //* - admin can add other users to the dashboard with the specific roles
    //* - when a new account is created, it must be verified by an admin with the 'ADMIN' role
    // TODO ---------
  },
}
