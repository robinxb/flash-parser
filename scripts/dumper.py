#-*- coding:utf-8 -*-
import codecs

SPACE = '    '

class Dumper():
	def __init__(self, indent = 0):
		self.buffer = ""
		self.indent = indent
		self.BeginFile()

	def BeginFile(self):
		self.buffer = ""
		self.buffer += 'return{\n'

	def EndFile(self):
		self.buffer += '}\n'

	def Dump(self, path):
		self.EndFile()
		handle = codecs.open(path, 'w', encoding='UTF-8')
		handle.write(self.buffer)

	def GetSpace(self):
		buf = ''
		for i in range(self.indent):
			buf += SPACE
		return buf

	def Oneline(self, tag, arg):
		self.buffer += self.GetSpace()
		if type(arg) == type(1):
			self.buffer += '%s = %s,\n'%(tag, arg)
		else:
			self.buffer += '%s = "%s",\n'%(tag, arg)

	def Append(self, str):
		self.buffer += self.GetSpace()
		self.buffer += str
		self.buffer += '\n'

	def ChildBegin(self, tag = None):
		self.buffer += self.GetSpace()
		if tag:
			self.buffer += "%s = {\n"%tag
		else:
			self.buffer += '{\n'
		self.indent += 1

	def ChildEnd(self):
		self.indent -= 1
		self.buffer += self.GetSpace()
		self.buffer += '},\n'
