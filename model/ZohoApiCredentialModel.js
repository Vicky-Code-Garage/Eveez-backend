const mongoose = require("mongoose");

const zohoApiCredentialSchema = new mongoose.Schema(
  {
    clientId: String,
    clientSecret: String,
    refreshToken: String,
    accessToken: String,
    grantType: String,
    expires_in: Number,
  },
  { timestamps: true }
);

const ZohoApiCredentials = mongoose.model("ZohoApiCredentials", zohoApiCredentialSchema);
module.exports = ZohoApiCredentials;