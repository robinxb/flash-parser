#!/bin/bash
rm -rf ./output
rm -rf /tmp/flash_parser
mkdir /tmp/flash_parser
cp exportFiles.jsfl /tmp/flash_parser/exportFiles.jsfl
cp main.jsfl /tmp/flash_parser/main.jsfl
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
TexturePacker --format json --data ./t.json --sheet ./t.png --premultiply-alpha --trim-mode None --disable-rotation  ./images/*.*
if [ $? != 0 ] || [ ! -f t.json ] || [ ! -f t.png ]
then
	echo "Error while run TexturePacker, exit."
	exit
fi
convert t.png t.ppm
convert t.png -channel A -separate t.pgm


open main.jsfl
while [ ! -f ../flash_parser.tmp ]
do
	sleep 1
done
rm ../flash_parser.tmp

cp -R /tmp/flash_parser/output $flashSrcPath/output
cp /tmp/flash_parser/t.ppm $flashSrcPath/output/output.sc.1.ppm
cp /tmp/flash_parser/t.pgm $flashSrcPath/output/output.sc.1.pgm

cd $flashSrcPath/output
echo "return {" > output.lua
filelist=`ls *.lua`
for file in $filelist
do
	sed -e '1d' $file | sed -e '$d' >> output.lua
done
echo "}" >> output.lua
