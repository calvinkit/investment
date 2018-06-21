BASEPATH="`dirname \"$0\"`"
BASEPATH="`(cd ${BASEPATH}/../ && pwd)`"
. ${BASEPATH}/bin/setenv.sh

cd ${BASEPATH}
node -max-old-space-size=8192 $BASEPATH/report $* | tee $BASEPATH/bin/portfolio.txt
