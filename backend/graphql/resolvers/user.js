/* eslint-disable no-empty */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const {
  ForbiddenError,
  UserInputError,
  AuthenticationError,
} = require("apollo-server")
const jwt = require("jsonwebtoken")
const { v4: uuid } = require("uuid")
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")
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


module.exports = {
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

      const isValidEmail = verifyEmail(email || "")
      if (!isValidEmail) throw new UserInputError("Invalid email format")

      const foundUser = await prisma.user.findUnique({
        where: { email },
      })
      if (!foundUser) throw new ForbiddenError("Invalid user")

      //* delete refresh token if exist
      const isRefreshTokenValid = await prisma.refreshToken.delete({
        where: {
          userEmail_token: { userEmail: email, token: refreshToken },
        },
      })
      if (!isRefreshTokenValid)
        throw new ForbiddenError("Invalid refresh token")

      //* clear cookies list
      setCookies.splice(0, setCookies.length)

      //* Deny listing workflow to the JWT
      redis.get(email, async (err, res) => {
        if (err) throw new Error("Error while invalidating the JWT")
        if (res) {
          await redis.set(email, [...res, token])
        } else {
          await redis.set(email, [token])
        }
        await redis.expire(email, exp)
      })

      //* return true if sign out is done
      return true
    },

    async requestReset(parent, args, context, info) {
      const { email } = args
      const isValidEmail = verifyEmail(email || "")
      if (!isValidEmail) throw new ForbiddenError("Invalid email format")

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
      redis.set(resetPasswordCode, resetPasswordCodeExpiry)

      //* Sends an email to the user that has the token
      //* Generate test SMTP service account from ethereal.email
      //! Only needed if you don't have a real mail account for testing
      const testAccount = await nodemailer.createTestAccount()

      //* create reusable transporter object using the default SMTP transport
      const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      })

      try {
        console.log(email)
        //* send mail with defined transport object
        const sentEmail = await transporter.sendMail({
          from: testAccount.user, // sender address
          to: email, // list of receivers
          subject: "cms reset password code", // Subject line
          text: `hello ${email} this is your code ${resetPasswordCode}`, // plain text body
        })
        console.log(sentEmail)
      } catch (error) {
        throw Error("Error while sending reset password code email")
      }

      //* if success return code expiry date
      return { expiry: resetPasswordCodeExpiry }
    },

    async resetPassword(parent, args, context, info) {
      const { errors, valid } = resetPasswordInputValidator(args)
      if (!valid) {
        throw new UserInputError("invalid credentials", { errors })
      }

      const { email, password, resetCode } = args.loginInput
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
      try {
        await prisma.refreshToken.deleteMany({
          where: { email }
        })
      } catch {}

      //* Return true if resetPassword succeed
      return true
    },
  },
}
