/* eslint-disable linebreak-style */
const redis = require("./redis")

const addToBlackList = async (token, email, exp) => {
  //* Deny listing workflow to the JWT
  redis.get(email, async (err, res) => {
    if (err) throw new Error("Error while invalidating the JWT")
    if (res) {
      res = JSON.parse(res)
      await redis.set(email, JSON.stringify([...res, token]))
    } else {
      await redis.set(email, JSON.stringify([token]))
    }
    await redis.expire(email, exp)
  })
}

module.exports = addToBlackList
