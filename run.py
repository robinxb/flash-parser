#-*- coding:utf-8 -*-
import os
import platform
import shutil
import time
import sys
import codecs
import inspect
import getopt
import math
this_file = inspect.getfile(inspect.currentframe())
DIR_PATH = os.path.abspath(os.path.dirname(this_file))
SEP = os.path.sep

sys.path.append(DIR_PATH + SEP + 'scripts') 
import handleCombine as HC

opts, args = getopt.getopt(sys.argv[1:], "i:o:n:xts:", ["help", "extend-name="])
FLASH_ROOT = ""
OUTPUT_PATH = ""
OUTPUT_NAME = "flash"
bLeaveXML = False
bUsePathTree = False
SCALE = 1
EXTEND_NAME = ""
for op, value in opts:
	if op == "-i":
		FLASH_ROOT = value
	elif op == "-o":
		OUTPUT_PATH = value
	elif op == "-n":
		OUTPUT_NAME = value
	elif op == "-x":
		bLeaveXML = True
	elif op == "-t":
		bUsePathTree = True
        elif op == '-s':
                SCALE = value
	elif op == '--help':
		print ('-i input folder')
		print ('-o output folder')
		sys.exit()
        elif op == "--extend-name":
            EXTEND_NAME = value

global sysOpen
TMP_FOLDER_NAME = "__tmp"
SCRIPT_PATH = DIR_PATH + SEP + 'scripts'
OUTPUT_PATH = OUTPUT_PATH or DIR_PATH + SEP + 'output'
FLASH_ROOT = FLASH_ROOT or DIR_PATH + SEP + 'input'
FLASH_ROOT = os.path.realpath(FLASH_ROOT)
OUTPUT_PATH = os.path.realpath(OUTPUT_PATH)
LEAVE_FILE = ['%s.1.ppm'%OUTPUT_NAME, '%s.1.pgm'%OUTPUT_NAME, '%s.lua'%OUTPUT_NAME]
if bLeaveXML:
	LEAVE_FILE.append('combine.xml')

if not os.path.exists(OUTPUT_PATH):
	os.makedirs(OUTPUT_PATH)

