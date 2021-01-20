#!/bin/bash
echo "getting the process id"
PID=`ps -eaf | grep "node server.js" | grep -v grep | awk '{print $2}'`
echo "process id not empty ? $PID"
if [[ "" !=  "$PID" ]]; then
  echo "Found node application running on $PID"
  echo "killing the process to stop application"
  echo "killing $PID"
  sudo kill -9 $PID
fi