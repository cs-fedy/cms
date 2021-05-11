/* eslint-disable no-undef */
const Redis = require("ioredis")

const REDIS_URL = process.env.REDIS_URL
const redis = new Redis(REDIS_URL)

redis.on("error", (error) => {
  console.log("Redis connection error", error)
})

module.exports = redis
