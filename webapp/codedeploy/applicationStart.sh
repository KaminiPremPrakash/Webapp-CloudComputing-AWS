#!/bin/bash
pwd
whoami
# aws configure set default.region us-east-1
# aws configure list
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/home/ubuntu/cloudwatch-config.json -s
cd ~
sudo npm install
sudo nohup npm run dev > /dev/null 2> /dev/null < /dev/null &

