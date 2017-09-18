#!/bin/bash
BASEPATH="`dirname \"$0\"`"
BASEPATH="`(cd ${BASEPATH}/../ && pwd)`"
. ${BASEPATH}/bin/setenv.sh

kill -s INT `ps -ef | grep node | grep analysis | grep -v grep | awk '{print $2}'` >& /dev/null
sleep 1

LOGFILE=${BASEPATH}/logs/app.`date '+%Y%m%d'`.log
node --harmony -max-old-space-size=8192 $BASEPATH/app 
