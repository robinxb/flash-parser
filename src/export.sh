#!/bin/bash
srcPath=$(pwd)
pushd . > /dev/null
cd /tmp
if [ -f flash_parser.tmp ]
then
	rm flash_parser.tmp
fi
popd > /dev/null
echo "==========Export Images=========="
open exportFile.jsfl
cd /tmp
echo "==========Wait until done=========="
while [ ! -f flash_parser.tmp ]
do
	sleep 1
done
while read l
do
	outputPath=$(echo $l)
	# path=$(echo $(dirname $l) | awk '{print substr($1,8)}')
done < flash_parser.tmp
cd $outputPath
cd images
imgPath=$(pwd)
echo "==========Run TexturePacker=========="
rm t.* > /dev/null

TexturePacker --format json --data t.json --sheet t.png --premultiply-alpha --trim-mode None --disable-rotation  ./*.*
if [ $? != 0 ] || [ ! -f t.json ] || [ ! -f t.png ]
then
	echo "Error while run TexturePacker, exit."
	exit
fi
while [ ! -f t.json ]
do
	sleep 1
done
echo "==========Run ImageMagicka=========="
convert t.png t.ppm
convert t.png -channel A -separate t.pgm
echo "==========Parser Flash=============="
cd $srcPath
rm /tmp/flash_parser_main.jsfl > /dev/null
rm /tmp/flash_parser_done.tmp > /dev/null
touch /tmp/flash_parser_main.jsfl
echo "var jsonPath = \"file://"$imgPath"/t.json\"" > /tmp/flash_parser_main.jsfl
echo "var outputPath= \"file://"$outputPath"\"" >> /tmp/flash_parser_main.jsfl
cat main.jsfl >> /tmp/flash_parser_main.jsfl
open /tmp/flash_parser_main.jsfl
while [ ! -f /tmp/flash_parser_done.tmp ]
do
	sleep 1
done
echo "==========Do Some Cleaning =========="
cd $imgPath
mv t.pgm ../output.1.pgm
mv t.ppm ../output.1.ppm
rm t.json
rm t.png
rm /tmp/flash_parser_main.jsfl
rm /tmp/flash_parser_done.tmp
rm /tmp/flash_parser.tmp
echo "Successful DONE !"