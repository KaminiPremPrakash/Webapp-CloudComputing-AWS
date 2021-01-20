const express = require("express");
const aws = require("aws-sdk");
const router = express.Router();
const db = require("../models");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const basicAuth = require("../auth");
const moment = require("moment");
const pwdVAlidator = require("../password-validator");
const emailValidator = require("email-validator");
const uuid = require("uuid");
const SDC = require("statsd-client"),
  sdc = new SDC({ host: "localhost", port: 8125 });
const log4js = require("log4js");
log4js.configure({
  appenders: {
    logs: { type: "file", filename: "/home/ubuntu/webapp/logs/webapp.log" },
  },
  categories: { default: { appenders: ["logs"], level: "info" } },
});
const logger = log4js.getLogger("logs");
router.get("/", (req, res) => {
  res.status(200);
  res.json("Server is healthy");
});
//get user
router.get("/user/self", basicAuth, (req, res) => {
  sdc.increment("GET User API Triggered");
  let timer = new Date();
  let dbtimer = new Date();
  res.status(200);
  res.setHeader("Content-Type", "application/json");
  const user = res.locals.user.dataValues;
  const result = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.email_address,
    account_created: user.account_created,
    account_updated: user.account_updated,
  };
  sdc.timing("Get.userdb.time", dbtimer);
  sdc.timing("Get.user.time", timer);
  res.json(result);
});

//get a user's information with id
router.get("/user/:id", (req, res) => {
  sdc.increment("GET User info with Id Triggered");
  let timer = new Date();
  let dbtimer = new Date();
  let id = req.params.id;
  db.users
    .findOne({ where: { id: id } })
    .then(function (user) {
      if (user) {
        sdc.timing("Get.userByIdDB.time", dbtimer);
        const result = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.email_address,
          account_created: user.account_created,
          account_updated: user.account_updated,
        };
        sdc.timing("Get.userById.time", timer);
        res.json(result);
        res.status(200);
        logger.info("Fetched User successfully");
      } else {
        logger.error("No user with this Id exists.");
        res.status(400);
        res.json("No user with this Id exists.");
      }
    })
    .catch(() => {
      logger.error("Error finding the user with this id");
      res.status(404);
      res.json("Error finding the user with this id");
    });
});

//edit user
router.put("/user/self", basicAuth, (req, res) => {
  sdc.increment("PUT user API Triggered");
  let timer = new Date();
  //Extract username from header
  const user_name = res.locals.user.dataValues.email_address;

  let id = req.body.id;
  let password = req.body.password;
  let first_name = req.body.first_name;
  let last_name = req.body.last_name;
  let reqUsername = req.body.username;
  let account_created = req.body.account_created;
  let account_updated = req.body.account_updated;

  //to validate and get hashed password
  if (password != null && pwdVAlidator.schema.validate(password)) {
    let hashedPass = bcrypt.hashSync(password, 10);
    password = hashedPass;
  } else if (password != null) {
    logger.error("Password should follow NIST standards");
    return res.status(400).json({
      msg: "Password should follow NIST standards",
    });
  }

  if (id != null || account_created != null || account_updated != null) {
    logger.error(
      "You cannot edit id, email, account_created and account_updated fields"
    );
    return res.status(400).json({
      msg:
        "You cannot edit id, email, account_created and account_updated fields",
    });
  } else if (
    first_name == null ||
    last_name == null ||
    reqUsername == null ||
    password == null ||
    reqUsername != user_name
  ) {
    logger.error("Invalid Request Body");
    return res.status(400).json({
      msg: "Bad Request",
    });
  } else {
    let dbtimer = new Date();
    db.users
      .update(
        {
          password: password,
          first_name: first_name,
          last_name: last_name,
          account_updated: moment().format("YYYY-MM-DD HH:mm:ss"),
        },
        {
          where: {
            email_address: user_name,
          },
        }
      )
      .then(() => {
        sdc.timing("Put.userdb.time", dbtimer);
        logger.info("Updated User details Successfully");
        res.status(204).json({ msg: "No content" });
      })
      .catch(() => {
        logger.error("Error while updating user details");
        res.status(400).json({ msg: "Bad Request" });
      });
  }
  sdc.timing("Put.user.time", timer);
});

//post new user
router.post("/user", (req, res) => {
  logger.info("inside /user ");
  sdc.increment("POST User API Triggered");
  let timer = new Date();
  let id = uuid.v1();
  let username = req.body.username;
  let password = req.body.password;
  let first_name = req.body.first_name;
  let last_name = req.body.last_name;
  //check if email exists in DB
  db.users
    .findOne({ where: { email_address: username } })
    .then(function (user) {
      if (user) {
        return res.status(400).json({
          msg:
            "A user with this email already exists. Please use another email",
        });
      } else if (
        username == null ||
        password == null ||
        first_name == null ||
        last_name == null
      ) {
        logger.error("All the fields are mandatory. Enter all the details");
        return res.status(400).json({ msg: "All the fields are mandatory" });
      } else {
        if (
          username != null &&
          password != null &&
          first_name != null &&
          last_name != null &&
          pwdVAlidator.schema.validate(password) &&
          emailValidator.validate(username)
        ) {
          const account_created = moment().format("YYYY-MM-DD HH:mm:ss");
          const account_updated = moment().format("YYYY-MM-DD HH:mm:ss");
          bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
            let dbtimer = new Date();
            db.users
              .create({
                id: id,
                email_address: req.body.username,
                password: hash,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                account_created: account_created,
                account_updated: account_updated,
              })
              // removing password from response payload
              .then((result) => {
                sdc.timing("Post.userdb.time", dbtimer);
                logger.info("User created successfully");
                res.status(201);
                const filtered = {
                  id: result.id,
                  first_name: result.first_name,
                  last_name: result.last_name,
                  username: result.email_address,
                  account_created: result.account_created,
                  account_updated: result.account_updated,
                };
                sdc.timing("Post.user.time", timer);
                return res.json(filtered);
              })
              .catch((err) => {
                logger.error(err);
                res.json(err);
              });
          });
        }
        if (!emailValidator.validate(username)) {
          logger.error("Email not valid. Enter valid email ID");
          return res
            .status(400)
            .json({ msg: "Please enter the correct email id" });
        }
        if (!pwdVAlidator.schema.validate(password)) {
          logger.error("Password does not follow NIST standards");
          return res.status(400).json({
            msg: "Please enter a password that follow NIST standards",
          });
        }
      }
    });
});

module.exports = router;
