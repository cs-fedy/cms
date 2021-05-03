import { UserInputError } from "apollo-server-micro";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import prisma from "../../../../lib/prisma";
import {
  serverSignupInputValidator,
  serverLoginInputValidator,
  verifyEmail,
} from "../../../../lib/validator";

//* Options used in resolvers to issue the refresh token cookie.
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  //* Get part after // and before : (in case port number in URL)
  //* E.g. <http://localhost:3000> becomes localhost
  domain: process.env.BASE_URL.split("//")[1].split(":")[0],
  httpOnly: true,
  path: "/",
  sameSite: true,
  //* Allow non-secure cookies only in development environment without HTTPS
  secure: !!process.env.BASE_URL.includes("https"),
};

export default {
  Mutation: {
    async signup(parent, args, context, info) {
      const { signupInput } = args;
      const { valid, errors } = serverSignupInputValidator(signupInput);
      if (!valid) {
        throw new UserInputError("invalid credentials", { errors });
      }

      const { email, fullName, password, profilePictureURL } = signupInput;
      const isRegistered = await prisma.user.findUnique({
        where: { email },
      });
      if (isRegistered) {
        errors.email = "email already taken";
        throw new UserInputError("username is taken", { errors });
      }

      const hashedPassword = await hash(password);

      let newProfilePictureURL = profilePictureURL;
      if (!profilePictureURL) {
        //* if profilePictureURL isn't provided return the first letter of the full name
        newProfilePictureURL = fullName[0].toUpperCase();
      }

      await prisma.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          profilePictureURL: newProfilePictureURL,
        },
      });

      context.setCookies.push(await generateRefreshToken(email));

      const JWT_SECRET = process.env.JWT_SECRET;
      const token = await jwt.sign({ email }, JWT_SECRET, {
        expiresIn: "15m",
      });
      return { token };
    },

    async login(parent, args, context, info) {
      const { loginInput } = args;
      const { valid, errors } = serverLoginInputValidator(loginInput);
      if (!valid) {
        throw new UserInputError("invalid credentials", { errors });
      }

      const { email, password } = loginInput;
      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });
      if (!user) {
        errors.global = "Wrong credentials";
        throw new UserInputError("Wrong credentials", { errors });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        errors.global = "Wrong credentials";
        throw new UserInputError("Wrong credentials", { errors });
      }

      context.setCookies.push(await generateRefreshToken(email));

      const JWT_SECRET = process.env.JWT_SECRET;
      const token = await jwt.sign({ email }, JWT_SECRET, {
        expiresIn: "15m",
      });

      return { token };
    },

    async logout(parent, args, context, info) {
      const { req, setCookies, email } = context;
      const { refreshToken } = req.cookies;
      if (!refreshToken) throw new Error("No refresh token provided");

      const isValidEmail = verifyEmail(email || "");
      if (!isValidEmail) throw new Error("Invalid email");

      const foundUser = await prisma.user.findUnique({
        where: { email },
      });
      if (!foundUser) throw new Error("Invalid user");

      //* delete refresh token if exist
      const isRefreshTokenValid = await prisma.refreshToken.delete({
        where: {
          AND: [{ userEmail: email }, { hash: await hash(refreshToken) }],
        },
      });
      if (!isRefreshTokenValid) throw new Error("Invalid refresh token");

      //* Send the same cookie options as on signin but expiry in the past
      setCookies.push({
        name: "refreshToken",
        value: req.cookies.refreshToken,
        options: {
          ...REFRESH_TOKEN_COOKIE_OPTIONS,
          expires: new Date(0),
        },
      });

      //* return true if sign out is done
      return true;
    },

    async refreshUser(parent, args, context, info) {
      const { req, setCookies, email } = context;
      const { refreshToken } = req.cookies;
      if (!refreshToken) throw new Error("No refresh token provided");

      const isValidEmail = verifyEmail(email || "");
      if (!isValidEmail) throw new Error("Invalid email");

      const foundUser = await prisma.user.findUnique({
        where: { email },
      });
      if (!foundUser) throw new Error("Invalid user");

      //* delete the current refresh token or all expired refresh tokens
      await prisma.refreshToken.deleteMany({
        where: {
          userEmail: email,
          expiry: { lt: new Date(Date.now()) },
        },
      });

      //* refresh the token
      const newRefreshToken = uuidv4();
      const newRefreshTokenExpiry = new Date(
        Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRY) * 1000
      );

      try {
        await prisma.refreshToken.update({
          where: {
            userEmail_hash: {
              userEmail: email,
              hash: refreshToken,
            },
          },
          data: {
            hash: newRefreshToken,
            expiry: newRefreshTokenExpiry,
          },
        });
      } catch (error) {
        if (!isRefreshTokenValid) throw new Error("Invalid refresh token");
      }

      setCookies.push({
        name: "refreshToken",
        value: newRefreshToken,
        options: {
          ...REFRESH_TOKEN_COOKIE_OPTIONS,
          expires: newRefreshTokenExpiry,
        },
      });

      const JWT_SECRET = process.env.JWT_SECRET;
      const token = await jwt.sign({ email: foundUser.email }, JWT_SECRET, {
        expiresIn: "15m",
      });

      return { token };
    },
  },
};

const generateRefreshToken = async (email) => {
  const refreshToken = uuidv4();
  const refreshTokenExpiry = new Date(
    Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRY) * 1000
  );

  await prisma.refreshToken.create({
    data: {
      userEmail: email,
      hash: refreshToken,
      expiry: refreshTokenExpiry,
    },
  });

  return {
    name: "refreshToken",
    value: refreshToken,
    options: {
      ...REFRESH_TOKEN_COOKIE_OPTIONS,
      expires: refreshTokenExpiry,
    },
  };
};

const hash = (string) => {
  const SALT_ROUND = Number.parseInt(process.env.SALT_ROUND);
  return bcrypt.hash(string, SALT_ROUND);
};
