
#fetch credentials and other vars from variables.tf
provider "aws" {
  profile = var.profile
  region  = var.region
}

# 1. create vpc

resource "aws_vpc" "main" {
  cidr_block = var.cidr_block
  tags = {
    Name = var.vpc_name
  }
}

# 2 Create 3 subnets

# Subnet 1 for VPC
# Subnet should be assigned a public IP address (map_public_ip_on_launch= true)
resource "aws_subnet" "subnet1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.cidrs[0]
  availability_zone       = join("", [var.region, var.avzones[0]])
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.vpc_name}-subnet1"
  }
}

# Subnet 2 for VPC
resource "aws_subnet" "subnet2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.cidrs[1]
  availability_zone       = join("", [var.region, var.avzones[1]])
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.vpc_name}-subnet2"
  }
}

# Subnet 3 for VPC
resource "aws_subnet" "subnet3" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.cidrs[2]
  availability_zone       = join("", [var.region, var.avzones[2]])
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.vpc_name}-subnet3"
  }
}


# 3. create internet gateway

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.vpc_name}-igw"
  }
}


# 4. create custom route table
resource "aws_route_table" "route-table" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.vpc_name}-route-table"
  }
}

# 5 create public route

resource "aws_route" "public_route" {
  route_table_id         = aws_route_table.route-table.id
  gateway_id             = aws_internet_gateway.gw.id
  destination_cidr_block = "0.0.0.0/0"
}

# 6 Subnet association with route table

# Subnet route table association 1
resource "aws_route_table_association" "association1" {
  subnet_id      = aws_subnet.subnet1.id
  route_table_id = aws_route_table.route-table.id
}

# Subnet route table association 2
resource "aws_route_table_association" "association2" {
  subnet_id      = aws_subnet.subnet2.id
  route_table_id = aws_route_table.route-table.id
}

# Subnet route table association 3
resource "aws_route_table_association" "association3" {
  subnet_id      = aws_subnet.subnet3.id
  route_table_id = aws_route_table.route-table.id
}

# App security group//
resource "aws_security_group" "application" {
  name        = "application"
  description = "Security group for EC2 instance with web application"
  vpc_id      = aws_vpc.main.id
  ingress {
    protocol    = "tcp"
    from_port   = "22"
    to_port     = "22"
    cidr_blocks = ["0.0.0.0/0"]
  }
  # ingress {
  #   protocol    = "tcp"
  #   from_port   = "80"
  #   to_port     = "80"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }
  # ingress {
  #   protocol    = "tcp"
  #   from_port   = "443"
  #   to_port     = "443"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }
  ingress {
    protocol  = "tcp"
    from_port = "3000"
    to_port   = "3000"
    # cidr_blocks = ["0.0.0.0/0"]
    security_groups = [aws_security_group.sg_loadbalancer.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    "Name" = "application"
  }
}

# DB security group//
resource "aws_security_group" "database" {
  name        = "database"
  description = "Security group for RDS instance for database"
  vpc_id      = aws_vpc.main.id
  ingress {
    protocol        = "tcp"
    from_port       = "3306"
    to_port         = "3306"
    security_groups = [aws_security_group.application.id]
  }
  tags = {
    "Name" = "database"
  }
}

# creating s3 bucket//
resource "aws_s3_bucket" "s3_bucket" {
  bucket        = var.awsBucketName
  force_destroy = true
  lifecycle_rule {
    id      = "StorageTransitionRule"
    enabled = true
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

#iam role
resource "aws_iam_role" "ec2_role" {
  description        = "Policy for EC2 instance"
  name               = "tf-ec2-role"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17", 
  "Statement": [
    {
      "Action": "sts:AssumeRole", 
      "Effect": "Allow", 
      "Principal": {
        "Service": "ec2.amazonaws.com"
      }
    }
  ]
}
EOF
  tags = {
    "Name" = "ec2-iam-role"
  }
}

// Cloud Watch Agent Policy//
resource "aws_iam_role_policy_attachment" "ec2-cloudwatch-attach" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy_attachment" "ec2_SNS" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSNSFullAccess"
}

#policy document
data "aws_iam_policy_document" "policy_document" {
  version = "2012-10-17"
  statement {
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.s3_bucket.arn,
      "${aws_s3_bucket.s3_bucket.arn}/*",
      var.codedeploy_bucket_arn, var.codedeploy_bucket_arn_inside
    ]
  }
  depends_on = [aws_s3_bucket.s3_bucket]
}

