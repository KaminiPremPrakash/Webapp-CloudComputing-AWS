const express = require("express");
const router = express.Router();
const uuid = require("uuid");
const aws = require("aws-sdk");
const basicAuth = require("../auth");
const moment = require("moment");
const db = require("../models");
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

//post a question
router.post("/question", basicAuth, (req, res) => {
  sdc.increment("POST question API Triggered");
  let timer = new Date();

  const user_name = res.locals.user.dataValues.email_address;

  let question_id = uuid.v1();
  let question_text = req.body.question_text;
  let categories = req.body.categories || [];
  if (
    question_text == "" ||
    question_text == undefined ||
    question_text == null
  ) {
    logger.error("question cannot be empty");
    res.status(400);
    res.json("question cannot be empty");
    res.next();
  }

  categories.map((cate) => {
    if (
      cate.category == "" ||
      cate.category == undefined ||
      cate.category == null
    ) {
      logger.error("Category cannot be empty");
      res.status(400);
      res.json("Category cannot be empty");
      res.next();
    }
  });

  let checkCategories = [];
  categories.map((ctgy) => {
    checkCategories.push(ctgy.category);
  });

  let hasDuplicates = (arr) => new Set(arr).size != arr.length;
  if (hasDuplicates(checkCategories)) {
    logger.error("You have one or more same categories");
    res.status(400);
    res.json("You have one or more same categories");
    res.next();
  }

  //get the user_id from DB
  let dbtimer = new Date();
  db.users.findOne({ where: { email_address: user_name } }).then((record) => {
    user_id = record.id;
    //creating the question
    db.question
      .create({
        question_id: question_id,
        created_timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
        updated_timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
        user_id: user_id,
        question_text: question_text,
      })
      .then(function (createdQues) {
        sdc.timing("Post.questiondb.time", dbtimer);
        promises = [];
        //creating category
        const cats = [];
        const categoryAlreadyPresent = [];
        for (let i = 0; i < categories.length; i++) {
          promises.push(
            db.category
              .findOne({ where: { category: categories[i].category } })
              .then((cat) => {
                if (cat) {
                  categoryAlreadyPresent.push(cat);
                } else {
                  let catObj = {
                    category_id: uuid.v1(),
                    category: categories[i].category.toLowerCase(),
                  };
                  cats.push(catObj);
                }
              })
          );
        }
        return Promise.all(promises)
          .then(function () {
            db.category.bulkCreate(cats, {}).then(function (createdCategory) {
              const currQuesCat = categoryAlreadyPresent.concat(
                createdCategory
              );

              createdQues
                .addCategory(currQuesCat)
                .then(function () {
                  db.question
                    .findOne({
                      where: { question_id: createdQues.question_id },
                      include: [
                        {
                          model: db.category,
                          as: "categories",
                          through: { attributes: [] },
                        },
                        { model: db.answer, as: "answers" },
                      ],
                    })
                    .then(function (result) {
                      let catmap = result.categories.map((val) => ({
                        category_id: val.category_id,
                        category: val.category,
                      }));

                      const filteredResult = {
                        question_id: result.question_id,
                        created_timestamp: result.created_timestamp,
                        updated_timestamp: result.updated_timestamp,
                        user_id: result.user_id,
                        question_text: result.question_text,
                        categories: catmap,
                        answers: [],
                      };
                      logger.info("Created Question Successfully");
                      sdc.timing("Post.question.time", timer);
                      res.json(filteredResult);
                    })
                    .catch((err) => {
                      logger.error(
                        "Trouble finding the question for response data"
                      );
                      res.json(err);
                    });
                })
                .catch((err) => {
                  logger.error("Trouble associating category to question");
                  res.json(err);
                });
            });
          })
          .catch((err) => {
            logger.error("Trouble finding category");
            res.json(err);
          });
      })
      .catch((err) => {
        logger.error(err);
        res.json(err);
      });
  });
});

