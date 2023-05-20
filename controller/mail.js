const nodemailer = require("nodemailer");
require("dotenv").config();

function mail(eml, sbt, txt) {
  try {
    const msg = {
      from: process.env.EMAIL_APP_USERNAME,
      to: eml,
      subject: sbt,
      text: txt,
    };

    nodemailer
      .createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_APP_USERNAME,
          pass: process.env.EMAIL_APP_KEY,
        },
        tls: {
          rejectUnauthorized: false,
        },
      })
      .sendMail(msg, (err) => {
        if (err) {
          console.log(err);
          console.log("Email Not Sent");
          return err;
        } else {
          console.log("Email Sent :)");
        }
      });
    return 1;
  } catch (error) {
    console.log(error);
    console.log("Could Not Send Email");
    return 0;
  }
}

module.exports = { mail };
