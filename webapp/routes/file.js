const express = require("express");
const router = express.Router();
const basicAuth = require("../auth");
const moment = require("moment");
const db = require("../models");
const { upload, deleteFromS3, getMetaDataFromS3 } = require("../image");
const e = require("express");
const singleUpload = upload.single("image");
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

//Attach a file to question
router.post("/question/:question_id/file", basicAuth, (req, res) => {
  sdc.increment("POST Image for Question API Triggered");
  let timer = new Date();

  //Extract username from header
  const user_name = res.locals.user.dataValues.email_address;
  const question_id = req.params.question_id;

  //get the user_id from DB
  let dbtimer = new Date();
  db.users.findOne({ where: { email_address: user_name } }).then((record) => {
    db.question
      .findOne({
        where: { question_id: question_id },
      })
      //issue here
      .then((ques) => {
        //question found and user id matches
        if (ques && ques.user_id == record.id) {
          let s3timer = new Date();
          singleUpload(req, res, (err) => {
            const s3obj = req.file.location;
            const values = s3obj.split("/");
            const fileId = values[6];
            const path =
              values[4] + "/" + values[5] + "/" + values[6] + "/" + values[7];
            const file_name = req.file.originalname;
            if (err) {
              return res.status(400).json({ msg: err });
            } else {
              if (req.file == null) {
                logger.error("Invalid Request body");
                return res.status(400).json({ msg: "Invalid Request body" });
              } else {
                getMetaDataFromS3(function (metadata) {
                  sdc.timing("UploadToS3.questionImage.time", s3timer);
                  if (metadata != null) {
                    db.file
                      .create({
                        file_name: file_name,
                        s3_object_name: path,
                        file_id: fileId,
                        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
                        question_id: question_id,
                      })
                      .then((file_created) => {
                        logger.info("File added to question successfully");
                        sdc.timing("Post.questionImagedb.time", dbtimer);
                        file_created.question_id = undefined;
                        sdc.timing("Post.questionImage.time", timer);
                        res.status(201);
                        res.json(file_created);
                      })
                      .catch((err) => {
                        res.status(400).json({
                          msg: err,
                        });
                      });
                  } else {
                    logger.error("Issue in getting metadata");
                    return res
                      .status(500)
                      .json({ msg: "Issue in getting metadata" });
                  }
                });
              }
            }
          });
        } else if (!ques) {
          logger.error("Question not found");
          res.json("question not found");
        } else {
          logger.error("You are not authotrized to add a file to the question");
          res.status(403);
          res.json("You are not authotrized to add a file to the question");
        }
      });
  });
});

//Attach a file to answer
router.post(
  "/question/:question_id/answer/:answer_id/file",
  basicAuth,
  (req, res) => {
    sdc.increment("POST Image to Answer API Triggered");
    let timer = new Date();
    //Extract username from header
    const user_name = res.locals.user.dataValues.email_address;
    const question_id = req.params.question_id;
    const answer_id = req.params.answer_id;

    //get the user_id from DB
    let dbtimer = new Date();
    db.users.findOne({ where: { email_address: user_name } }).then((record) => {
      db.answer
        .findOne({
          where: { question_id: question_id, answer_id: answer_id },
        })
        .then((answer) => {
          //question found and user id matches
          if (answer && answer.user_id == record.id) {
            let s3timer = new Date();
            singleUpload(req, res, (err) => {
              const s3obj = req.file.location;
              const values = s3obj.split("/");
              const fileId = values[6];
              const path =
                values[4] + "/" + values[5] + "/" + values[6] + "/" + values[7];
              const file_name = req.file.originalname;
              if (err) {
                return res.status(400).json({ msg: err });
              } else {
                if (req.file == null) {
                  logger.error("Invalid Request body");
                  return res.status(400).json({ msg: "Invalid Request body" });
                } else {
                  getMetaDataFromS3(function (metadata) {
                    sdc.timing("UploadToS3.answerImage.time", s3timer);
                    if (metadata != null) {
                      db.file
                        .create({
                          file_name: file_name,
                          s3_object_name: path,
                          file_id: fileId,
                          created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
                          answer_id: answer_id,
                        })
                        .then((file_created) => {
                          sdc.timing("Post.answerImagedb.time", dbtimer);
                          logger.info("File added to answer successfully");
                          file_created.answer_id = undefined;
                          sdc.timing("Post.answerImage.time", timer);
                          res.status(201);
                          res.json(file_created);
                        })
                        .catch((err) => {
                          logger.error(err);
                          res.status(400).json({
                            msg: err,
                          });
                        });
                    } else {
                      logger.error("Issue occured while getting metadata");
                      return res
                        .status(500)
                        .json({ msg: "Issue occured while getting metadata" });
                    }
                  });
                }
              }
            });
          } else if (!answer) {
            logger.error("Question not found");
            res.json("question not found");
          } else {
            logger.error("You are not authotrized to add a file to the answer");
            res.status(403);
            res.json("You are not authotrized to add a file to the answer");
          }
        });
    });
  }
);