//post an answer to a question
router.post("/question/:question_id/answer", basicAuth, (req, res) => {
  sdc.increment("POST answer API Triggered");
  let question_id = req.params.question_id;
  let answer_id = uuid.v1();
  let answer_text = req.body.answer_text;
  let timer = new Date();

  //Extract username from header
  const user_name = res.locals.user.dataValues.email_address;

  //get the user_id from DB
  db.users
    .findOne({ where: { email_address: user_name } })
    .then((record) => {
      user_id = record.id;
      if (
        answer_text == "" ||
        answer_text == null ||
        answer_text == undefined
      ) {
        logger.error("Answer text cannot be empty");
        res.status(400);
        res.json("Answer text cannot be empty");
      } else {
        let dbtimer = new Date();
        db.question
          .findOne({ where: { question_id: question_id } })
          .then((ques) => {
            if (ques) {
              logger.info("ques values " + JSON.stringify(ques));
              db.answer
                .create({
                  answer_id: answer_id,
                  question_id: question_id,
                  created_timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
                  updated_timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
                  user_id: user_id,
                  answer_text: answer_text,
                })
                .then((result) => {
                  db.users
                    .findOne({ where: { id: ques.user_id } })
                    .then((quser) => {
                      logger.info("my user values " + JSON.stringify(quser));
                      aws.config.update({ region: "us-east-1" });
                      let topic = {};
                      let ARN;
                      let sns = new aws.SNS();
                      sns.listTopics(topic, (err, data) => {
                        if (err) {
                          logger.error("err in sns listTopics", err);
                        } else {
                          ARN = data.Topics[0].TopicArn;

                          let params = {
                            TopicArn: ARN,
                            Message: `${quser.email_address},${
                              result.question_id
                            },${result.answer_id},${
                              result.answer_text
                            },${user_name},${"answer posted"}`,
                          };

                          logger.info("params --- " + JSON.stringify(params));
                          sns.publish(params, (err, data) => {
                            if (err) {
                              logger.error("error in publishing message", err);
                            } else {
                              logger.info("Request recieved!");
                            }
                          });
                        }
                      });

                      sdc.timing("Post.answerdb.time", dbtimer);
                      logger.info("Answer posted successfully");
                      res.status(201);
                      sdc.timing("Post.answer.time", timer);
                      return res.json(result);
                    })
                    .catch((err) => {
                      logger.error(err);
                      res.status(401);
                      res.json(
                        "Error finding the user who posted the question"
                      );
                    });
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(400);
                  res.json(err);
                });
            } else {
              logger.error("This question does not exist");
              res.status(400);
              res.json("This question does not exist");
            }
          })
          .catch(() => {
            logger.error("Error occured while finding question");
            res.json("Error occured while finding question");
          });
      }
    })
    .catch((err) => {
      logger.error(err);
      res.status(401);
      res.json(err);
    });
});

// update an answer
router.put(
  "/question/:question_id/answer/:answer_id",
  basicAuth,
  (req, res) => {
    sdc.increment("Put Answer API Triggered");
    let timer = new Date();
    let answer_id = req.params.answer_id;
    let question_id = req.params.question_id;
    let answer_text = req.body.answer_text;

    //Extract username from header
    const user_name = res.locals.user.dataValues.email_address;

    //get the user_id from DB
    let dbtimer = new Date();
    db.users.findOne({ where: { email_address: user_name } }).then((user) => {
      db.answer
        .findOne({ where: { answer_id: answer_id, question_id: question_id } })
        .then(function (answer) {
          if (user.id == answer.user_id && answer) {
            if (
              answer_text == "" ||
              answer_text == null ||
              answer_text == undefined
            ) {
              logger.error("Please provide an answer text to update answer");
              res.status(404);
              res.json("Please provide an answer text to update answer");
            } else {
              db.answer
                .update(
                  {
                    answer_text: answer_text,
                    updated_timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
                  },
                  {
                    where: { answer_id: answer_id, question_id: question_id },
                  }
                )
                .then(() => {
                  db.question
                    .findOne({ where: { question_id: question_id } })
                    .then((qfind) => {
                      logger.info(JSON.stringify(qfind));
                      db.users
                        .findOne({ where: { id: qfind.user_id } })
                        .then((quser) => {
                          logger.info(JSON.stringify(quser));
                          aws.config.update({ region: "us-east-1" });
                          let topic = {};
                          let ARN;
                          let sns = new aws.SNS();
                          sns.listTopics(topic, (err, data) => {
                            if (err) {
                              logger.error("err in sns listTopics", err);
                            } else {
                              ARN = data.Topics[0].TopicArn;

                              let params = {
                                TopicArn: ARN,
                                Message: `${
                                  quser.email_address
                                },${question_id},${answer_id},${answer_text},${user_name},${"answer updated"}`,
                              };

                              logger.info(
                                "params --- " + JSON.stringify(params)
                              );
                              sns.publish(params, (err, data) => {
                                if (err) {
                                  logger.error("error in SNS publish", err);
                                } else {
                                  logger.info("Request recieved!");
                                }
                              });
                            }
                          });
                          sdc.timing("Put.answerdb.time", dbtimer);
                          logger.info("Answer Updated successfully");
                          sdc.timing("Put.answer.time", timer);
                          res.json("answer updated");
                          res.status(204);
                        })
                        .catch(() => {
                          logger.error("trouble find user " + err);
                          res.status(400);
                          res.json(err);
                        });
                    })
                    .catch(() => {
                      logger.error("Trouble finding question");
                      res.status(400);
                      res.json(err);
                    });
                }) //
                .catch((err) => {
                  logger.error("Error while updating answer");
                  res.status(400);
                  res.json(err);
                });
            }
          } else if (!answer) {
            logger.error("No answer exist for this question");
            res.json("No answer exist for this question");
            res.status(404);
          } else {
            logger.error("You are not authorized to update this answer");
            res.status(403);
            res.json("You are not authorized to update this answer");
          }
        })
        .catch(() => {
          logger.error("Cannot update answer");
          res.status(403);
          res.json("Cannot update answer");
        });
    });
  }
);

