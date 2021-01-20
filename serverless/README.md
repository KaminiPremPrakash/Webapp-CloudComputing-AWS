# serverless

Serverless computing with Lambda Function

Usage:

index.js file handles the code of lambda function which is getting invoked by an SNS source.

Github Workflow job triggers as soon as the function is updated and pushed to the repository.

Updated Lambda function is zipped and placed in S3 bucket for the lambda function new version update.

Lambda code is written in Nodejs with aws-sdk support to trigger email to the recipient when an answer is posted, updated or deleted
