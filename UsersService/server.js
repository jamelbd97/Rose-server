require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;
const controller = require("./controller");
const authController = require("./auth-controller");

// database
mongoose.Promise = global.Promise;
mongoose
  .connect(process.env.MONGODB_DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(
    () => {
      console.log("Database connected");
    },
    (err) => {
      console.log("Database connection error", err);
    }
  );

// middlewares
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));  
app.use('/img', express.static('images'));

// routes
app.post("/register", authController.register);
app.post("/login", authController.login);
app.post("/login-with-social", authController.loginWithSocial);
app.post("/send-confirmation-email", authController.sendConfirmationEmail);
app.get("/confirmation/:token", authController.confirmation);
app.post("/forgot-password", authController.forgotPassword);
app.post("/update-password", authController.updatePassword);

app
  .route("/one")
  .get(controller.get)
  .post(controller.add)
  .put(controller.update)
  .delete(controller.delete);

app.route("/all").get(controller.getAll).delete(controller.deleteAll);

app.listen(port, () => console.log(`Server up and running on port ${port} !`));
