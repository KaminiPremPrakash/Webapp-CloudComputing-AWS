const express = require("express");
const app = express();
var bodyParser = require("body-parser");

const db = require("./models");
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const routes = require("./routes/apiRoutes");
const qa = require("./routes/qa");
const file = require("./routes/file");
app.use("/vi", routes);
app.use("/vi", qa);
app.use("/vi", file);
app.use("/", routes);

db.sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(" listening on " + PORT);
  });
});