#iam policy for role
resource "aws_iam_role_policy" "s3_policy" {
  name       = "tf-s3-policy"
  role       = aws_iam_role.ec2_role.id
  policy     = data.aws_iam_policy_document.policy_document.json
  depends_on = [aws_s3_bucket.s3_bucket]
}

#db subnet group for rds
resource "aws_db_subnet_group" "db_subnet_group" {
  description = "Subnet group for RDS"
  subnet_ids  = [aws_subnet.subnet1.id, aws_subnet.subnet2.id, aws_subnet.subnet3.id]
  tags = {
    "Name" = "db-subnet-group"
  }
}

#rds//
resource "aws_db_instance" "rds" {
  allocated_storage      = var.db_storage_size
  identifier             = var.db_identifier
  db_subnet_group_name   = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.database.id]
  instance_class         = var.db_instance_class
  engine                 = var.db_engine
  engine_version         = var.db_engine_version
  name                   = var.db_name
  username               = var.db_username
  password               = var.db_password
  publicly_accessible    = var.db_public_access
  multi_az               = var.db_multiaz
  skip_final_snapshot    = true
  // assign 10
  storage_encrypted    = true
  parameter_group_name = aws_db_parameter_group.performance_schema.name
  tags = {
    "Name" = "rds"
  }
}

#iam instance profile for ec2
resource "aws_iam_instance_profile" "ec2_profile" {
  role = aws_iam_role.ec2_role.name
}

//done
resource "aws_dynamodb_table" "csye6225" {
  name           = var.dynamoName
  billing_mode   = "PROVISIONED"
  read_capacity  = 10
  write_capacity = 5
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  ttl {
    attribute_name = "TimeToExist"
    enabled        = true
  }

  tags = {
    Name        = var.dynamoName
    Environment = "production"
  }
}




# ////////////////////////////////////////////////////////////

# Creating policy for code deploy EC2 to access S3
# CodeDeploy-EC2-S3 policy//change this
resource "aws_iam_policy" "code_deploy_policy" {
  name        = var.code_deploy_policy
  description = "Policy for EC2 instance to store and retrieve  artifacts in S3"
  policy      = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:Get*",
        "s3:List*"
      ],
      "Resource": ["${var.codedeploy_bucket_arn}" , "${var.codedeploy_bucket_arn_inside}", "arn:aws:s3:::kamini.lambda.bucket/*"]
    }
  ]
}
EOF 
}


# This policy allows Github actions to upload artifacts from latest successful build to dedicated S3 bucket used by CodeDeploy.
# GH-Upload-To-S3 policy
resource "aws_iam_policy" "ghactions_s3_upload_policy" {
  name        = var.gh_upload_policyname
  description = "Policy for Github actions script to store artifacts in S3"
  policy      = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:Get*",
        "s3:List*"
      ],
      "Resource": ["${var.codedeploy_bucket_arn}" , "${var.codedeploy_bucket_arn_inside}" ]
    }
  ]
}
EOF
}

