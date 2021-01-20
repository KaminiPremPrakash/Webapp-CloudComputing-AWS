# webapp

## CSYE 6225 - Fall2020

Name : Kamini Prem Prakash
NUID : 001388352

## Endpoints

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



**Run the appication locally**
=========================================

*Steps*
1. Clone the repos locally 
2. Install node_modules using npm install
3. Run the application using 'npm run dev'
4. Test whether appliation is running or not at (http://localhost:3000/)

**Run the unit test cases**

Run 'npm test'



