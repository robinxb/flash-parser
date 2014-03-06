#!/bin/bash
rm -rf ./output
rm -rf /tmp/flash_parser
mkdir /tmp/flash_parser
cp exportFiles.jsfl /tmp/flash_parser/exportFiles.jsfl
cp main.jsfl /tmp/flash_parser/main.jsfl
cp lib.lua /tmp/flash_parser/lib.lua
cp cstep1.lua /tmp/flash_parser/cstep1.lua
cp cstep2.lua /tmp/flash_parser/cstep2.lua


cd /tmp

if [ -f ./flash_parser.tmp ]
then
	rm ./flash_parser.tmp
fi

open ./flash_parser/exportFiles.jsfl

while [ ! -f ./flash_parser.tmp ]
do
	sleep 1
done

while read l
do
	flashSrcPath=$(echo $l)
done < ./flash_parser.tmp 

rm ./flash_parser.tmp

cd flash_parser
TexturePacker --format json --data ./t.json --sheet ./t.png --premultiply-alpha  ./images/*.*
if [ $? != 0 ] || [ ! -f t.json ] || [ ! -f t.png ]
then
	echo "Error while run TexturePacker, exit."
	exit
fi
convert t.png t.ppm
convert t.png -channel A -separate t.pgm

mkdir /tmp/flash_parser/output
open main.jsfl
while [ ! -f ../flash_parser.tmp ]
do
	sleep 1
done
rm ../flash_parser.tmp

cd /tmp/flash_parser/output
filelist=`ls *.lua`
cd ..
rm -rf tempout
mkdir tempout
mkdir tempout/1
touch tempout/1/filelist.lua
echo "return {" >tempout/1/filelist.lua
for file in $filelist
do
	file=${file%.*}
	lua cstep1.lua "output."$file "tempout/1/"$file
	echo "\""$file"\"," >> tempout/1/filelist.lua
done
echo "}" >>tempout/1/filelist.lua

lua cstep2.lua "tempout/1/filelist" "tempout/1/" $1
# cp -R /tmp/flash_parser/output $flashSrcPath/output
rm -rf $flashSrcPath/output
mkdir $flashSrcPath/output
mkdir $flashSrcPath/output/singlefile
cp /tmp/flash_parser/final_output.lua $flashSrcPath/output/output.lua
cp -R /tmp/flash_parser/output $flashSrcPath/output/singlefile
cp -R /tmp/flash_parser/images $flashSrcPath/output/singlefile
cp /tmp/flash_parser/t.ppm $flashSrcPath/output/output.sc.1.ppm
cp /tmp/flash_parser/t.pgm $flashSrcPath/output/output.sc.1.pgm

# cd $flashSrcPath/output
# echo "return {" > output.lua
# filelist=`ls *.lua`
# for file in $filelist
# do
# 	sed -e '1d' $file | sed -e '$d' >> output.lua
# done
# echo "}" >> output.lua
