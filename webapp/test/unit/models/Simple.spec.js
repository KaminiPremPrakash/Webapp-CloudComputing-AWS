const {
  sequelize,
  dataTypes,
  checkModelName,
  checkPropertyExists,
} = require("sequelize-test-helpers");
const usermodel = require("../../../models/user");
describe(".../models/user", () => {
  const Model = usermodel(sequelize, dataTypes);
  const instance = new Model();
  checkModelName(Model)("users");
  describe("properties", () => {
    [
      "email_address",
      "password",
      "first_name",
      "last_name",
      "account_created",
      "account_updated",
    ].forEach(checkPropertyExists(instance));
  });
});
