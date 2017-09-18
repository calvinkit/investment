BASEPATH="`dirname \"$0\"`"
BASEPATH="`(cd ${BASEPATH}/../ && pwd)`"
. ${BASEPATH}/bin/setenv.sh

cd $BASEPATH
(
echo Subject: Start of day
echo Content-Type: text/html
echo "<PRE>"
node $BASEPATH/analysis historical [1,2,3,4]
echo "</PRE>"
) > $BASEPATH/bin/report.txt
ssh sbtorsvr391 "/usr/sbin/sendmail cyk.lai@gmail.com <$HOME/analysis/bin/report.txt"
rm ${BASEPATH}/bin/report.txt
