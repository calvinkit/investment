#!/bin/bash
BASEPATH="`dirname \"$0\"`"
BASEPATH="`(cd ${BASEPATH}/../ && pwd)`"
FEDSJAVA_PATH=/bns/feds/lib/linux_x86_64/fedsJava
export FEDSJAVA_PATH

NODEJS_HOME=/home/calvla/tmp/node-v8.11.1-linux-x64
export LD_LIBRARY_PATH=$FEDSJAVA_PATH:$LD_LIBRARY_PATH
export CLASSPATH=$FEDSJAVA_PATH/fedsJava.jar:$CLASSPATH
export PATH=$NODEJS_HOME/bin:$PATH
export BNS_CURVE_DIR=/bns/k2/data/npv/fedsCurves/day1_tom; 
