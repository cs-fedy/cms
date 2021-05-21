const emailRegex =
  /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/
const verifyEmail = (email, error) =>
  !email.trim() || !email.match(emailRegex) ? error : null
const verifyString = (string, error) => (!string.trim() ? error : null)

const serverSignupInputValidator = ({ email, fullName, password }) => {
  const errors = {}
  errors.email = verifyEmail(email, "invalid email")
  errors.fullName = verifyString(fullName, "Full Name must not be empty")
  errors.password = verifyString(password, "password must not be empty")
  return { errors, valid: Object.keys(errors).length < 1 }
}

const serverLoginInputValidator = ({ email, password }) => {
  const errors = {}
  errors.email = verifyEmail(email, "invalid email")
  errors.password = verifyString(password, "password must not be empty")
  return { errors, valid: Object.keys(errors).length < 1 }
}

const resetPasswordInputValidator = ({ email, password, resetCode }) => {
  const errors = {}
  errors.email = verifyEmail(email, "invalid email")
  errors.password = verifyString(password, "password must not be empty")
  errors.resetCode = verifyString(resetCode, "reset code must not be empty")
  return { errors, valid: Object.keys(errors).length < 1 }
}

const verifyCreatePostArgs = ({ title, content }) => {
  const errors = {}
  errors.title = verifyString(title, "title field is required")
  errors.content = verifyString(content, "content field is required")
  return { errors, valid: Object.keys(errors).length < 1 }
}

const verifyCatArgs = ({ categoryLabel, categoryDescription }) => {
  const errors = {}
  errors.categoryLabel = verifyString(
    categoryLabel,
    "category label field is required"
  )
  errors.categoryDescription = verifyString(
    categoryDescription,
    "category description field is required"
  )
  return { errors, valid: Object.keys(errors).length < 1 }
}

module.exports = {
  serverSignupInputValidator,
  serverLoginInputValidator,
  resetPasswordInputValidator,
  verifyCreatePostArgs,
  verifyCatArgs,
  verifyEmail,
  verifyString,
}
