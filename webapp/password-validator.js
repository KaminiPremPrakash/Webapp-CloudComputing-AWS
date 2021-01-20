const passwordValidator = require("password-validator");

// Create a schema
const schema = new passwordValidator();

// Add properties to it
schema
  .is()
  .min(9) // Minimum length 9
  .is()
  .max(50) // Maximum length 50
  .has()
  .uppercase() // Must have uppercase letters
  .has()
  .lowercase() // Must have lowercase letters
  .has()
  .digits(2) // Must have at least 2 digits
  .has()
  .not()
  .spaces() // Should not have spaces
  .is()
  .not()
  .oneOf(["Passw0rd", "Password123", "abc123", "123"]); // Blacklist these values

module.exports = {
  schema,
};
