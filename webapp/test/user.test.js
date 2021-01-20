const request = require("request");
test("@+2", () => {
  expect(2 + 2).toBe(4);
});

// describe("Check if user is authenticated for GET Req with correct credential", function () {
//   it("GET req test", function (done) {
//     var username = "test@gmail.com";
//     var password = "testAp@12";
//     var auth =
//       "Basic " + new Buffer.from(username + ":" + password).toString("base64");

//     var options = {
//       url: "http://localhost:3000/vi/user/self",
//       headers: {
//         Authorization: auth,
//       },
//     };

//     request.get(options, function (error, response) {
//       expect(response.statusCode).toEqual(200);
//       done();
//     });
//   });
// });

// describe("Check if user is authenticated for GET Req with false creadentials", function () {
//   it("GET req test", function (done) {
//     var username = "dummyusername";
//     var password = "dummypassword";
//     var auth =
//       "Basic " + new Buffer.from(username + ":" + password).toString("base64");

//     var options = {
//       url: "http://localhost:3000/vi/user/self",
//       headers: {
//         Authorization: auth,
//       },
//     };

//     request.get(options, function (error, response) {
//       expect(response.statusCode).toEqual(401);
//       done();
//     });
//   });
// });
