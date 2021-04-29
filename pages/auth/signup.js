import { useState } from "react";
import { useMutation } from "@apollo/client";
import Input from "../../components/input";
import Button from "../../components/button";
import SIGNUP_MUTATION from "../../lib/graphql/signup";
import { useAuth } from "../../lib/authContext"

export default function SignupScreen() {
  const auth = useAuth();
  const [errors, setErrors] = useState({});
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [signup, { loading }] = useMutation(SIGNUP_MUTATION, {
    onError(err) {
      setErrors(err.graphQLErrors[0].extensions.exception.errors);
    },
  });

  const handleChange = (element) => {
    const { name, value } = element.target;
    setFormState((prevFormState) => ({ ...prevFormState, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { firstName, lastName, email, password } = formState;
    signup({
      variables: {
        fullName: `${firstName} ${lastName}`,
        email,
        password,
      },
      update: (cache, { data }) => auth.login(data.signup),
    });
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="container mx-auto py-8">
        <form
          onSubmit={handleSubmit}
          className="w-5/6 lg:w-1/2 mx-auto bg-white rounded shadow"
        >
          <div className="py-4 px-8 text-black text-xl border-b border-grey-lighter">
            Register for a free account
          </div>
          <div className="py-4 px-8">
            <div className="flex flex-col mb-4">
              <div className="flex flex-row">
                <Input
                  className="w-1/2 mr-1"
                  label="First Name"
                  type="text"
                  name="firstName"
                  placeholder="Your first name"
                  value={formState.firstName}
                  onChange={handleChange}
                />
                <Input
                  className="w-1/2 mr-1"
                  label="Last Name"
                  type="text"
                  name="lastName"
                  placeholder="Your last name"
                  value={formState.lastName}
                  onChange={handleChange}
                />
              </div>
              {errors.fullName && (
                <p className="text-red-500 text-xs italic">{errors.fullName}</p>
              )}
            </div>
            <Input
              error={errors.email}
              className="mb-4"
              label="Email Address"
              type="email"
              name="email"
              placeholder="Your email address"
              value={formState.email}
              onChange={handleChange}
            />
            <Input
              error={errors.password}
              className="mb-4"
              label="Password"
              type="password"
              name="password"
              placeholder="Your secure password"
              value={formState.password}
              onChange={handleChange}
            />
            {errors.global && (
              <p className="text-red-500 text-xs italic">{errors.global}</p>
            )}
            <div className="flex items-center justify-between mt-8">
              <Button disabled={loading}>
                {loading ? "loading..." : "Sign up"}
              </Button>
            </div>
          </div>
        </form>
        <p className="text-center my-4">
          <a
            href="/auth/login"
            className="text-grey-dark text-sm no-underline hover:text-grey-darker"
          >
            I already have an account
          </a>
        </p>
      </div>
    </div>
  );
}
