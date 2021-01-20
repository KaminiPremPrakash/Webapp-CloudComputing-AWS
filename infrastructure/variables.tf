variable "profile" {
  description = "AWS profile name for CLI"
  default     = "prod"
}

variable "region" {
  description = "AWS region for infrastructure."
  default     = "us-east-1"
}

variable "vpc_name" {
  description = "VPC name tag value."
  default     = "prod"
}

variable "cidr_block" {
  description = "CIDR block for VPC."
  default     = "10.0.0.0/16"
}

variable "cidrs" {
  description = "CIDR blocks for subnets."
  default     = ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]
}

variable "avzones" {
  description = "Availability zones for subnets."
  default     = ["a", "b", "c"]
}

variable "db_storage_size" {
  description = "DB storage size."
  type        = number
  default     = 20
}

variable "db_instance_class" {
  description = "Instance class for RDS"
  default     = "db.t3.micro"
}

variable "db_engine" {
  description = "DB engine for RDS"
  default     = "mysql"
}

variable "db_engine_version" {
  description = "DB engine version for RDS"
  default     = "5.7.22"
}

variable "db_name" {
  description = "DB name"
  default     = "csye6225"
}

variable "db_username" {
  description = "DB username"
  default     = "csye6225fall2020"
}

variable "db_password" {
  description = "DB password"
  default     = "csye6225fall2020"
}

variable "db_public_access" {
  description = "DB public accessibility"
  type        = bool
  default     = false
}

variable "db_multiaz" {
  description = "DB multi AZ"
  type        = bool
  default     = false
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "instance_vol_type" {
  description = "EC2 volume type"
  type        = string
  default     = "gp2"
}

variable "instance_vol_size" {
  description = "EC2 volume size"
  type        = number
  default     = 20
}


variable "ami" {
  description = "AMI to create instance from"
  type        = string
}

variable "key_name" {
  description = "Name of key"
  type        = string
  default     = "Prod-key"
}

variable "instance_subnet" {
  description = "EC2 subnet serial"
  type        = number
  default     = 1
}

variable "dynamoName" {
  description = "Name for the Dynamo DB"
  type        = string
  default     = "csye6225"
}

variable "awsBucketName" {
  description = "Name for the AWS S3 bucket"
  type        = string
  default     = "webapp.kamini.prakash"
}

variable "db_identifier" {
  description = "Name for the DB instance identifier"
  type        = string
  default     = "csye6225-f20"
}

variable "code_deploy_policy" {
  description = "Name for code deploy EC2 Policy"
  type        = string
  default     = "CodeDeploy-EC2-S3"
}
variable "gh_upload_policyname" {
  description = "Name for policy to upload artifacts to s3"
  type        = string
  default     = "GH-Upload-To-S3"
}
variable "gh_codedeploy_policy" {
  description = "Name for the policy to call codedeploy API "
  type        = string
  default     = "GH-Code-Deploy"
}

//to b passed correct value later
variable "code_deploy_application_name" {
  description = " Code deploy Application name "
  type        = string
  default     = "csye6225-webapp"
}


variable "codedeploy_bucket_arn" {
  description = " Enter bucket arn like arn:aws:s3:::codedeploy.prod.kaminiprakash.me"
  type        = string
}


data "aws_caller_identity" "current" {}

variable "codedeploy_bucket_arn_inside" {
  description = " Enter bucket arn e.g arn:aws:s3:::codedeploy.prod.kaminiprakash.me/*"
  type        = string
}


variable "ghactions_username" {
  description = "ghactions username"
  type        = string
  default     = "ghactions"
}


variable "appName" {
  description = "Enter the app name for code deploy"
  type        = string
  default     = "csye6225-ec2"
}

variable "record_name" {
  description = "Enter Record Name ex: dev.kaminiprakash.me"
  default     = "prod.kaminiprakash.me"
}

variable "lambdaFcnName" {
  description = "Enter Lambda Function name"
  type        = string
  default     = "QandA"
}
variable "lambdaBucket" {
  description = "Enter the bucket name for Lambda zip"
  type        = string
  default     = "kamini.lambda.bucket"
}

variable "cert_ARN" {
  description = "Enter the certificate ARN"
  type        = string

}

