const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  mob_number: {
    type: Number,
    required: true,
    unique: [true, "Mobile Already Exists"],
  },

  email: {
    type: String,
    required: true,
    unique: [true, "Email Already Exists"],
  },

  location: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: true,
    default: process.env.USERS_KEY,
  },

  token: {
    type: String,
    required: true,
    default: "NA",
  },

  tokenvalidity: {
    type: Number,
    required: true,
    default: "0",
  },
});

// HASHING PASSWORD
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
    console.log("HASHING DONE SUCCESSFULLY!");
  }
  if (this.password == process.env.USERS_KEY) {
    this.password = await bcrypt.hash(this.password, 12);
    console.log("HASHING DONE SUCCESSFULLY!");
  }
  next();
});

//generate password
async function generatePassword() {
  try {
    return await bcrypt.hash(process.env.USERS_KEY, 12);
  } catch (error) {
    console.log(error);
  }
}

//generating token
userSchema.methods.generateAuthToken = async function () {
  try {
    let mytoken = jwt.sign(
      {
        _id: this._id,
        role: this.role,
        location: this.location,
        status: this.status,
        mob_number: this.mob_number,
        email: this.email,
      },
      process.env.TOKEN_KEY
    );
    this.token = mytoken;
    await this.save();
    return mytoken;
  } catch (error) {
    console.log(error);
  }
};

// creating a new collection
const User = new mongoose.model("User", userSchema);

//Exporting the model
module.exports = User;
