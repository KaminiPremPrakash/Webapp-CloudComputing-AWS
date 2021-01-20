const AWS = require("aws-sdk");
const ses = new AWS.SES();
const dynamoDB = new AWS.DynamoDB();
const route53 = new AWS.Route53();

AWS.config.update({ region: "us-east-1" });

exports.handler = (event, context) => {
  var message_data = event.Records[0].Sns.Message.split(",");
  const email = message_data[0];
  const questionId = message_data[1];
  const answerId = message_data[2];
  const action = message_data[3];

  const getItemObject = {
    TableName: "csye6225",
    Key: {
      id: { S: email },
    },
  };

  console.log("getItemObject", getItemObject);

  dynamoDB.getItem(getItemObject, (err, data) => {
    if (
      data.Item === undefined ||
      data.Item.ttl.N < Math.floor(Date.now() / 1000)
    ) {
      const putItemObject = {
        TableName: "csye6225",
        Item: {
          id: { S: email },
          token: { S: context.awsRequestId },
          ttl: { N: (Math.floor(Date.now() / 1000) + 900).toString() },
        },
      };
      dynamoDB.putItem(putItemObject, () => {});
      route53.listHostedZones({}, (err, data) => {
        let domainName = data.HostedZones[0].Name;
        domainName = domainName.substring(0, domainName.length - 1);
        let emailObject = {};

        if (action == "answer posted") {
          emailObject = {
            Destination: {
              ToAddresses: [email],
            },
            Message: {
              Body: {
                Text: {
                  Data:
                    " Click to check the answer: http://" +
                    domainName +
                    "/vi/question/" +
                    questionId +
                    "/answer/" +
                    answerId,
                },
              },
              Subject: {
                Data: "An answer has been POSTED on your question thread",
              },
            },
            Source: "noreply@" + domainName,
          };
        } else if (action == "answer updated") {
          emailObject = {
            Destination: {
              ToAddresses: [email],
            },
            Message: {
              Body: {
                Text: {
                  Data:
                    " Click to check the updated answer: http://" +
                    domainName +
                    "/vi/question/" +
                    questionId +
                    "/answer/" +
                    answerId,
                },
              },
              Subject: {
                Data: "An answer has been UPDATED on your question thread",
              },
            },
            Source: "noreply@" + domainName,
          };
        } else {
          emailObject = {
            Destination: {
              ToAddresses: [email],
            },
            Message: {
              Body: {
                Text: {
                  Data:
                    " Click to check: http://" +
                    domainName +
                    "/vi/question/" +
                    questionId +
                    "/answer/" +
                    answerId,
                },
              },
              Subject: {
                Data: "An answer has been DELETED from your question thread",
              },
            },
            Source: "noreply@" + domainName,
          };
        }

        ses.sendEmail(emailObject, () => {});
      });
    }
  });
};