router.delete(
  "/question/:question_id/answer/:answer_id",
  basicAuth,
  (req, res) => {
    sdc.increment("DELETE answer API Triggered");
    let timer = new Date();
    let answer_id = req.params.answer_id;
    let question_id = req.params.question_id;

    //Extract username from header
    const user_name = res.locals.user.dataValues.email_address;

    //get the current users userid from DB
    let dbtimer = new Date();
    db.users
      .findOne({ where: { email_address: user_name } })
      .then((user) => {
        db.answer
          .findOne({
            where: { question_id: question_id, answer_id: answer_id },
          })
          .then((answer) => {
            if (answer && answer.user_id == user.id) {
              db.answer
                .destroy({ where: { answer_id: answer_id } })
                .then((ans) => {
                  db.question
                    .findOne({ where: { question_id: question_id } })
                    .then((qfind) => {
                      logger.info("values a" + JSON.stringify(qfind));
                      db.users
                        .findOne({ where: { id: qfind.user_id } })
                        .then((quser) => {
                          logger.info("values b" + JSON.stringify(quser));
                          aws.config.update({ region: "us-east-1" });
                          let topic = {};
                          let ARN;
                          let sns = new aws.SNS();
                          sns.listTopics(topic, (err, data) => {
                            if (err) {
                              logger.error("err in sns listTopics", err);
                            } else {
                              ARN = data.Topics[0].TopicArn;

                              let params = {
                                TopicArn: ARN,
                                Message: `${
                                  quser.email_address
                                },${question_id},${answer_id},${
                                  ans.answer_text
                                },${user_name},${"answer deleted"}`,
                              };

                              logger.info(
                                "params --- " + JSON.stringify(params)
                              );
                              sns.publish(params, (err, data) => {
                                if (err) {
                                  logger.error("error in SNS publish", err);
                                  res
                                    .status(400)
                                    .json({ msg: "error in SNS publish" });
                                } else {
                                  logger.info("Request recieved!");
                                  return res
                                    .status(200)
                                    .json({ msg: "Request recieved!" });
                                }
                              });
                            }
                          });

                          sdc.timing("Delete.answerdb.time", dbtimer);
                          logger.info("Answer deleted successfully");
                          sdc.timing("Delete.answer.time", timer);
                          res.status(204);
                          res.json("Answer destroyed");
                        })
                        .catch(() => {
                          logger.error(
                            "Trouble finding user who posted question"
                          );
                          res.status(400);
                          res.json(err);
                        });
                    })
                    .catch(() => {
                      logger.error("Trouble finding question");
                      res.status(400);
                      res.json(err);
                    });
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(err);
                });
            } else if (!answer) {
              logger.error("No such answer found");
              res.status(404);
              res.json("No answer found");
            } else {
              logger.error("You are not authorized to delete it");
              res.status(403);
              res.json("You are not authorized to delete it");
            }
          });
      })
      .catch((err) => {
        logger.error(err);
        res.json(err);
      });
  }
);

