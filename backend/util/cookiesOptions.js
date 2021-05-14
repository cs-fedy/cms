/* eslint-disable linebreak-style */
/* eslint-disable no-undef */
//* Options used in resolvers to issue the refresh token cookie.
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  //* Get part after // and before : (in case port number in URL)
  //* E.g. <http://localhost:3000> becomes localhost
  domain: process.env.BASE_URL?.split("//")[1].split(":")[0],
  httpOnly: true,
  path: "/",
  sameSite: true,
  //* Allow non-secure cookies only in development environment without HTTPS
  secure: !!process.env.BASE_URL?.includes("https"),
}

module.exports = REFRESH_TOKEN_COOKIE_OPTIONS
