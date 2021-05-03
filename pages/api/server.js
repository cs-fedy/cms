import httpHeadersPlugin from "apollo-server-plugin-http-headers";
import { ApolloServer } from "apollo-server-micro";
import typeDefs from "./graphql/schema";
import resolvers from "./graphql/resolvers";
import jwt from "jsonwebtoken";

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  //* httpHeadersPlugin allows us to send cookies back to the client
  plugins: [httpHeadersPlugin],

  context: ({ req }) => {
    const token = req.headers.authorization?.split(" ")[1] || undefined;
    //* Initialized as empty arrays - resolvers will add items if required
    const setCookies = [];
    const setHeaders = [];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      return { req, setCookies, setHeaders, email: payload.email };
    } catch (error) {
      return { setCookies, setHeaders, req };
    }
  },
});

export default apolloServer.createHandler({ path: "/api/server" });

export const config = {
  api: {
    bodyParser: false,
  },
};
