const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const riderSchema = new mongoose.Schema({
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
    default: "Rider",
  },

  owner: {
    type: String,
    required: true,
  },

  owner_email: {
    type: String,
    required: true,
  },

  owner_mob: {
    type: Number,
    required: true,
  },

  vehicle_no: {
    type: String,
    required: true,
    unique: [true, "Vehicle is Already Assigned"],
  },

  password: {
    type: String,
    required: true,
    default: process.env.RIDERS_KEY,
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

  zoho_id: {
    type: String,
    default: null
  }
});

// HASHING PASSWORD
riderSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
    this.cpassword = await bcrypt.hash(this.cpassword, 12);
    console.log("HASHING DONE SUCCESSFULLY!");
  }
  if (this.password == process.env.RIDERS_KEY) {
    this.password = await bcrypt.hash(this.password, 12);
    console.log("HASHING DONE SUCCESSFULLY!");
  }
  next();
});

//generating token
riderSchema.methods.generateAuthToken = async function () {
  try {
    let mytoken = jwt.sign(
      {
        _id: this._id,
        mob_number: this.mob_number,
        email: this.email,
        location: this.location,
        status: this.status,
        role: this.role,
        owner: this.owner,
        owner_email: this.owner_email,
        vehicle_no: this.vehicle_no,
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
const Rider = new mongoose.model("Rider", riderSchema);

//Exporting the model
module.exports = Rider;
