const db = require("./models");
const bcrypt = require("bcrypt");
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

async function auth(req, res, next) {
  sdc.increment("Authentication Check Triggered");
  var authHeader = req.headers.authorization;
  if (!authHeader) {
    logger.error("Unauthorized");
    res.setHeader("WWW-Authenticate", "Basic");
    res.status(401);
    res.json("You are not an authenticated user");
    next();
  }

  var auth = new Buffer.from(authHeader.split(" ")[1], "base64")
    .toString()
    .split(":");
  var username = auth[0];
  var password = auth[1];
  let dbtimer = new Date();
  db.users
    .findOne({
      where: {
        email_address: username,
      },
    })
    .then(function (user) {
      if (user != null) {
        bcrypt.compare(password, user.password, (err, result) => {
          if (result) {
            const { password, ...userWithoutPassword } = user;
            res.locals.user = userWithoutPassword;
            logger.info("User is Authorized Successfully");
            next();
          } else {
            logger.error("Unauthorized");
            res.status(401);
            res.setHeader("Content-Type", "application/json");
            res.json("You are not authenticated user");
          }
        });
      } else {
        logger.error("Unauthorized");
        res.setHeader("WWW-Authenticate", "Basic");
        res.status(401);
        res.setHeader("Content-Type", "application/json");
        res.json("You are not authenticated user");
      }
    })
    .catch(() => {
      res.status(400);
      res.setHeader("Content-Type", "application/json");
      res.json("Your request is valid but we encountered an issue");
    });
  sdc.timing("Get.userAuth.time", dbtimer);
}

module.exports = auth;
