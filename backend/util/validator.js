const emailRegex = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/
const verifyEmail = (email) => {
  return email.trim() && email.match(emailRegex)
}

const serverSignupInputValidator = ({ email, fullName, password }) => {
  const errors = {}
  if (!verifyEmail(email)) {
    errors.email = "invalid email"
  }

  if (!fullName.trim()) {
    errors.fullName = "Full Name must not be empty"
  }

  if (!password) {
    errors.password = "password must not be empty"
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  }
}

const serverLoginInputValidator = ({ email, password }) => {
  const errors = {}
  if (!verifyEmail(email)) {
    errors.email = "invalid email"
  }

  if (!password) {
    errors.password = "password must not be empty"
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  }
}

const resetPasswordInputValidator = ({ email, password, resetCode }) => {
  const errors = {}
  if (!verifyEmail(email)) {
    errors.email = "invalid email"
  }

  if (!password) {
    errors.password = "password must not be empty"
  }

  if (!resetCode) {
    errors.resetCode = "reset code must not be empty"
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  }
}

const verifyCreatePostArgs = args => {
  const { title, content } = args
  const errors = {}

  if (!title) {
    errors.title = "title field is required"
  }

  if (!content) {
    errors.content = "content field is required"
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  }
}

module.exports = {
  serverSignupInputValidator,
  serverLoginInputValidator,
  resetPasswordInputValidator,
  verifyCreatePostArgs,
  verifyEmail,
}
