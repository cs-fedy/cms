/* eslint-disable no-undef */
const { AuthenticationError, UserInputError  } = require("apollo-server")
const jwt = require("jsonwebtoken")
const redis = require("./redis")

module.exports = req => {
  const authHeader = req.headers.authorization
  if (!authHeader) throw new UserInputError("Authorization header must be provided")
  const token = authHeader.split("Bearer ")[1]
  if (!token) throw new UserInputError("Authorization token must be 'Bearer [token]")

  let payload
  jwt.verify(token, process.env.JWT_SECRET, (err, result) => {
    if (err) throw new AuthenticationError("Invalid/Expired token")
    const { email, exp } = result
    //* check if token is black listed or not
    redis.get(email, (err, res) => {
      if (err) throw new Error("Error while validating the JWT")
      if (res && token in res) {
        throw new Error("Token is black listed")
      }
    })

    payload = { email, exp, token}
  })

  return payload
}
