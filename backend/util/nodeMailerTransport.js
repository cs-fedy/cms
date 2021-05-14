/* eslint-disable linebreak-style */
/* eslint-disable no-undef */
const nodemailer = require("nodemailer")
const { google } = require("googleapis")
const OAuth2 = google.auth.OAuth2

const settings = {
  clientId: process.env.OAUTH_CLIENTID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
  refreshToken: process.env.OAUTH_REFRESH_TOKEN,
}

const myOAuth2Client = new OAuth2(
  settings.clientId, //* client ID
  settings.clientSecret, //* client secret
  settings.redirectUri //* redirect URI
)

myOAuth2Client.setCredentials({
  refresh_token: settings.refreshToken,
})

const myAccessToken = myOAuth2Client.getAccessToken()

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.MAIL_USERNAME,
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    refreshToken: settings.refreshToken,
    accessToken: myAccessToken, //access token variable we defined earlier
  },
})

module.exports = transport