// delete a question
router.delete("/question/:question_id", basicAuth, (req, res) => {
  sdc.increment("DELETE question API Triggered");
  let timer = new Date();
  let question_id = req.params.question_id;

  //Extract username from header
 const user_name = res.locals.user.dataValues.email_address;

  //get the current users userid from DB
  db.users.findOne({ where: { email_address: user_name } }).then((user) => {
    db.question
      .findOne({ where: { question_id: question_id } })
      .then((ques) => {
        if (user.id == ques.user_id && ques) {
          let dbtimer = new Date();
          db.question
            .destroy({ where: { question_id: question_id } })
            .then(() => {
              sdc.timing("Delete.questiondb.time", dbtimer);
              logger.info("Question deleted successfully");
              sdc.timing("Delete.question.time", timer);
              res.json("question destroyed");
              res.status(204);
            })
            .catch((err) => {
              logger.error(
                "Cannot delete question. This question has 1 or more answers associated to it."
              );
              res.status(400);
              res.json(
                "Cannot delete question. This question has 1 or more answers associated to it."
              );
            });
        } else if (!ques) {
          logger.error("No question exists");
          res.json("No question exists");
          res.status(400);
        } else {
          logger.error("You are not authorized to delete it");
          res.json("You are not authorized to delete it");
          res.status(403);
        }
      });
  });
});

//Update a question
router.put("/question/:question_id", basicAuth, (req, res) => {
  sdc.increment("PUT question API Triggered");
  let timer = new Date();

  //Extract username from header
  const user_name = res.locals.user.dataValues.email_address;

  let categories = req.body.categories || [];
  let question_id = req.params.question_id;
  let question_text = req.body.question_text;

  if (
    question_text == "" ||
    question_text == undefined ||
    question_text == null
  ) {
    logger.error("question cannot be empty");
    res.status(400);
    res.json("question cannot be empty");
    res.next();
  }

  categories.map((cate) => {
    if (
      cate.category == "" ||
      cate.category == undefined ||
      cate.category == null
    ) {
      logger.error("Category cannot be empty");
      res.status(400);
      res.json("Category cannot be empty");
      res.next();
    }
  });

  let checkCategories = [];
  categories.map((ctgy) => {
    checkCategories.push(ctgy.category);
  });

  let hasDuplicates = (arr) => new Set(arr).size != arr.length;
  if (hasDuplicates(checkCategories)) {
    logger.error("You have one or more same categories");
    res.status(400);
    res.json("You have one or more same categories");
    res.next();
  }

  //get the user_id from DB
  let dbtimer = new Date();
  db.users.findOne({ where: { email_address: user_name } }).then((record) => {
    db.question
      .findOne({
        where: { question_id: question_id },
        include: [
          {
            model: db.category,
            as: "categories",
            through: { attributes: [] },
          },
          { model: db.answer, as: "answers" },
        ],
      })
      //issue here
      .then((ques) => {
        if (ques && ques.user_id == record.id) {
          ques.removeCategories(ques.categories).then((count) => {});
          db.question
            .update(
              {
                updated_timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
                question_text: question_text,
              },
              { where: { question_id: question_id } }
            )
            .then(function () {
              promises = [];
              //creating category
              const cats = [];
              const categoryAlreadyPresent = [];
              for (let i = 0; i < categories.length; i++) {
                promises.push(
                  db.category
                    .findOne({ where: { category: categories[i].category } })
                    .then((cat) => {
                      if (cat) {
                        categoryAlreadyPresent.push(cat);
                      } else {
                        let catObj = {
                          category_id: uuid.v1(),
                          category: categories[i].category.toLowerCase(),
                        };
                        cats.push(catObj);
                      }
                    })
                );
              }
              return Promise.all(promises)
                .then(function () {
                  db.category
                    .bulkCreate(cats, {})
                    .then(function (createdCategory) {
                      const currQuesCat = categoryAlreadyPresent.concat(
                        createdCategory
                      );

                      ques
                        .addCategory(currQuesCat)
                        .then(function () {
                          db.question
                            .findOne({
                              where: { question_id: ques.question_id },
                              include: [
                                {
                                  model: db.category,
                                  as: "categories",
                                  through: { attributes: [] },
                                },
                                { model: db.answer, as: "answers" },
                              ],
                            })
                            .then(function (result) {
                              sdc.timing("Put.questiondb.time", dbtimer);
                              sdc.timing("Put.question.time", timer);
                              res.json(result);
                            })
                            .catch((err) => {
                              logger.error(
                                "Trouble finding the question for response data"
                              );
                              res.json(err);
                            });
                        })
                        .catch((err) => {
                          logger.error(
                            "Trouble associating category to question"
                          );
                          res.json(err);
                        });
                    });
                })
                .catch((err) => {
                  logger.error("Trouble finding category");
                  res.json(err);
                });
            });
        } else if (!ques) {
          logger.error("question not found");
          res.json("question not found");
        } else {
          logger.error("You are not authotrized to update the question");
          res.status(403);
          res.json("You are not authotrized to update the question");
        }
      });
  });
});

