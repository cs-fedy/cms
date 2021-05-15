const gql = require("graphql-tag")

module.exports = gql`
  type User {
    id: ID!
    fullName: String!
    email: String!
    createdAt: String!
    updatedAt: String
    profilePictureURL: String
    roles: String
  }

  type Role {
    roleName: String!
    roleDescription: String!
  }

  type AuthPayload {
    token: String!
  }

  type RRPayload {
    expiry: String!
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

  input ResetPasswordInput {
    email: String!
    password: String!
    resetCode: String!
  }

  input RoleInput {
    userEmail: String!
    role: String!
  }

  type Query {
    getUsers: [User]!
    getUser(email: String!): User
    getUnauthorizedUsers: [User]!
    getRoles: [Role]!
  }

  type Mutation {
    signup(signupInput: SignupInput): AuthPayload!
    login(loginInput: LoginInput): AuthPayload!
    logout: Boolean!
    refreshUser: AuthPayload!
    requestReset(email: String!): RRPayload!
    resetPassword(resetPasswordInput: ResetPasswordInput): Boolean!
    giveUserRole(roleInput: RoleInput!): Boolean!
  }
`
