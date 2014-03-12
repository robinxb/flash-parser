Flash-parser
============

A simple flash file parser for exporting Flash to lua format.

------------

Usage
=====
Make sure you are using *MAC*, because the .sh file contains *open* command which only runs on MAC.

1. Install TexturePacker cmdtool.
2. Install ImageMagicka
3. Install Flash CC , due to JSFL API limit.
4. Open a flash file with FLASH CC.
5. Create animations using Flash.
6. Open Terminal, cd to the src folder, then type "./export.sh".
   If you want to combine animations using "action", you MUST remane the fla files like Chicken_Walk, Chicken_Idle. And also run the script using "./export.sh enable".
7. Select a folder where the fla files are.
8. After all images exported, select a folder to save the output
9. The useful output-files are named output.1.pgm, output.1.ppm, output.lua

For more information, read the doc named readme_flash_cn.doc

Enjoy!
_____

##### TODO
1. port to windows
2. support text and shape (when need)
3. Do not parse empty layers
4. Set Registration Point to top left automatically
5. Add an option to import a file for manually disable some elements's output.


##### Known Bugs
1. When There's a blank frame(contains no element), the lua script will run into an endless loop.
2. Opreations (skew/scale/rotate/animation etc.) directly to Bitmap elements will(must) cause unexpected apprearance.
