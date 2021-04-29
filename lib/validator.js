import Joi from "joi";

const emailRegex = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/;
const serverSignupInputValidator = ({email, fullName, password }) => {
  const errors = {};
  if (!email.trim()) {
    errors.email = "email must not be empty";
  } else if (!email.match(emailRegex)) {
    errors.email = "invalid email format";
  }

  if (!fullName.trim()) {
    errors.fullName = "Full Name must not be empty";
  }

  if (!password) {
    errors.password = "password must not be empty";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

const serverLoginInputValidator = ({ email, password }) => {
  const errors = {};
  if (!email.trim()) {
    errors.email = "email must not be empty";
  } else if (!email.match(emailRegex)) {
    errors.email = "invalid email format";
  }

  if (!password) {
    errors.password = "password must not be empty";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
}

export { serverSignupInputValidator, serverLoginInputValidator };
