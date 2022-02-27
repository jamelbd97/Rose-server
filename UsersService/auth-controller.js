const User = require("./model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const fs = require("fs");

exports.register = async (req, res) => {
  const {
    email,
    password,
    firstname,
    lastname,
    birthdate,
    gender,
    pictureId,
    isVerified,
    role,
  } = req.body;

  if (await User.findOne({ email })) {
    res.status(403).send({ message: "User already exist !" });
  } else {
    let user = await new User({
      email,
      password: await bcrypt.hash(password, 10),
      firstname,
      lastname,
      birthdate,
      gender,
      pictureId,
      isVerified,
      role,
    }).save();

    await configurerDossierUser(user._id);

    // token creation
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "60000" } // in Milliseconds (3600000 = 1 hour)
    );

    sendConfirmationEmail(email, token);

    res.status(200).send({
      message: "success",
      user,
      Token: jwt.verify(token, process.env.JWT_SECRET),
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ email: email }, process.env.JWT_SECRET, {
      expiresIn: "36000000",
    });

    if (!user.isVerified) {
      res.status(403).send({ user, message: "email non verifié" });
    } else {
      res.status(200).send({ token, user, message: "success" });
    }
  } else {
    res.status(403).send({ message: "mot de passe ou email incorrect" });
  }
};

exports.loginWithSocial = async (req, res) => {
  const { email, firstname, lastname, role } = req.body;

  if (email === "") {
    res.status(403).send({ message: "error please provide an email" });
  } else {
    var user = await User.findOne({ email });
    if (user) {
      console.log("user exists, loging in");
    } else {
      console.log("user does not exists, creating an account");

      user = await new User({
        email,
        firstname,
        lastname,
        isVerified: true,
        role,
      }).save();
    }

    // token creation
    const token = jwt.sign({ email: email }, process.env.JWT_SECRET, {
      expiresIn: "360000000",
    });

    res.status(201).send({ message: "success", user, token: token });
  }
};

exports.sendConfirmationEmail = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (user) {
    token = generateUserToken(user._id, email._id);

    sendConfirmationEmail(req.body.email, token);

    res.status(200).send({
      message: "L'email de confirmation a été envoyé a " + user.email,
    });
  } else {
    res.status(404).send({ message: "User innexistant" });
  }
};

exports.confirmation = async (req, res) => {
  let token;

  if (req.params.token) {
    try {
      token = jwt.verify(req.params.token, process.env.JWT_SECRET);
    } catch (e) {
      return res.render("confirmation.twig", {
        message:
          "The verification link may have expired, please resend the email.",
      });
    }
  } else {
    return res.render("confirmation.twig", {
      message: "no token",
    });
  }

  User.findById(token._id, function (err, user) {
    if (!user) {
      return res.render("confirmation.twig", {
        message: "User does not exist, please register.",
      });
    } else if (user.isVerified) {
      return res.render("confirmation.twig", {
        message: "This user has already been verified, please login",
      });
    } else {
      user.isVerified = true;
      user.save(function (err) {
        if (err) {
          return res.render("confirmation.twig", {
            message: err.message,
          });
        } else {
          return res.render("confirmation.twig", {
            message: "Your account has been verified",
          });
        }
      });
    }
  });
};

exports.forgotPassword = async (req, res) => {
  const resetCode = req.body.resetCode;
  const user = await User.findOne({ email: req.body.email });

  if (user) {
    // token creation
    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "3600000", // in Milliseconds (3600000 = 1 hour)
      }
    );

    sendOTP(req.body.email, resetCode);

    res.status(200).send({
      message: "L'email de reinitialisation a été envoyé a " + user.email,
    });
  } else {
    res.status(404).send({ message: "User innexistant" });
  }
};

exports.updatePassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (newPassword) {
    newPasswordEncrypted = await bcrypt.hash(newPassword, 10);

    let user = await User.findOneAndUpdate(
      { email: email },
      {
        $set: {
          password: newPasswordEncrypted,
        },
      }
    );

    return res.send({ message: "Password updated successfully", user });
  } else {
    return res.status(403).send({ message: "Password should not be empty" });
  }
};

///// FUNCTIONS ---------------------------------------------------------

async function generateUserToken(_id, email) {
  return jwt.sign({ _id: _id, email: email }, process.env.JWT_SECRET, {
    expiresIn: "100000000", // in Milliseconds (3600000 = 1 hour)
  });
}

async function sendConfirmationEmail(email, token) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
      console.log("Server not ready");
    } else {
      console.log("Server is ready to take our messages");
    }
  });

  const confirmationLink = "http://localhost:3000/confirmation/" + token;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Confirm your email",
    html:
      "<h3>Please confirm your email using this </h3><a href='" +
      confirmationLink +
      "'>link</a>",
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

async function sendOTP(email, codeDeReinit) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
      console.log("Server not ready");
    } else {
      console.log("Server is ready to take our messages");
    }
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Password reset - Rose",
    html:
      "<h3>You have requested to reset your password</h3><p>Your reset code is : <b style='color : blue'>" +
      codeDeReinit +
      "</b></p>",
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent : " + info.response);
    }
  });
}

async function configurerDossierUser(id) {
  const dir = `./images/uploads`;

  fs.mkdir(dir, function () {
    fs.exists(dir, function (exist, err) {
      if (exist) {
        const dir2 = `./uploads/developer-${id}/profile-pic`;
        fs.mkdir(dir2, function () {
          console.log("folder created");
        });
      }
    });
  });
}
