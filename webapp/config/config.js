require("dotenv").config();
module.exports = {
  HOST: process.env.HOST,
  USER: process.env.DBUSER,
  PASSWORD: process.env.PASSWORD,
  DB: process.env.DB,
  BUCKET: process.env.AWS_BUCKET || "",
  REGION: process.env.S3REGION,
  dialect: "mysql",
  dialectOptions: {
    ssl: 'Amazon RDS',
    rejectUnauthorized: true,
  },
};
