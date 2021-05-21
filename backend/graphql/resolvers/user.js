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
const user = require("../../db/user")
const role = require("../../db/role")
const refreshToken = require("../../db/refreshToken")

module.exports = {
  Query: {
    async getUsers(parent, args, context, info) {
      const userData = checkAuth(context.req)
      const users = await user.getUsers()
      return users
    },

    async getUser(parent, args, context, info) {
      const userData = checkAuth(context.req)
      const foundUser = await user.getUser(args.email)
      if (!foundUser) throw new UserInputError("user doesn't exist")
      return foundUser
    },

    async getUnauthorizedUsers(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (!roles.includes("ADMIN"))
        throw new ForbiddenError("You are not an ADMIN")
      const unauthorizedUsers = await user.getUnauthorizedUsers()
      return unauthorizedUsers
    },

    async getRoles(parent, args, context, info) {
      const { roles } = checkAuth(context.req)
      if (!roles.includes("ADMIN"))
        throw new ForbiddenError("You are not an ADMIN")
      const savedRoles = await role.getRoles()
      return savedRoles
    },
  },

  Mutation: {
    async signup(parent, args, context, info) {
      const { valid, errors } = serverSignupInputValidator(args.signupInput)
      if (!valid) throw new UserInputError("invalid credentials", { errors })
      const { email, fullName, password, profilePictureURL } = args.signupInput
      const isRegistered = await user.getUser(email)
      if (isRegistered) throw new UserInputError("username is taken", { errors, email: "email already taken" })
      const hashedPassword = await hash(password)

      let newProfilePictureURL = profilePictureURL

      //* if profilePictureURL isn't provided return the first letter of the full name
      if (!profilePictureURL) newProfilePictureURL = fullName[0].toUpperCase()

      await user.createUser({
        fullName,
        email,
        password: hashedPassword,
        profilePictureURL: newProfilePictureURL,
      })

      //* give the user a default role: NOT_AUTHORIZED
      await role.addRoleToUser(email, "NOT_AUTHORIZED")

      context.setCookies.push(await generateRefreshToken(email))

      const token = await jwt.sign(
        { email, roles: ["NOT_AUTHORIZED"] },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      )
      return { token }
    },

    async login(parent, args, context, info) {
      const { valid, errors } = serverLoginInputValidator(args.loginInput)
      if (!valid)
        throw new UserInputError("invalid credentials", { errors })

      const { email, password } = args.loginInput
      const foundUser = await user.getUser(email, {
        roles: { select: { roleId: true } },
      })
      if (!foundUser)
        throw new UserInputError("Wrong credentials", { errors, global: "Wrong credentials" })
      const validPassword = await bcrypt.compare(password, foundUser.password)
      if (!validPassword)
        throw new UserInputError("Wrong credentials", { errors, global: "Wrong credentials" })
      context.setCookies.push(await generateRefreshToken(email))

      const userRoles = foundUser.roles.map((currentRole) => currentRole.roleId)
      const token = await jwt.sign(
        { email, roles: userRoles },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      )
      return { token }
    },

    async logout(parent, args, context, info) {
      const { refreshToken: userRefreshToken, setCookies, req } = context
      const { email, exp, token } = checkAuth(req)
      if (!userRefreshToken) throw new UserInputError("No refresh token provided")
      //* delete refresh token if exist
      try {
        await refreshToken.deleteRefreshToken(email, userRefreshToken)
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
      const { refreshToken: userRefreshToken, req, setCookies } = context
      const { email, token, exp } = checkAuth(req)
      if (!userRefreshToken) throw new UserInputError("No refresh token provided")
      //* delete all expired refresh tokens
      await refreshToken.deleteExpiredRefreshTokens(email, { lt: new Date(Date.now()) })
      //* Create new refresh token
      const newRefreshToken = uuid()
      const newRefreshTokenExpiry = new Date(
        Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRY) * 1000
      )

      try {
        await refreshToken.updateRefreshToken(
          { userEmail_token: { userEmail: email, token: userRefreshToken } },
          { token: newRefreshToken, expiry: newRefreshTokenExpiry }
        )
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

      const userRoles = foundUser.roles.map((currentRole) => currentRole.roleId)
      const newToken = await jwt.sign(
        { email: foundUser.email, roles: userRoles },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      )
      return { token: newToken }
    },

    async requestReset(parent, args, context, info) {
      //* reset password code
      const resetPasswordCode = uuid()
      const resetPasswordCodeExpiry = new Date(
        Date.now() + parseInt(process.env.RESET_PASSWORD_CODE_EXPIRY) * 1000
      )

      //* Adds resetToken and resetTokenExpiry to the user in the db(redis)
      await redis.set(resetPasswordCode, resetPasswordCodeExpiry)
      
      //* Sends an email to the user that has the token
      await sendEmail(
        args.email,
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
      if (!valid)
        throw new UserInputError("invalid credentials", { errors })

      const { email, password, resetCode } = args.resetPasswordInput
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
        await user.updateUser(email, { password: newHashedPassword })
      } catch (error) {
        throw new Error("Error while changing ur password")
      }

      //* invalidate all refresh tokens
      // TODO: debug deleting refresh tokens
      try {
        await refreshToken.deleteRefreshTokens(email)
      } catch {}
      //* Return true if resetPassword succeed
      return true
    },

    //* - when a new account is created, it must be verified by an admin with the 'ADMIN' role
    async giveUserRole(parent, args, context, info) {
      const { email, roles } = checkAuth(context.req)
      if (!roles.includes("ADMIN")) throw new ForbiddenError("You are not an ADMIN")
      const { userEmail: inputEmail, role: inputRole } = args.roleInput
      const isValidEmail = verifyEmail(inputEmail)
      if (isValidEmail != null) throw new ForbiddenError("Invalid email format")
      
      const isValidRole = await role.getRole(inputRole)
      if (!isValidRole) throw new UserInputError("undefined Role")
      const userRoles = foundUser.roles.map((currentRole) => currentRole.roleId)
      if (userRoles.includes(inputRole))
        throw new UserInputError(`User already have the role ${inputRole}`)
     
      await role.addRoleToUser(inputEmail, inputRole)
      
      if (userRoles.includes("NOT_AUTHORIZED"))
        await role.deleteGivenRole(inputEmail, "NOT_AUTHORIZED")
      
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
