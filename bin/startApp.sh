#!/bin/bash
export HTTPS_PROXY=https://proxyprd.scotia-capital.com:8080
export HTTP_PROXY=http://proxyprd.scotia-capital.com:8080

BASEPATH="`dirname \"$0\"`"
BASEPATH="`(cd ${BASEPATH}/../ && pwd)`"
. ${BASEPATH}/bin/setenv.sh

echo "Killing old instance if it exists"
sleep 1
user=$(whoami)
folder=$(echo $BASEPATH | rev | cut -d '/' -f 1 | rev)
/bin/ps -ef | grep node | grep $user | grep $folder | grep -v grep | awk '{print $2}' # | xargs -I {} kill -9 {}
sleep 1
LOGFILE=${BASEPATH}/logs/app.`date '+%Y%m%d'`.log
touch $LOGFILE
node --harmony -max-old-space-size=8192 $BASEPATH/app | tee -a $LOGFILE
