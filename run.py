#-*- coding:utf-8 -*-
import os
import platform
import shutil
import time
import sys
import codecs
import inspect
this_file = inspect.getfile(inspect.currentframe())
DIR_PATH = os.path.abspath(os.path.dirname(this_file))
SEP = os.path.sep

sys.path.append(DIR_PATH + SEP + 'scripts') 
import handleCombine as HC

global sysOpen
TMP_FOLDER_NAME = "__tmp"
SCRIPT_PATH = DIR_PATH + SEP + 'scripts'
FLASH_ROOT = DIR_PATH + SEP + 'files'
LEAVE_FILE = ['out.1.ppm', 'out.1.pgm', 'out.lua', 'combine.xml']

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
			self.WaitJSDone('out.png')
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
				shutil.copy(self.tmpPath + '/%s'%filename, self.mainpath + '/%s'%filename)


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
			self.hc.Export(self.tmpPath.replace('\\','/') + '/out.lua')

	def ImageMagicka(self):
		cmd = 'convert %s/out.png %s/out.1.ppm'%(self.tmpPath, self.tmpPath)
		cmd2 = 'convert %s/out.png -channel A -separate %s/out.1.pgm'%(self.tmpPath, self.tmpPath)
		os.system(cmd.encode('cp936'))
		while(not os.path.exists(self.tmpPath + '/out.1.ppm')):
			time.sleep(1)
		os.system(cmd2.encode('cp936'))

	def TexturePacker(self):
		tpath = self.tmpPath 
		sysType = platform.system()
		if sysType == "Windows":
			print "aaaa"
			tpath = tpath.replace('/','\\')

		cmd = ' '.join([
		        'TexturePacker',
		        '--algorithm MaxRects',
		        '--maxrects-heuristics Best',
		        '--pack-mode Best',
		        '--premultiply-alpha',
		        '--sheet %s' %(tpath + os.path.sep + 'out.png'),
		        '--texture-format png',
		        '--extrude 1',
		        '--data %s' % (tpath + os.path.sep + 'out.json'),
		        '--format json',
		        '%s' %  (tpath + os.path.sep + 'singleimg')
		        ])

		print cmd
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

		header = 'eval("var JSONFILE = " + FLfile.read("file:///%s/out.json"));\n'% self.tmpPath.replace('\\','/')
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