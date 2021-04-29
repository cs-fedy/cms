import { gql } from "apollo-server-micro";

export default gql`
  type User {
    id: ID!
    fullName: String!
    email: String!
    password: String!
    createdAt: String!
    updatedAt: String
    profilePictureURL: String
    role: Role
    token: String!
  }

  enum Role {
    ADMIN
    UserNOT_AUTHORIZED
  }

  input SignupInput {
    fullName: String!
    email: String!
    password: String!
    profilePictureURL: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type Query {
    hello: String!
  }
  type Mutation {
    signup(signupInput: SignupInput): User!
    login(loginInput: LoginInput): User!
  }
`;
