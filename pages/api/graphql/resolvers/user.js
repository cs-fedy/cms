import { UserInputError } from "apollo-server-micro";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../../../../lib/prisma";
import {
  serverSignupInputValidator,
  serverLoginInputValidator,
} from "../../../../lib/validator";

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
        where: {
          email,
        },
      });
      if (isRegistered) {
        errors.email = "email already taken";
        throw new UserInputError("username is taken", { errors });
      }

      const SALT_ROUND = Number.parseInt(process.env.SALT_ROUND);
      const SALT = await bcrypt.genSalt(SALT_ROUND);
      const hashedPassword = await bcrypt.hash(password, SALT);

      let newProfilePictureURL = profilePictureURL;
      if (!profilePictureURL) {
        //* if profilePictureURL isn't provided return the first letter of the full name
        newProfilePictureURL = fullName[0].toUpperCase();
      }

      const createdUser = await prisma.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          profilePictureURL: newProfilePictureURL,
        },
      });

      const JWT_SECRET = process.env.JWT_SECRET;
      const token = await jwt.sign({ id: createdUser.id, email }, JWT_SECRET, {
        expiresIn: "2h",
      });

      return {
        ...createdUser,
        password: "HHHHH NICE TRY BOI",
        token,
      };
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

      const JWT_SECRET = process.env.JWT_SECRET;
      const token = await jwt.sign({ id: user.id, email }, JWT_SECRET, {
        expiresIn: "2h",
      });

      return {
        ...user,
        password: "HHHHH NICE TRY BOI",
        token,
      };
    },
  },
};