# This policy allows GitHub Actions to call CodeDeploy APIs to initiate application deployment on EC2 instances
# GH-Code-Deploy
resource "aws_iam_policy" "ghactions_call_codedeployAPI" {
  name        = var.gh_codedeploy_policy
  description = "Policy for Github actions script to store artifacts in S3"
  policy      = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codedeploy:RegisterApplicationRevision",
        "codedeploy:GetApplicationRevision"
      ],
      "Resource": [
        "arn:aws:codedeploy:${var.region}:${data.aws_caller_identity.current.account_id}:application:${var.code_deploy_application_name}"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "codedeploy:CreateDeployment",
        "codedeploy:GetDeployment"
      ],
      "Resource": [
        "*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "codedeploy:GetDeploymentConfig"
      ],
      "Resource": [
        "arn:aws:codedeploy:${var.region}:${data.aws_caller_identity.current.account_id}:deploymentconfig:CodeDeployDefault.OneAtATime",
        "arn:aws:codedeploy:${var.region}:${data.aws_caller_identity.current.account_id}:deploymentconfig:CodeDeployDefault.HalfAtATime",
        "arn:aws:codedeploy:${var.region}:${data.aws_caller_identity.current.account_id}:deploymentconfig:CodeDeployDefault.AllAtOnce"
      ]
    }
  ]
}
EOF
}

#attach policies to ghactions user {GH-code-deploy, GH-Upload-To-S3}
resource "aws_iam_user_policy_attachment" "GH-code-deploy_attach" {
  user       = var.ghactions_username
  policy_arn = aws_iam_policy.ghactions_s3_upload_policy.arn
}

resource "aws_iam_user_policy_attachment" "GH-Upload-To-S3_attach" {
  user       = var.ghactions_username
  policy_arn = aws_iam_policy.ghactions_call_codedeployAPI.arn
}

# create Role for Code Deploy

# Creating IAM Role for code_deploy EC2//
resource "aws_iam_role" "codedeploy_ec2_instance" {
  name        = "CodeDeployEC2ServiceRole"
  description = "Role for ec2"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF

  tags = {
    Name = "CodeDeployEC2ServiceRole"
  }
}

// attach policy to CodeDeployEC2ServiceRole//
resource "aws_iam_role_policy_attachment" "ec2-s3-attach" {
  role       = aws_iam_role.codedeploy_ec2_instance.name
  policy_arn = aws_iam_policy.code_deploy_policy.arn
}


# create a service role for codedeploy
resource "aws_iam_role" "codedeploy_service" {
  name               = "CodeDeployServiceRole"
  description        = "Role for code deploy"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "codedeploy.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
  tags = {
    Name = "CodeDeployServiceRole"
  }
}

# attach AWS managed policy called AWSCodeDeployRole
# required for deployments which are to an EC2 compute platform
resource "aws_iam_role_policy_attachment" "codedeploy_service" {
  role       = aws_iam_role.codedeploy_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSCodeDeployRole"
}

//application and deployment
resource "aws_codedeploy_app" "cd-webapp" {
  name = "csye6225-webapp"
}

resource "aws_codedeploy_deployment_group" "cd-webapp-group" {
  app_name               = aws_codedeploy_app.cd-webapp.name
  deployment_group_name  = "csye6225-webapp-deployment"
  service_role_arn       = aws_iam_role.codedeploy_service.arn
  deployment_config_name = "CodeDeployDefault.AllAtOnce"
  autoscaling_groups     = [aws_autoscaling_group.web_server_group.name]

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [aws_lb_listener.ssl_listener.arn]
      }

      target_group {
        name = aws_lb_target_group.lb_tg_webapp.name
      }
    }
  }


  deployment_style {
    deployment_option = "WITHOUT_TRAFFIC_CONTROL"
    deployment_type   = "IN_PLACE"
  }

  ec2_tag_set {
    ec2_tag_filter {
      key   = "Name"
      type  = "KEY_AND_VALUE"
      value = var.appName
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }

}

# resource "aws_route53_record" "record" {
#   zone_id = var.zoneId
#   name    = var.record_name
#   type    = "A"
#   ttl     = "300"
#   records = [aws_instance.ec2.public_ip]
# }