class MainTree():
	def __init__(self, path):
		self.mainpath = path
		self.folders = {}
		self.files = []
		self.tmpPath = self.mainpath + '/' + TMP_FOLDER_NAME
		for root, dirs, files in os.walk(path):
			self.SaveFiles(files)
			self.ParseDirs(dirs)
			dirs[:] = []

	def SaveFiles(self, fileTuple):
		for k in fileTuple:
			if k[-4:] == '.fla':
				self.files.append(self.mainpath + '/' + k)

	def ParseDirs(self, dirs):
		for k in dirs:
			self.folders[k] = MainTree(self.mainpath + '/' + k)

	def Export(self):
		for k in self.files:
			if os.path.exists(self.tmpPath):
				shutil.rmtree(self.tmpPath)
			os.mkdir(self.tmpPath)
			self.CopyScript(self.tmpPath)
		if len(self.files) > 0:
			# pngs
			os.system(sysOpen + ' ' + self.tmpPath + '/exportFiles.jsfl')
			self.WaitJSDone('done', True)

			#TP
                        self.PreHandleMirror()
			self.TexturePacker()
			self.WaitJSDone('%s.png'%OUTPUT_NAME)
			self.ImageMagicka()
                        self.WriteOriginImgSizeInfo()

			#xml
			os.system(sysOpen + ' ' + self.tmpPath + '/main.jsfl')
			self.WaitJSDone('done', True)

			self.Combine()
			self.CopyUsefulFiles()
                        self.Clean()

		for (k,v) in self.folders.items():
			v.Export()

	def WaitJSDone(self, filename, bRemove = False):
		while(not os.path.exists(self.tmpPath + '/%s'%filename)):
			time.sleep(1)
		if bRemove:
			os.remove(self.tmpPath + '/%s'%filename)

	def CopyUsefulFiles(self):
		for filename in LEAVE_FILE:
			if os.path.exists(self.tmpPath + '/%s'%filename):
				name, ext = os.path.splitext(filename)
				if ext == ".ppm" or ext == ".pgm":
					ext = ".1" + ext
                                ext = EXTEND_NAME + ext
				dirname = os.path.dirname(self.tmpPath.replace('\\', '/'))
				names = dirname.split('/')
				output_filename = names[len(names) - 1] + ext
				if bUsePathTree:
					path_tree = self.mainpath .replace(FLASH_ROOT, '')
					if not os.path.exists(OUTPUT_PATH + path_tree):
						os.makedirs(OUTPUT_PATH + path_tree)
					shutil.copy(self.tmpPath + '/%s'%filename, OUTPUT_PATH + path_tree + '/%s'%output_filename)
				else:
					shutil.copy(self.tmpPath + '/%s'%filename, OUTPUT_PATH + '/%s'%output_filename)


	def Clean(self):
		if os.path.exists(self.tmpPath):
			shutil.rmtree(self.tmpPath)

	def Combine(self):
		bExist = False
		filepath = self.tmpPath + '/combine.xml'
		for root, dirs, files in os.walk(self.tmpPath):
			for k in files:
				if not k[-4:] == '.xml':
					continue
				if not bExist:
					bExist = True
					handle = codecs.open(filepath, 'a')
					handle.write('<root>\n')
					handle.close()
				src = codecs.open(root + '/' +k, 'r')
				content = src.read()
				handle = codecs.open(filepath, 'a')
				handle.write(content)
				handle.write('\n')
				handle.close()
			break
		if bExist:
			handle = codecs.open(filepath, 'a')
			handle.write('</root>\n')
			handle.close()
			self.hc = HC.Handler(filepath.replace('\\','/'))
			self.hc.Export(self.tmpPath.replace('\\','/') + '/%s.lua'%OUTPUT_NAME)

        def PreHandleMirror(self):
            self.originImgSize = {}
            tpath = self.tmpPath
            imgpath = self.tmpPath + '/singleimg'
            sysType = platform.system()
            if sysType == "Windows":
                tpath = tpath.replace('/','\\')
                imgpath = imgpath.replace('/','\\')
            files = os.listdir(imgpath)
            for k in files:
                cmd = 'identify -format "%%[fx:w]x%%[fx:h]" %s'%(imgpath + '%s%s'%(os.path.sep ,k))
		if sysType == "Windows":
                    cmd = 'identify.exe -format "%%[fx:w]x%%[fx:h]" %s'%(imgpath + '%s%s'%(os.path.sep ,k))

                imgSizeStr = self.ExecuteCmd(cmd)
                assert(imgSizeStr)
                w, h = imgSizeStr.split('x')
                w, h = int(w), int(h)
                self.originImgSize[k] = '{"w": %s, "h":%s}'%(w, h)
                if k.find('_UD') >= 0:
                    self.SetTransparent(imgpath, k, math.ceil(w / 2.0), math.ceil(h / 2.0) , "southwest")
                    self.SetTransparent(imgpath, k, math.ceil(w / 2.0), math.ceil(h / 2.0) , "southeast")
                elif k.find('_LR') >= 0:
                    self.SetTransparent(imgpath, k, math.ceil(w / 2.0) , math.ceil(h / 2.0), "northeast")
                    self.SetTransparent(imgpath, k, math.ceil(w / 2.0) , math.ceil(h / 2.0), "southeast")
                elif k.find('_C') >= 0:
                    self.SetTransparent(imgpath, k, math.ceil(w / 2.0), math.ceil(h / 2.0), "northeast")
                    self.SetTransparent(imgpath, k, math.ceil(w / 2.0), math.ceil(h / 2.0), "southeast")
                    self.SetTransparent(imgpath, k, math.ceil(w / 2.0), math.ceil(h / 2.0), "southwest")

        def SetTransparent(self, imgpath, filename, w, h, gravity):
            if w <= 0 or h <= 0:
                return

            self.CreateTransparentImg(w, h, imgpath)
            cmd = "convert %s -compose dstout -gravity %s %s -alpha set -composite %s"
            cmd = cmd%(
                    imgpath + os.path.sep + filename,
                    gravity,
                    imgpath + os.path.sep + "__transparent_temp_img.png",
                    imgpath + os.path.sep + filename
                    )
            self.ExecuteCmd(cmd)
            os.remove(imgpath + os.path.sep + "__transparent_temp_img.png")

        def CreateTransparentImg(self, w, h, path):
            cmd = "convert -size %dx%d xc:rgba\\(255,255,255,255\\) %s__transparent_temp_img.png"
            cmd = cmd%(w, h, path + os.path.sep)
            self.ExecuteCmd(cmd)
            return "__transparent_temp_img.png"

        def ExecuteCmd(self, cmd):
            return os.popen(cmd).read()

	def ImageMagicka(self):
		convert_path = SCRIPT_PATH + SEP + 'convert '
		if sysType == "Windows":
			convert_path = SCRIPT_PATH + SEP + 'convert.exe '
		cmd = convert_path + self.tmpPath + SEP + "%s.png "%OUTPUT_NAME + self.tmpPath + SEP + "%s.1.ppm"%OUTPUT_NAME
		cmd2 = convert_path + self.tmpPath + SEP + "%s.png "%OUTPUT_NAME  + ' -channel A -separate %s.1.pgm'%(self.tmpPath + SEP + OUTPUT_NAME)
		os.system(cmd.encode('cp936'))
		while(not os.path.exists(self.tmpPath + '/%s.1.ppm'%OUTPUT_NAME)):
			time.sleep(1)
		os.system(cmd2.encode('cp936'))

	def TexturePacker(self):
		tpath = self.tmpPath 
		sysType = platform.system()
		if sysType == "Windows":
			tpath = tpath.replace('/','\\')

		cmd = ' '.join([
		        'TexturePacker',
		        '--algorithm MaxRects',
		        '--maxrects-heuristics Best',
		        '--pack-mode Best',
                        '--scale %s'%SCALE,
		        '--premultiply-alpha',
		        '--sheet %s' %(tpath + os.path.sep + '%s.png'%OUTPUT_NAME),
		        '--texture-format png',
                        '--extrude 1',
		        '--data %s' % (tpath + os.path.sep + '%s.json'%OUTPUT_NAME),
		        '--format json',
                        '--trim-mode Trim',
                        '--size-constraints AnySize',
                        #'--shape-debug',
		        '%s' %  (tpath + os.path.sep + 'singleimg')
		        ])

		os.system(cmd.encode('cp936'))

        def WriteOriginImgSizeInfo(self):
            content = "{"
            for k,v in self.originImgSize.items():
                content += '"%s" : %s,\n'%(k, v)
            content += "}"
            handle = open(self.mainpath + '/' + TMP_FOLDER_NAME + '/originsize.json', 'w')
            handle.write(content)
            handle.close()

	def CopyScript(self, path):
		handle = open(SCRIPT_PATH + '/exportFiles.jsfl')
		content = handle.read()
		handle.close()

		header = "var publishFolder = '%s'; \n"%(self.mainpath.replace('\\','/'))
		footer = """batToDo(publishFolder);
FLfile.write("file:///%s",FLfile.uriToPlatformPath(publishFolder) + "\\n");"""%(self.mainpath.replace('\\','/') + '/' + TMP_FOLDER_NAME + '/done')
		content = header + content + footer
		handle = open(self.mainpath + '/' + TMP_FOLDER_NAME + '/exportFiles.jsfl', 'w')
		handle.write(content)
		handle.close()

		handle = open(SCRIPT_PATH + '/main.jsfl')
		content = handle.read()
		handle.close()

		header = 'eval("var JSONFILE = " + FLfile.read("file:///%s/%s.json"));\n'%(self.tmpPath.replace('\\','/'), OUTPUT_NAME)
		header += 'eval("var ORIGIN_SIZE = " + FLfile.read("file:///%s/%s.json"));\n'%(self.tmpPath.replace('\\','/'), "originsize")
		footer = "var publishFolder = '%s'; \n"%(self.mainpath.replace('\\','/'))
		footer += "var tmpPath = '%s';\n"%(self.tmpPath.replace('\\','/'))
		footer += """batToDo(publishFolder, tmpPath);
FLfile.write("file:///%s",FLfile.uriToPlatformPath(publishFolder) + "\\n");"""%(self.mainpath.replace('\\','/') + '/' + TMP_FOLDER_NAME + '/done')
		content = header + content + footer
		handle = open(self.mainpath + '/' + TMP_FOLDER_NAME + '/main.jsfl', 'w')
		handle.write(content)
		handle.close()

	def Run(self):
		self.Export()


def loadFiles():
	root = MainTree(FLASH_ROOT)
	return root

if __name__ == '__main__':
	sysType = platform.system()
	if sysType == "Darwin":
		sysOpen = "open"
	elif sysType == "Windows":
		sysOpen = "start"
	else:
		raise("System not support: ", sysType )

	root = loadFiles()
	root.Run()

