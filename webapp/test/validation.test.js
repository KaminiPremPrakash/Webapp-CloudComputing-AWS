const pwdVALidator = require("../password-validator");
const emailValidator = require("email-validator");

test("Testing password values", () => {
  expect(pwdVALidator.schema.validate("testAp@1")).toBe(false);
  expect(pwdVALidator.schema.validate("testAp@12")).toBe(true);
  expect(pwdVALidator.schema.validate("tesAp@12")).toBe(false);
  expect(pwdVALidator.schema.validate("abc123")).toBe(false);
  expect(pwdVALidator.schema.validate("12345")).toBe(false);
  expect(pwdVALidator.schema.validate("Ap@test123")).toBe(true);
});

test("Testing email values", () => {
  expect(emailValidator.validate("kp@@1")).toBe(false);
  expect(emailValidator.validate("kp@gmail.com")).toBe(true);
  expect(emailValidator.validate("1234")).toBe(false);
  expect(emailValidator.validate("abc@@@@")).toBe(false);
  expect(emailValidator.validate("12345;;")).toBe(false);
  expect(emailValidator.validate("Ap@yahoo.com@")).toBe(false);
  expect(emailValidator.validate("Ap@yahoo.com")).toBe(true);
});
