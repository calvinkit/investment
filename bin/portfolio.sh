BASEPATH="`dirname \"$0\"`"
BASEPATH="`(cd ${BASEPATH}/../ && pwd)`"
. ${BASEPATH}/bin/setenv.sh

cd ${BASEPATH}
(
node -max-old-space-size=8192 $BASEPATH/report $*
) | tee $BASEPATH/bin/portfolio.txt
#ssh sbtorsvr391 "/usr/sbin/sendmail cyk.lai@gmail.com <${BASEPATH}/bin/portfolio.txt"
rm ${BASEPATH}/bin/portfolio.txt
