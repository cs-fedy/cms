/* eslint-disable no-undef */
const express = require("express")
const cookieParser = require("cookie-parser")
const { ApolloServer } = require("apollo-server-express")
const httpHeadersPlugin = require("apollo-server-plugin-http-headers")
const typeDefs = require("./graphql/schema")
const resolvers = require("./graphql/resolvers")
const refreshUserRouter = require("./routes/refreshToken")

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  //* httpHeadersPlugin allows us to send cookies back to the client
  plugins: [httpHeadersPlugin],
  context: ({ req }) => {
    //* Initialized as empty arrays - resolvers will add items if required
    const setCookies = []
    const setHeaders = []
    const refreshToken = req.headers.cookie.split("=")[1] || undefined
    return { req, setCookies, setHeaders, refreshToken }
  },
})

const app = express()
app.use(cookieParser())
app.use("/refreshUser", refreshUserRouter)
apolloServer.applyMiddleware({ app })

app
  .listen(process.env.PORT)
  .then((res) => console.log(`server is on: ${res.url}`))
  .catch((err) => {
    throw new Error(err)
  })
