BASEPATH="`dirname \"$0\"`"
BASEPATH="`(cd ${BASEPATH}/../ && pwd)`"
. ${BASEPATH}/bin/setenv.sh

cd $BASEPATH
(
echo Subject: Intraday
echo Content-Type: text/html
echo "<PRE>"
node $BASEPATH/analysis intraday [0,1,2,3]
echo "</PRE>"
) > $BASEPATH/bin/report.txt
ssh sbtorsvr391 "/usr/sbin/sendmail cyk.lai@gmail.com <$HOME/analysis/bin/report.txt"
rm ${BASEPATH}/bin/report.txt
