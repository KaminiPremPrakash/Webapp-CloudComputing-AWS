const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
require("dotenv").config({ path: "./.env" });
const db = require("./models");
const uuid = require("uuid");

const s3 = new aws.S3();
var imageDir = "webapp.kamini.prakash";

let objId;
let upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: imageDir,
    key: function (req, file, cb) {
      const authHeader = req.headers.authorization;
      const credentials = Buffer.from(
        authHeader.split(" ")[1],
        "base64"
      ).toString();
      const index = credentials.indexOf(":");
      const user_name = credentials.substring(0, index);
      db.users
        .findOne({ where: { email_address: user_name } })
        .then((user) => {
          let filetypes = /jpeg|jpg|png/;
          let file_id = uuid.v1();
          let mimetype = filetypes.test(file.mimetype);
          if (mimetype) {
            let fileName = file.originalname.replace(/\s/g, "");
            objId =
              user.id +
              "/" +
              req.params.question_id +
              "/" +
              file_id +
              "/" +
              fileName +
              "_" +
              Date.now().toString();
            cb(null, objId);
          } else {
            cb(
              "Error: File upload only supports the following filetypes - " +
                filetypes
            );
          }
        })
        .catch(() => {
          res.status(400).json({
            msg: "Cant find user",
          });
        });
    },
  }),
});

function deleteFromS3(imageId, cb) {
  var params = {
    Bucket: imageDir,
    Key: imageId,
  };
  s3.deleteObject(params, function (err, data) {
    if (data) {
      cb(data);
    } else {
      cb(null);
    }
  });
}

function getMetaDataFromS3(cb) {
  var params = {
    Bucket: imageDir,
    Key: objId,
  };
  s3.headObject(params, function (err, data) {
    if (err) {
      cb(null);
    } else {
      cb(data);
    }
  });
}

module.exports = {
  upload,
  deleteFromS3,
  getMetaDataFromS3,
};
