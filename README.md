# Webapp-CloudComputing-AWS

## CSYE 6225 - Fall2020

Name : Kamini Prem Prakash
NUID : 001388352

## Q and A web application Endpoints

| Method | Endpoints                                                        | Info                          |
| ------ | ---------------------------------------------------------------- | ----------------------------- |
| GET    | **/v1/user/self**                                                | _Get user Information_        |
| PUT    | **/v1/user/self**                                                | _Update user information_     |
| POST   | **/v1/question/**                                                | _Post a new question_         |
| POST   | **/v1/question/{question_id}/answer**                            | _Post an Answer a question_   |
| PUT    | **/v1/question/{question_id}/answer/{answer_id}**                | _Update a question's answer_  |
| DELETE | **/v1/question/{question_id}/answer/{answer_id}**                | _Delete a question's answer_  |
| DELETE | **/v1/question/{question_id}**                                   | _Delete a question_           |
| PUT    | **/v1/question/{question_id}**                                   | _Update a question_           |
| POST   | **/v1/user**                                                     | _Create a user_               |
| GET    | **/v1/user/{id}**                                                | _Get user information_        |
| GET    | **/v1/question/{question_id}/answer/{answer_id}**                | _Get a question's answer_     |
| GET    | **/v1/questions**                                                | _Get all questions_           |
| GET    | **/v1/question/{question_id}**                                   | _Get a question_              |
| POST   | **/v1/question/{question_id}/file**                              | _Attach a file to a question_ |
| POST   | **/v1​/question​/{question_id}​/answer​/{answer_id}​/file**      | _Attach a file to an answer_  |
| DELETE | **/v1/question/{question_id}/file/{file_id}**                    | _Delete a file from question_ |
| DELETE | **/v1/question/{question_id}/answer/{answer_id}/file/{file_id}** | _Delete a file from answer_   |


# AWSEC2-Deployment

## Deploying a web application on AWS-EC2

[Web Application Code Repository]()

**Application Use Cases:**

* Q and A web application
* A file can be attached to a question or an answer.
* Related files/images are uploaded to Amazon S3 bucket with lifecycle policy of 30 days
* Files metadata is stored in RDS Instance itself for retrieval purpose
* User receives an email if someone has posted an answer to their question, updated it or deleted it via AWS Simple email service

**Tools and Technologies**

  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>AWS Services & Technologies</th>
      </tr>
    </thead>
    <tbody>
        <tr>
            <td>Web Application</td>
            <td>Node.js, Express.js, MySQL, Sequelize ORM, Shell Scripts, AWS-SDK</td>
        </tr>
          <tr>
            <td>Testing</td>
            <td>Jest framework, mocha, chai, JMeter for performance testing</td>
        </tr>
        <tr>
            <td>Infrastructure</td>
            <td>VPC, ELB, RDS, Lambda, DynamoDB, Route53, terraform, Custom AMI </td>
        </tr>
         <tr>
            <td>Metrics & Logging Service</td>
            <td>statsD, AWS Cloud-Watch, Log4js, Cloud-Watch Alarm </td>
        </tr>
         <tr>
            <td>Queue & Notification Service</td>
            <td>SQS, SNS, Lambda, SES, </td>
        </tr>
          <tr>
            <td>CI/CD Pipeline</td>
            <td>GitHub Workflow, AWS Code Deploy</td>
        </tr>
       <tr>
            <td>Security</td>
            <td>SSL/TLS , RDS Encryption</td>
        </tr>
    </tbody>
  </table>
  

## Infrastructure - Terraform

[Infrastructure Repository]()

* created custom VPC with network setup using terraform (Infrastructure as code)
* Attached Load balancers, auto scaling groups, SES, SQS and SNS services
* Created necessary service roles and policies for AWS resources
* Implemented Lambda function for emailing service 

## CI/CD Pipeline - AMI - Hashicorp Packer

[HashiCorp Packer Code Repository]()

* Built custom AMI using Hashicorp packer
* Created AMI template to share the image between multiple AWS accounts within organization

## CI/CD Pipeline - AWS Code Deployment

* Integrated Github repository with GitHub Workflow for continuous Integration
* Using Github Workflow artifact is copied to S3 bucket and code deployement is triggered on running instances of autoscaling group
* In-Place deployment configuration hooks are placed for routing the traffic during deployment


## Logging & Alerting - Cloud Watch Services

* Embedded statD to collect various metrics such as counter for APIs hits and API response time etc
* logged the info, errors and warnings using log4js and further mounted them in AWS cloud-watch for analysis
* Implemented CPU Utilization based alarms for changing number of instances in auto scaling group

## Serverless Computing - Lambda 

[Serverless Lambda Code Repository]()

* Implemented pub/sub mechanism with SNS and Lambda function
* user requesting for his due bills, puts a message onto the AWS SQS service
* SQS-Consumer in the application checks already existing entry for user in Dynamodb
* If no email has sent already, SQS consumer process the request and puts the response in SNS 
* Once message is published to SNS Topic, subscribed lambda function is trigged 
* Lambda delivers due bills email to requesting user and saves the entry in Dynamo DB with TTL of 60 minutes

![](Serverless.png)

# webapp

### Question and Answer Web Application

API Impementation with `Node.js`
Programming language : `Javascript`

External Libraries used:
1. UUID - for generating id fields
2. Bcrypt - for hashing out the passwords
3. basic-auth - Authentication module 
4. Sequelize - ORM for Node.js
5. mysql - dialect for sequelize
6. jest - for testing 

__Build & Deployment__
The application runs on AWS Cloud EC2 instance and is deployed via GitHub workflow.
As soon as there is a merge take place to the webapp repository, the build gets triggered and deployment takes place in AWS account.

*Github secrets that need to be set*

1. AWS_SECRET_KEY 
2. AWS_ACCESS_KEY
3. CODE_DEPLOY_BUCKET
4. AWS_REGION

**Command to import the SSL certificate for LoadBalancers**
`sudo aws acm import-certificate --certificate fileb://certificate.pem --certificate-chain fileb://certificate_chain.pem --private-key fileb://mysslcertificate.key --profile prod`


**Run the appication locally**
=========================================

*Steps*
1. Clone the repos locally 
2. Install node_modules using npm install
3. Run the application using 'npm run dev'
4. Test whether appliation is running or not at (http://localhost:3000/)

**Run the unit test cases**

Run 'npm test'


`Author: Kamini Prem Prakash` <br />
`Email: premprakash.k@northeastern.edu`