//Delete question image
router.delete("/question/:question_id/file/:file_id", basicAuth, (req, res) => {
  sdc.increment("DELETE question Image API Triggered");
  let timer = new Date();
  const user_name = res.locals.user.dataValues.email_address;
  const file_id = req.params.file_id;

  //get the user_id from DB
  let dbtimer = new Date();
  db.users
    .findOne({ where: { email_address: user_name } })
    .then((record) => {
      db.file
        .findOne({
          where: { file_id: file_id },
        })
        .then((file) => {
          const values = file.s3_object_name.split("/");
          const userId = values[0];
          if (file && record.id == userId) {
            let s3timer = new Date();
            deleteFromS3(file.s3_object_name, function (resp) {
              sdc.timing("DeleteFromS3.questionImage.time", s3timer);
              if (resp != null) {
                db.file
                  .destroy({
                    where: {
                      file_id: file_id,
                    },
                  })
                  .then(() => {
                    sdc.timing("Delete.questionImagedb.time", dbtimer);
                    logger.info("file deleted from question");
                    sdc.timing("Delete.questionImage.time", timer);
                    res.json("file deleted from question");
                    res.status(204);
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(400);
                    res.json(err);
                  });
              } else {
                logger.error("Error deleting file. Check permissions");
                return res.status(400).json({
                  msg: "Error deleting file. Check permissions",
                });
              }
            });
          } else if (!file) {
            logger.error("File does not exist!");
            res.status(401).json({ msg: "File does not exist!" });
          } else {
            logger.error("You are not authorized to delete the question file");
            res.status(401).json({
              msg: "You are not authorized to delete the question file",
            });
          }
        })
        .catch(() => {
          logger.error("Error finding the file!");
          res.status(401).json({ msg: "Error finding the file!" });
        });
    })
    .catch(() => {
      logger.error("Error occured while finding this user");
      res.status(401).json({ msg: "Error occured while finding this user" });
    });
});

//Delete answer image
router.delete(
  "/question/:question_id/answer/:answer_id/file/:file_id",
  basicAuth,
  (req, res) => {
    sdc.increment("DELETE Answer Image API Triggered");
    let timer = new Date();
    const user_name = res.locals.user.dataValues.email_address;
    const file_id = req.params.file_id;

    //get the user_id from DB
    let dbtimer = new Date();
    db.users
      .findOne({ where: { email_address: user_name } })
      .then((record) => {
        db.file
          .findOne({
            where: { file_id: file_id },
          })
          .then((file) => {
            const values = file.s3_object_name.split("/");
            const userId = values[0];
            if (file && record.id == userId) {
              let s3timer = new Date();
              deleteFromS3(file.s3_object_name, function (resp) {
                sdc.timing("deleteFromS3.answerImage.time", s3timer);
                if (resp != null) {
                  db.file
                    .destroy({
                      where: {
                        file_id: file_id,
                      },
                    })
                    .then(() => {
                      logger.info("file deleted from answer");
                      sdc.timing("Delete.answerImageDb.time", dbtimer);
                      sdc.timing("Delete.answerImage.time", timer);
                      res.json("file deleted from answer");
                      res.status(204);
                    })
                    .catch((err) => {
                      res.status(400);
                      res.json(err);
                    });
                } else {
                  logger.error("Error deleting file. Check permissions");
                  return res.status(400).json({
                    msg: "Error deleting file. Check permissions",
                  });
                }
              });
            } else if (!file) {
              logger.error("file does not exist!");
              res.status(401).json({ msg: "file does not exist!" });
            } else {
              logger.error("You are not authorized to delete the answer file");
              res.status(401).json({
                msg: "You are not authorized to delete the answer file",
              });
            }
          })
          .catch(() => {
            logger.error("Error finding the file!");
            res.status(401).json({ msg: "Error finding the file!" });
          });
      })
      .catch(() => {
        logger.error("Error occured while finding this user");
        res.status(401).json({ msg: "Error occured while finding this user" });
      });
  }
);

module.exports = router;
