import { useState } from "react";
import { useMutation } from "@apollo/client";
import Button from "../../components/button";
import Input from "../../components/input";
import LOGIN_MUTATION from "../../lib/graphql/login";
import { useAuth } from "../../lib/authContext";

export default function loginScreen() {
  const auth = useAuth();
  const [errors, setErrors] = useState({});
  const [formState, setFormState] = useState({
    email: "",
    password: "",
  });

  const [login, { loading }] = useMutation(LOGIN_MUTATION, {
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
    login({
      variables: formState,
      update: (cache, { data }) => auth.login(data.login),
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
            Login and start blogging
          </div>
          <div className="py-4 px-8">
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
            <div className="mb-4">
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
              <a href="/auth/resetPassword" className="text-grey text-xs mt-1">
                Forget your password?
              </a>
            </div>
            <div className="flex items-center justify-between mt-8">
              <Button disabled={loading}>
                {loading ? "loading..." : "Login to your account"}
              </Button>
            </div>
          </div>
        </form>
        <p className="text-center my-4">
          <a
            href="/auth/signup"
            className="text-grey-dark text-sm no-underline hover:text-grey-darker"
          >
            You don't have an account?
          </a>
        </p>
      </div>
    </div>
  );
}
