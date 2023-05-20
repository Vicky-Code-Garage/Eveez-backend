const Rider = require("../model/rider");
const User = require("../model/user");
const jwt = require("jsonwebtoken");

async function isAuthenticated (req, res, next) {
  try {
    // const token = req.cookies['servicerequest-token'];
    // console.log(token);
    const token = req.body.token

    if (!token) {
      return res.status(401).json({
        message: "Please login first",
      });
    }

    const decoded = jwt.verify(token, process.env.TOKEN_KEY);
    // console.log(decoded, "fbhf");

    if (decoded.role.toUpperCase() === "RIDER"){
      req.user = await Rider.findById(decoded._id);
    } else {
      req.user = await User.findById(decoded._id);
    }

    console.log(req.user, "user");

    next()

  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
    isAuthenticated
}