# resource "aws_instance" "ec2" {
#   ami                  = var.ami
#   instance_type        = var.instance_type
#   subnet_id            = element([aws_subnet.subnet1.id, aws_subnet.subnet2.id, aws_subnet.subnet3.id], var.instance_subnet - 1)
#   key_name             = var.key_name
#   iam_instance_profile = aws_iam_instance_profile.ec2_profile.id
#   security_groups      = [aws_security_group.application.id]
#   ebs_block_device {
#     device_name           = "/dev/sda1"
#     volume_type           = var.instance_vol_type
#     volume_size           = var.instance_vol_size
#     delete_on_termination = true
#   }
#   user_data = <<EOF
# #!/bin/bash
# echo "# App Environment Variables"
# echo "HOST=${aws_db_instance.rds.address}" >> /etc/environment
# echo "DB=${var.db_name}" >> /etc/environment
# echo "DBUSER=${var.db_username}" >> /etc/environment
# echo "PASSWORD=${var.db_password}" >> /etc/environment
# echo "AWS_BUCKET=${var.awsBucketName}" >> /etc/environment
# echo "AWS_DEFAULT_REGION=${var.region}" >> /etc/environment
# chown -R ubuntu:www-data /var/www
# usermod -a -G www-data ubuntu
# EOF
#   tags = {
#     "Name" = "${var.appName}"
#   }
#   depends_on = [aws_db_instance.rds]
# }

// AutoscalingGroup Configuration//
resource "aws_launch_configuration" "asg_config" {
  name                        = "asg_launch_config"
  image_id                    = var.ami
  instance_type               = "t2.micro"
  key_name                    = var.key_name
  associate_public_ip_address = true
  root_block_device {
    volume_size           = 20
    volume_type           = "gp2"
    delete_on_termination = true
  }
  user_data            = <<-EOF
  #!/bin/bash
  echo "# App Environment Variables"
  echo "HOST=${aws_db_instance.rds.address}" >> /etc/environment
  echo "DB=${var.db_name}" >> /etc/environment
  echo "DBUSER=${var.db_username}" >> /etc/environment
  echo "PASSWORD=${var.db_password}" >> /etc/environment
  echo "AWS_BUCKET=${var.awsBucketName}" >> /etc/environment
  echo "AWS_DEFAULT_REGION=${var.region}" >> /etc/environment
  chown -R ubuntu:www-data /var/www
  usermod -a -G www-data ubuntu
  EOF
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.id
  security_groups      = [aws_security_group.application.id]
  depends_on           = [aws_db_instance.rds]

}

// AutoScaling Group//
resource "aws_autoscaling_group" "web_server_group" {
  name                 = "WebServerGroup"
  max_size             = 5
  min_size             = 3
  default_cooldown     = 60
  desired_capacity     = 3
  launch_configuration = aws_launch_configuration.asg_config.name
  vpc_zone_identifier  = [aws_subnet.subnet1.id, aws_subnet.subnet2.id, aws_subnet.subnet3.id]
  target_group_arns    = [aws_lb_target_group.lb_tg_webapp.arn]
  tags = [
    {
      key                 = "Name"
      value               = var.appName
      propagate_at_launch = true
    }
  ]
}

// ASG Scaleup policy//
resource "aws_autoscaling_policy" "web_server_scaleup_policy" {
  name                   = "WebServerScaleUpPolicy"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 60
  autoscaling_group_name = aws_autoscaling_group.web_server_group.name
}

// ASG Scaledown policy//
resource "aws_autoscaling_policy" "web_server_scaledown_policy" {
  name                   = "WebServerScaleDownPolicy"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 60
  autoscaling_group_name = aws_autoscaling_group.web_server_group.name
}

//Alarm for scaleup//
resource "aws_cloudwatch_metric_alarm" "cpu_alarm_high" {
  alarm_name          = "CPUAlarmHigh"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "60"
  statistic           = "Average"
  threshold           = "5"
  dimensions          = map("AutoScalingGroupName", aws_autoscaling_group.web_server_group.name)
  alarm_description   = "Scale-up if CPU > 5% for 1 minute"
  alarm_actions       = [aws_autoscaling_policy.web_server_scaleup_policy.arn]
}

