/* eslint-disable no-undef */
const { ApolloServer } = require("apollo-server")
const httpHeadersPlugin = require("apollo-server-plugin-http-headers")
const typeDefs = require("./graphql/schema")
const resolvers = require("./graphql/resolvers")
require("dotenv").config()


const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  //* httpHeadersPlugin allows us to send cookies back to the client
  plugins: [httpHeadersPlugin],
  context: ({ req }) => {
    //* Initialized as empty arrays - resolvers will add items if required
    const setCookies = []
    const setHeaders = []
    const refreshToken = req.headers.cookie?.split("=")[1]
    return { req, setCookies, setHeaders, refreshToken }
  },
})


apolloServer
  .listen(process.env.PORT)
  .then((res) => console.log(`server is on: ${res.url}`))
  .catch((err) => {
    throw new Error(err)
  })

// TODO: debug error handling