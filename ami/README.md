# ami

AWS AMI for CSYE 6225 FALL 2020
Template for AMI for cloud

To validate run : packer validate ami.json

To run/build : packer build -var-file=./vars.json ami.json

To trigger workflow : Make a change and create a pull request. After merging the code, the build will trigger.
