import { ApolloServer } from "apollo-server-micro";
import typeDefs from "./graphql/schema";
import resolvers from "./graphql/resolvers";

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({ req }),
});
export default apolloServer.createHandler({ path: "/api/server" });

export const config = {
  api: {
    bodyParser: false,
  },
};