//get a question's answer
router.get("/question/:question_id/answer/:answer_id", (req, res) => {
  sdc.increment("GET answer API Triggered");
  let timer = new Date();
  let answer_id = req.params.answer_id;
  let question_id = req.params.question_id;
  let dbtimer = new Date();
  db.answer
    .findOne({
      where: { answer_id: answer_id, question_id: question_id },
      include: [
        {
          model: db.file,
          as: "attachments",
          attributes: { exclude: ["question_id", "answer_id"] },
          required: false,
        },
      ],
    })
    .then(function (ans) {
      if (ans) {
        sdc.timing("Get.answerdb.time", dbtimer);
        logger.info("Fetched answer successfully");
        sdc.timing("Get.answer.time", timer);
        res.status(200);
        res.json(ans);
      } else {
        logger.error("No answer found for this question");
        res.status(400);
        res.json("No answer found for this question");
      }
    })
    .catch(() => {
      logger.error("Error occured while finding answer");
      res.status(404);
      res.json("Error occured while finding answer");
    });
});

//get all questions
router.get("/questions", (req, res) => {
  let timer = new Date();
  sdc.increment("GET all questions API Triggered");
  let dbtimer = new Date();
  db.question
    .findAll({
      include: [
        { model: db.category, as: "categories", through: { attributes: [] } },
        {
          model: db.answer,
          as: "answers",
          include: [
            {
              model: db.file,
              as: "attachments",
              attributes: { exclude: ["question_id", "answer_id"] },
              required: false,
            },
          ],
        },
        {
          model: db.file,
          as: "attachments",
          attributes: { exclude: ["question_id", "answer_id"] },
          required: false,
        },
      ],
    })
    .then((record) => {
      logger.error("Fetched all questions successfully");
      sdc.timing("Get.allquestionsdb.time", dbtimer);
      sdc.timing("Get.allquestions.time", timer);
      res.status(200);
      res.json(record);
    })
    .catch((err) => {
      logger.error(err);
      res.status(404);
      res.json(err);
    });
});

// get a question
router.get("/question/:question_id", (req, res) => {
  sdc.increment("GET a question by Id API Triggered");
  let timer = new Date();
  let question_id = req.params.question_id;
  let dbtimer = new Date();
  db.question
    .findOne({
      where: { question_id: question_id },
      include: [
        { model: db.category, as: "categories", through: { attributes: [] } },
        {
          model: db.answer,
          as: "answers",
          include: [
            {
              model: db.file,
              as: "attachments",
              attributes: { exclude: ["question_id", "answer_id"] },
              required: false,
            },
          ],
        },
        {
          model: db.file,
          as: "attachments",
          attributes: { exclude: ["question_id", "answer_id"] },
          required: false,
        },
      ],
    })
    .then(function (question) {
      if (question) {
        logger.info("Found the question successfully");
        sdc.timing("Get.questiondb.time", dbtimer);
        sdc.timing("Get.question.time", timer);
        res.status(200);
        res.json(question);
      } else {
        logger.error("Question not found");
        res.status(404);
        res.json("Question not Found");
      }
    })
    .catch(() => {
      logger.error("Error occured finding the question");
      res.status(404);
      res.json("Error occured finding the question");
    });
});

module.exports = router;