// Alarm for scaledown//
resource "aws_cloudwatch_metric_alarm" "cpu_alarm_low" {
  alarm_name          = "CPUAlarmLow"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "60"
  statistic           = "Average"
  threshold           = "3"
  alarm_description   = "Scale-down if CPU < 3% for 1 minute"
  dimensions          = map("AutoScalingGroupName", aws_autoscaling_group.web_server_group.name)
  alarm_actions       = [aws_autoscaling_policy.web_server_scaledown_policy.arn]
}


// LoadBalancer Security Group//
resource "aws_security_group" "sg_loadbalancer" {
  name        = "LoadBalancer-Security-Group"
  description = "Enable HTTPS via port 3000"
  vpc_id      = aws_vpc.main.id

  # ingress {
  #   to_port     = 80
  #   from_port   = 80
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }

  ingress {
    to_port     = 443
    from_port   = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # egress {
  #   to_port     = 3000
  #   from_port   = 3000
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    Name = "sg_loadbalancer"
  }
}


// Application Load Balancer
resource "aws_lb" "app_lb" {
  name            = "app-load-balancer"
  subnets         = [aws_subnet.subnet1.id, aws_subnet.subnet2.id, aws_subnet.subnet3.id]
  security_groups = [aws_security_group.sg_loadbalancer.id]
  ip_address_type = "ipv4"
  tags = {
    Name = "app-load-balancer"
  }
}

// LoadBalancer Listener//
resource "aws_lb_listener" "alb_listener" {
  load_balancer_arn = aws_lb.app_lb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.lb_tg_webapp.arn
  }
}


//assignment 10
//lb ssl listener
resource "aws_lb_listener" "ssl_listener" {
  load_balancer_arn = aws_lb.app_lb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  depends_on        = [aws_lb_target_group.lb_tg_webapp]
  certificate_arn   = var.cert_ARN

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.lb_tg_webapp.arn
  }

}

resource "aws_db_parameter_group" "performance_schema" {
  name   = "performance-schema"
  family = "mysql5.7"

  parameter {
    name         = "performance_schema"
    value        = "1"
    apply_method = "pending-reboot"
  }
}


// app Target Group//
resource "aws_lb_target_group" "lb_tg_webapp" {
  name = "WebAppTargetGroup"
  health_check {
    interval            = 10
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    path                = "/"
  }
  deregistration_delay = 20
  port                 = 3000
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
}

///
data "aws_route53_zone" "primary" {
  name = var.record_name
}


// DNS Record//
resource "aws_route53_record" "dns_record" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = var.record_name
  type    = "A"
  alias {
    name                   = aws_lb.app_lb.dns_name
    zone_id                = aws_lb.app_lb.zone_id
    evaluate_target_health = false
  }
}


//Lambda - Assignment 9

resource "aws_iam_role" "lambda_sns_exe_role" {
  name               = "lambda-sns-execution-role"
  description        = "Role for lambda sns execution"
  assume_role_policy = <<EOF
{
    "Version" : "2012-10-17",
    "Statement" : [
			{
				"Action" : "sts:AssumeRole",
				"Principal" : {
					"Service" : "lambda.amazonaws.com"
				},
				"Effect" : "Allow"
			}
		]
  }
  EOF

}

