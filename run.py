#-*- coding:utf-8 -*-
import os
import platform
import shutil
import time
import sys
import codecs
import inspect
import getopt
this_file = inspect.getfile(inspect.currentframe())
DIR_PATH = os.path.abspath(os.path.dirname(this_file))
SEP = os.path.sep

sys.path.append(DIR_PATH + SEP + 'scripts') 
import handleCombine as HC

opts, args = getopt.getopt(sys.argv[1:], "hi:o:n:xt")
FLASH_ROOT = ""
OUTPUT_PATH = ""
OUTPUT_NAME = "flash"
bLeaveXML = False
bUsePathTree = False
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
	elif op == '-h':
		print ('-i input folder')
		print ('-o output folder')
		sys.exit()
global sysOpen
TMP_FOLDER_NAME = "__tmp"
SCRIPT_PATH = DIR_PATH + SEP + 'scripts'
OUTPUT_PATH = OUTPUT_PATH or DIR_PATH + SEP + 'files'
FLASH_ROOT = FLASH_ROOT or DIR_PATH + SEP + 'files'
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
			self.TexturePacker()
			self.WaitJSDone('%s.png'%OUTPUT_NAME)
			self.ImageMagicka()

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
				dirname = os.path.dirname(self.tmpPath)
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
		        '--premultiply-alpha',
		        '--sheet %s' %(tpath + os.path.sep + '%s.png'%OUTPUT_NAME),
		        '--texture-format png',
		        '--extrude 1',
		        '--data %s' % (tpath + os.path.sep + '%s.json'%OUTPUT_NAME),
		        '--format json',
		        '%s' %  (tpath + os.path.sep + 'singleimg')
		        ])

		os.system(cmd.encode('cp936'))

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
