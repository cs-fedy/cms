/* eslint-disable no-undef */
const bcrypt = require("bcrypt")

module.exports = (string) => {
  const SALT_ROUND = Number.parseInt(process.env.SALT_ROUND)
  return bcrypt.hash(string, SALT_ROUND)
}
