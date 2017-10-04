#!/bin/bash

node report Benchmark 16 2010-01-01 > Benchmark.txt &
node report RRSP 16 2010-01-01 > RRSP_details.txt &
node report Calvin 32 2010-01-01 > Calvin.txt &
node report RRSP 32 2010-01-01 > RRSP.txt &
node report Tania 32 2010-01-01 > Tania.txt &

wait

