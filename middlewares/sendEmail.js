const nodeMailer = require("nodemailer");
const { mail } = require("../controller/mail");

exports.sendEmail = async (options) => {
  const transporter = nodeMailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.SMPT_MAIL,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // console.log(process.env.SMPT_MAI);
  // console.log(mailOptions);

  await transporter.sendMail(mailOptions);
};