const emailRegex = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/;
const verifyEmail = (email) => {
  return email.trim() && email.match(emailRegex);
};

const serverSignupInputValidator = ({ email, fullName, password }) => {
  const errors = {};
  if (!verifyEmail(email)) {
    errors.email = "invalid email";
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
  if (!verifyEmail(email)) {
    errors.email = "invalid email";
  }

  if (!password) {
    errors.password = "password must not be empty";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

export { serverSignupInputValidator, serverLoginInputValidator, verifyEmail };
