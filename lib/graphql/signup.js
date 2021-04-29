import { gql } from "@apollo/client";

export default gql`
  mutation signup($fullName: String!, $email: String!, $password: String!) {
    signup(
      signupInput: { fullName: $fullName, email: $email, password: $password }
    ) {
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
