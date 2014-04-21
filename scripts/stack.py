#-*- coding:utf-8 -*-
import copy
class Stack():
	def __init__(self):
		self.stack=[];
		self.top=-1;

	def Push(self,ele):
		self.stack.append(ele);
		self.top = self.top+1;

	def Pop(self):
		self.top = self.top-1;
		return self.stack.pop();

	def IsEmpty(self):
		return self.top == -1;

	def Drop(self):
		self.stack = []
		self.top = -1

	def Clone(self):
		r = Stack()
		r.stack = copy.deepcopy(self.stack)
		r.top = len(r.stack) - 1
		return r

	def CalAllMat(self):
		mat = [1024.0, 0.0, 0.0, 1024.0, 0.0, 0.0]
		for i in xrange(len(self.stack)):
			tmat = self.ParseMat(self.stack[i])
			mat = self.Mul(tmat, mat)
		return mat

	def CalAllColor(self):
		#only alpha now
		color = [255, 255, 255, 255]
		add = self.CallAdditiveColor()
		color[0] = self.CallAlpha()
		return (color, add)

	def CallAlpha(self):
		a = 255
		for i in xrange(len(self.stack)):
			t = self.ParseColor(self.stack[i])
			a = a * (int(t[0]) / 100.0)
		return int(a)
	
	def CallAdditiveColor(self):
		add = [255, 0, 0, 0]
		for i in xrange(len(self.stack)):
			t = self.ParseColor(self.stack[i])
			add[1] += int(t[3])
			add[2] += int(t[5])
			add[3] += int(t[7])
		for i in xrange(4):
			if add[i] > 255:
				add[i] = 255
		return add

	#"100,0,100,164,100,164,100,0"
	def ParseColor(self, str):
		t = str.split(',')
		assert(len(t) == 8)
		return t

	def Mul(self, a, b):
		m = []
		m.append((float(a[0])  * float(b[0]) + float(a[1]) * float(b[2])) / 1024.0)
		m.append((float(a[0])  * float(b[1]) + float(a[1]) * float(b[3])) / 1024.0)
		m.append((float(a[2])  * float(b[0]) + float(a[3]) * float(b[2])) / 1024.0) 
		m.append((float(a[2])  * float(b[1]) + float(a[3]) * float(b[3])) / 1024.0)
		m.append((float(a[4]) * float(b[0]) + float(a[5]) * float(b[2])) / 1024.0 + float(b[4]))
		m.append((float(a[4]) * float(b[1]) + float(a[5]) * float(b[3])) / 1024.0 + float(b[5]))
		return m

	def ParseMat(self, mat):
		mat = mat.split(',')
		matF = []
		for i in xrange(6):
			matF.append(float(mat[i]))
		return matF


