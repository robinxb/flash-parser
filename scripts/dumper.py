#-*- coding:utf-8 -*-
import codecs

SPACE = '    '

class Dumper():
	def __init__(self, indent = 0):
		self.buffer = []
		self.indent = indent
		self.__CreateIndentSpace()
		self.BeginFile()

	def __CreateIndentSpace(self):
		self.indent_space = SPACE * self.indent

	def BeginFile(self):
		self.buffer = ['return{\n']

	def EndFile(self):
		self.buffer.append('}\n')

	def Dump(self, path):
		self.EndFile()
		handle = codecs.open(path, 'w', encoding='UTF-8')
		handle.write("".join(self.buffer))

	def GetSpace(self):
		return self.indent_space

	def Oneline(self, tag, arg):
		if type(arg) == type(1):
			self.buffer.append('%s%s = %s,\n'%(self.indent_space, tag, arg))
		else:
			self.buffer.append('%s%s = "%s",\n'%(self.indent_space, tag, arg))

	def Append(self, str):
		self.buffer.append("%s%s\n"%(self.indent_space, str))

	def ChildBegin(self, tag = None):
		if tag:
			self.buffer.append("%s%s = {\n"%(self.indent_space, tag))
		else:
			self.buffer.append('%s{\n'%(self.indent_space))
		self.indent += 1
		self.__CreateIndentSpace()


	def ChildEnd(self):
		self.indent -= 1
		self.__CreateIndentSpace()
		self.buffer += self.indent_space
		self.buffer += '},\n'
