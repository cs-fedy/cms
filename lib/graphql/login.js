import { gql } from "@apollo/client";

export default gql`
  mutation login($email: String!, $password: String!) {
    login(loginInput: { email: $email, password: $password }) {
      id
      fullName
      email
      createdAt
      profilePictureURL
      role
      token
    }
  }
`;