resource "aws_iam_policy" "lambda_log_policy" {
  name        = "lambda_log_policy"
  description = "Policy for Updating Lambda logs to CloudWatch"
  policy      = <<EOF
{
    "Version":"2012-10-17",
    "Statement":[
      {
        "Action":[
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Effect":"Allow",
        "Resource":"arn:aws:logs:*:*:*"
      }
    ]
  }
  EOF
}


resource "aws_iam_role_policy_attachment" "lambda_dynamo" {
  role       = "${aws_iam_role.lambda_sns_exe_role.name}"
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

resource "aws_iam_role_policy_attachment" "lambda_route53" {
  role       = "${aws_iam_role.lambda_sns_exe_role.name}"
  policy_arn = "arn:aws:iam::aws:policy/AmazonRoute53FullAccess"
}

resource "aws_iam_role_policy_attachment" "lambda_SNS" {
  role       = "${aws_iam_role.lambda_sns_exe_role.name}"
  policy_arn = "arn:aws:iam::aws:policy/AmazonSNSFullAccess"
}

resource "aws_iam_role_policy_attachment" "lambda_SES" {
  role       = "${aws_iam_role.lambda_sns_exe_role.name}"
  policy_arn = "arn:aws:iam::aws:policy/AmazonSESFullAccess"
}

resource "aws_iam_role_policy_attachment" "lambda_S3" {
  role       = "${aws_iam_role.lambda_sns_exe_role.name}"
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_iam_role_policy_attachment" "lambda_cloudwatchlogs" {
  role       = "${aws_iam_role.lambda_sns_exe_role.name}"
  policy_arn = "${aws_iam_policy.lambda_log_policy.arn}"
}

resource "aws_iam_role_policy_attachment" "lambda_basicExecutionRole" {
  role       = "${aws_iam_role.lambda_sns_exe_role.name}"
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_DynamoDBExecutionRole" {
  role       = "${aws_iam_role.lambda_sns_exe_role.name}"
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaDynamoDBExecutionRole"
}

resource "aws_sns_topic" "email_request" {
  name = "email_request"
}

resource "aws_sns_topic_subscription" "email_request_sns" {
  topic_arn = "${aws_sns_topic.email_request.arn}"
  protocol  = "lambda"
  endpoint  = "${aws_lambda_function.send_email.arn}"
}

resource "aws_lambda_permission" "lambda_invoke_permission" {
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.send_email.function_name}"
  principal     = "sns.amazonaws.com"
  source_arn    = "${aws_sns_topic.email_request.arn}"

}

data "archive_file" "zipit" {
  type        = "zip"
  source_file = "lambdainitial.js"
  output_path = "lambdaFunction.zip"
}

# data "aws_s3_bucket_object" "s3data" {
#   bucket = "codedeploy.prod.kaminiprakash.me"
#   key    = "lambdaFunction.zip"
#   // source = "lambdaFunction.zip"
# }

resource "aws_lambda_function" "send_email" {
  # s3_bucket = "codedeploy.prod.kaminiprakash.me"
  # s3_key    = data.aws_s3_bucket_object.s3data.key
  filename      = "lambdaFunction.zip"
  function_name = var.lambdaFcnName
  role          = "${aws_iam_role.lambda_sns_exe_role.arn}"
  handler       = "index.handler"
  runtime       = "nodejs12.x"
  memory_size   = 512
  timeout       = 25
  // source_code_hash = "${base64sha256(file("lambdaFunction.zip"))}"
  # //filebase64sha256
  # source_code_hash = data.aws_s3_bucket_object.s3data.body
  # //filebase64sha256("file.zip") base64sha256(file("file.zip"))
  # // source_code_hash = base64sha256(data.aws_s3_bucket_object.s3data.key)
}


// S3 Bucket for Lambda
resource "aws_s3_bucket" "lambda_s3_bucket" {
  bucket        = var.lambdaBucket
  force_destroy = true
  acl           = "private"

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  lifecycle_rule {
    id      = "cleanup"
    enabled = true
    expiration {
      days = 60
    }
  }
  tags = {
    Name = "aws_lambda_s3_bucket"
  }
}

//policy to allow ghactions to access lambda
resource "aws_iam_policy" "ghactions_lambda_policy" {
  name        = "ghactions-lambda"
  description = "Policy which allows ghactions user to access lambda"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "lambda:*",
                "s3:*"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}

resource "aws_iam_user_policy_attachment" "ghactions-lambda-attach" {
  user       = var.ghactions_username
  policy_arn = aws_iam_policy.ghactions_lambda_policy.arn

}
