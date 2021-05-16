const gql = require("graphql-tag")

module.exports = gql`
  type User {
    fullName: String!
    email: ID!
    createdAt: String!
    updatedAt: String
    profilePictureURL: String
    roles: String
  }

  type Role {
    roleName: String!
    roleDescription: String!
  }

  type Post {
    id: ID!
    userEmail: String!
    title: String!
    content: String!
    publishedAt: String!
    updatedAt: String
    categories: [String]!
  }

  type AuthPayload {
    token: String!
  }

  type RRPayload {
    expiry: String!
  }

  input SignupInput {
    fullName: String!
    email: ID!
    password: String!
    profilePictureURL: String
  }

  input LoginInput {
    email: ID!
    password: String!
  }

  input ResetPasswordInput {
    email: ID!
    password: String!
    resetCode: String!
  }

  input RoleInput {
    userEmail: ID!
    role: String!
  }

  input CreatePostInput {
    title: String!
    content: String!
    categories: [String]!
  }

  input UpdatePostInput {
    id: ID!
    title: String
    content: String
    categories: [String]
  }

  type Query {
    getUsers: [User]!
    getUser(email: ID!): User!
    getUnauthorizedUsers: [User]!
    getRoles: [Role]!
    getPost(id: ID!): Post!
    getPosts: [Post]!
  }

  type Mutation {
    signup(signupInput: SignupInput): AuthPayload!
    login(loginInput: LoginInput): AuthPayload!
    logout: Boolean!
    refreshUser: AuthPayload!
    requestReset(email: ID!): RRPayload!
    resetPassword(resetPasswordInput: ResetPasswordInput): Boolean!
    giveUserRole(roleInput: RoleInput!): Boolean!
    createPost(createPostInput: CreatePostInput!): Post!
    updatePost(updatePostInput: UpdatePostInput!): Post!
    deletePost(postId: ID!): Boolean!
  }
`
