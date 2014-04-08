#-*- coding:utf-8 -*-
import codecs
import dumper
import sys
import stack as ST

try:
    import xml.etree.cElementTree as ET
except ImportError:
    import xml.etree.ElementTree as ET

EXPORT_NAME_CN = unicode("场景 1", "utf-8")
EXPORT_NAME_EN = "Scene 1"

class Handler():
	def __init__(self, file):
		self.file = file
		self.dumper = dumper.Dumper()
		self.aniLib = {}
		self.picLib = {}
		self.actionGroup = {}
		handle = codecs.open(file, 'r')
		content = handle.read()
		handle.close()
		self.root = ET.fromstring(content)
		self.PreFind()

	def PreFind(self): #find the doc's root
		for doc in self.root.iterfind("document[@filename]"):
			for tl in doc:
				if tl.get('name') == EXPORT_NAME_CN or\
				tl.get('name') == EXPORT_NAME_EN:
					print ('[info]Parsing %s.fla\t\twait ...'%doc.get('filename'))
					self.ParseTL(doc, tl, doc.get('filename'))
		self.CombineAction()
		self.MarkID()
		self.ExportDoc()

	def CombineAction(self):
		aniToRemove = []
		for name, frames in self.aniLib.items():
			idx = name.find('@')
			if idx < 1 or idx == len(name) - 1:
				continue
			ani = name[:idx]
			act = name[idx + 1 :]
			if act.find('@') > -1: #a component when filename contains @
				continue
			print ('[info]action found\t\t%s\t\t%s'%(ani, act))
			aniToRemove.append(name)
			if not self.actionGroup.get(ani):
				self.actionGroup[ani] = []
			self.actionGroup[ani].append((act, frames))
		for ani in aniToRemove:
			self.aniLib.pop(ani)

	def ParseTL(self, doc, tl, tlname = None):
		if not tlname:
			tlname = tl.get('name')
		frames = []
		for i in xrange(int(tl.get('framecount'))):
			matStack = ST.Stack()
			colorStack = ST.Stack()
			frames.append([])
			self.ParseFrame(doc, tl, frames[i], i, matStack, colorStack)
		self.aniLib[tlname] = frames

	def ParseFrame(self, doc, tl, db, iFrame, ms, cs):
		bIsEmpty = True
		for layer in tl:
			tmpFrame = iFrame
			fcount = int(layer.get('frameCount'))
			while tmpFrame > fcount:
				tmpFrame -= (tmpFrame - fcount)
			for frame in layer:
				startFrame = int(frame.get('startFrame'))
				duration = int(frame.get('duration'))
				if startFrame + duration < tmpFrame:
					continue
				if frame.find('element') == None:
					break
				for element in frame:
					bIsEmpty = False
					if element.get('desc'): #pic
						thisMS = ms.Clone()
						thisMS.Push(element.get('mat'))
						thisCS = cs.Clone()
						if element.get('color'):
							thisCS.Push(element.get('color'))
						db.append((element, thisMS.CalAllMat(), thisCS.CalAllColor()))
						self.AddPic(element)
					elif element.get('name')[:1] == '@':
						thisMS = ms.Clone()
						thisMS.Push(element.get('mat'))
						thisCS = cs.Clone()
						if element.get('color'):
							thisCS.Push(element.get('color'))
						db.append((element, thisMS.CalAllMat(), thisCS.CalAllColor()))
						timeline = doc.find("Timeline[@name='%s']"%element.get('name'))
						if not timeline:
							timeline = doc.find("Timeline[@name='%s']"%(doc.get('filename') + element.get('name')))
						assert(timeline)
						tlName = doc.get('filename') + element.get('name')						
						timeline.set('name', tlName)
						element.set('nickname', tlName)
						self.ParseTL(doc, timeline)
					else:
						timeline = doc.find("Timeline[@name='%s']"%element.get('name'))
						assert(timeline)
						thisMS = ms.Clone()
						thisMS.Push(element.get('mat'))
						thisCS = cs.Clone()
						if element.get('color'):
							thisCS.Push(element.get('color'))
						iFrameNext = tmpFrame
						if iFrame == int(element.get('firstFrame')):
							iFrameNext = int(element.get('firstFrame'))
						self.ParseFrame(doc, timeline, db, iFrameNext, thisMS, thisCS)
				break
		if bIsEmpty:
			db = []

	def AddPic(self, e):
		eName = e.get('name')
		assert(eName)
		if self.picLib.get(eName):
			return
		self.picLib[eName] = e.get('desc')

	def MarkID(self):
		id = 0
		idtable = {}
		for name in self.picLib.keys():
			if idtable.get(name):
				continue
			idtable[name] = id
			id += 1
		for name in self.aniLib.keys():
			if idtable.get(name):
				continue
			idtable[name] = id
			id += 1
		for name in self.actionGroup.keys():
			if idtable.get(name):
				continue
			idtable[name] = id
			id += 1
		self.idTable = idtable

	def ExportDoc(self):
		self.ExportPng(self.dumper)
		self.ExportNormalAni(self.dumper)
		self.ExportActionGroup(self.dumper)

	def ExportActionGroup(self, dp):
		for name, actions in self.actionGroup.items():
			dp.ChildBegin()
			dp.Oneline('id', self.idTable[name])
			dp.Oneline('type', 'animation')
			dp.Oneline('export', name)
			component = Component(self.idTable)
			for (action, frames) in actions:
				component.AddFrames(frames)
			dp.ChildBegin('component')
			for k in component.GetCArr():
				cStr = "{"
				if k.find('@') >= 0:
					cStr += 'name = "%s", '%k
				cStr += 'id = %d'%(self.idTable[k])
				cStr += "},"
				dp.Append(cStr)
			dp.ChildEnd()
			for (action, frames) in actions:
				dp.Append('{ action = "%s",'%action)
				dp.indent += 1
				for f in frames:
					str = "{"
					for v in f:
						e = v[0]
						if e != None:
							mat = v[1]
							color, add = v[2][0],v[2][1]
							matStr = "mat = {%d, %d, %d, %d, %d, %d}"%(mat[0],mat[1],mat[2],mat[3],mat[4],mat[5])
							colorStr = "color = %s"%(hex(color[0]<<24 | color[1]<<16 | color[2]<<8 | color[3]))
							idx = component.GetIndex(e)
							str += "{index = %d, %s"%(idx, matStr)
							if colorStr != "color = 0xffffffff":
								str += ", %s"%colorStr
							str += "},"
						else:
							continue
					str += "},"
					dp.Append(str)
					component.NextFrame()
				dp.ChildEnd()
			dp.ChildEnd()

	def ExportPng(self, dp):
		for name, desc in self.picLib.items():
			dp.ChildBegin()
			dp.Oneline('id', self.idTable[name])
			dp.Oneline('name', name)
			dp.Append(desc + ',')
			dp.Oneline('type', 'picture')
			dp.ChildEnd()

	def ExportNormalAni(self, dp):
		for name, frames in self.aniLib.items():
			dp.ChildBegin()
			dp.Oneline('id', self.idTable[name])
			dp.Oneline('type', 'animation')
			dp.Oneline('export', name)
			component = Component(self.idTable, frames)
			dp.ChildBegin('component')
			for k in component.GetCArr():
				cStr = "{"
				if k[:1] == "@":
					cStr += 'name = "%s", '%k[1:]
				cStr += 'id = %d'%(self.idTable[k])
				cStr += "},"
				dp.Append(cStr)
			dp.ChildEnd()
			dp.ChildBegin()
			for f in frames:
				str = "{"
				for v in f:
					e = v[0]
					if e != None:
						mat = v[1]
						matStr = "mat = {%d, %d, %d, %d, %d, %d}"%(mat[0],mat[1],mat[2],mat[3],mat[4],mat[5])
						str += "{index = %d, %s},"%(component.GetIndex(e), matStr)
					else:
						continue
				str += "},"
				dp.Append(str)
				component.NextFrame()
			dp.ChildEnd()
			dp.ChildEnd()

	def GetMat(self, e):
		mat = e.get('mat')
		assert(mat)
		mat = mat.split(',')
		matF = {}
		matF['a'] = mat[0]
		matF['b'] = mat[1]
		matF['c'] = mat[2]
		matF['d'] = mat[3]
		matF['tx'] = mat[4]
		matF['ty'] = mat[5]
		return matF


	def Export(self, path):
		self.dumper.Dump(path)

class Component():
	def __init__(self, idTable, frames = None):
		self.c = []
		self.used = {}
		self.idTable = idTable
		if frames != None:
			self.AddFrames(frames)

	def AddFrames(self, frames):
		for frame in frames:
			for v in frame:
				if v[0] == None:
					continue
				self.GetIndex(v[0])
			self.NextFrame()

	def GetCArr(self):
		return self.c

	def GetIndex(self, e):
		eName = e.get('nickname') or e.get('name') 
		i = -1
		for k in self.c:
			i += 1
			if k != eName:
				continue
			if self.used.get(i):
				continue
			self.used[i] = True
			return i
		self.c.append(eName)
		self.used[i] = True
		return i

	def NextFrame(self):
		self.used = {}


#just for test
if __name__ == '__main__':
	a = Handler('E:/hayday/resource/parser/files/combine.xml')
	a.Export('E:/hayday/resource/parser/files/out.lua')

