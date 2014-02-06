var console = {
	log: function(){
		var args = Array.prototype.slice.call(arguments, 0);
		fl.outputPanel.trace(args.join(','));
	},
	clear: function(){
		fl.outputPanel.clear();
	}
};

function each(array, fn, bind){
	if (!bind){
		bind = this;
	}
	for (var i = 0, len = array.length; i < len; i++){
		fn.call(bind, array[i], i);
	}
}

function reverseEach(array, fn, bind){
	if (!bind){
		bind = this;
	}
	for (var i = array.length - 1; i >= 0; i--){
		fn.call(bind, array[i], i);
	}
}

function Flash(document, luafile){
	this.document = document;
	this.luafile = luafile;
	this.timelines = [];

	this.loadLibrary(document.library);
}

Flash.prototype.loadLibrary = function (library){
	each(library.items, function(item){
		if (item.itemType == 'movie clip' || item.itemType == 'graphic'){
			var timeline = new Timeline(this, item.timeline).setName(item.name);
			this.timelines.push(timeline);
		}else if (item.itemType == 'bitmap'){
			;
		}
	},this);
}

Flash.prototype.exportLua = function (filename){
	var lua = new Lua(0);
	each(this.timelines, function(t){
		t.exportLua(lua);
	}, this);
	console.log(lua.buffer);
}

function Timeline(flash, timeline){
	this.flash = flash;
	this.index = 0;
	this.timeline = timeline;
	this.layers = [];
	this.name = '';
	this.graphic = false;

	each (this.timeline.layers, this.parseLayers, this);
}

Timeline.prototype.setName = function (name){
	this.name = name;
	console.log(this.name);
	return this;
}

Timeline.prototype.parseLayers = function (layer){
	var l = new Layer(this.flash, layer);
	this.layers.push(l);
}

Timeline.prototype.exportLua = function (lua){
	lua.begin();
	lua.inline('type = \"timeline\"');
	lua.inline('export = \"' + this.name + '\"');
	lua.childBegin("component");
	each(this.layers, function(l){
		lua.inline(l.layer.name);
	},this);
	lua.childEnd();
	// lua.inline('component = {');
	// each(this.layers, function(l){
	// 	lua.inline()
	// },this);
	// lua.inline('}');
	lua.end();

	each (this.layers, function(l){
		l.exportLua(lua);
	}, this);
}


function Layer(flash, layer){
	this.flash = flash;
	this.layer = layer;
	this.frames = [];
	this.elements = [];
	this.graphic = false;
	// console.log("parse layer "+ this.layer.name)

	each(this.layer.frames, this.parseFrame, this);
}

Layer.prototype.parseFrame = function (frame){
	var f = new Frame(frame);
	this.frames.push(f);
}

Layer.prototype.exportLua = function (lua){
	lua.begin();
	lua.inline('type = "layer"');
	lua.inline('layername = ' + this.layer.name);
	lua.end();

	each(this.frames, function(f){
		// f.exportLua(lua);
	}, this);
}

function Frame(frame){
	this.frame = frame;
	// console.log(frame.elements.length);
	this.element = frame.elements[0];
	this.mat = this.parseMatrix(this.element);
	this.instance = this.parseInstance(this.element);
}

Frame.prototype.parseMatrix = function (e){
	var mat = e.matrix;
	console.log(mat.a,mat.b,mat.c,mat.d,mat.tx,mat.ty);

	var p = e.getTransformationPoint();

	console.log(p.x,p.y);
	return mat;
}

Frame.prototype.parseInstance = function (e){
	var instance;
	switch (e.instanceType){
		case 'symbol':
			instance = new Symbol(e);
			break;
		case 'bitmap':
			instance = new Bitmap(e);
			break;
		default:
			console.log('unsupported instance type : ' + e.instanceType);
			break;
	};
	return instance;
}

Frame.prototype.exportLua = function (lua){
	// lua.begin();
	// ;
	// lua.end();
}

function Symbol(item){
	this.library = item.libraryItem;
	switch (item.symbolType) {
		case 'movie clip':
			this.type = 'movieclip';
			break;
		case 'graphic':
			this.type = 'graphic';
			break;
		default:
			console.log('unsupported symbol type : ' + item + item.symbolType);
			break;
	};
}

function Bitmap(item){
	this.library = item.libraryItem;
	switch (item.instanceType){
		case 'bitmap':
			break;
		default:
			console.log('unsupported bitmap type : ' + item + item.symbolType);
			break;
	};
}

function Lua(indent){
	this.buffer = '';
	this.space = '\t';
	this.indent = indent ? indent : 0;
}

Lua.prototype.begin = function (){
	for (var i = this.indent; i>0; i--){
		this.buffer += this.space;
	}
	this.buffer += '{\n';
	this.indent ++ ;
}

Lua.prototype.end= function (){
	this.indent --;
	for (var i = this.indent; i>0; i--){
		this.buffer += this.space;
	}
	this.buffer += '},\n'
}

Lua.prototype.content = function(c){
	this.buffer += c;
}

Lua.prototype.getIndentBuffer = function() {
	var buf = '';
	for (var i = this.indent; i>0 ; i --){
		buf += this.space;
	}
	return buf;
}

Lua.prototype.inline = function(c){
	this.buffer += this.getIndentBuffer() + c + ',\n';
}

Lua.prototype.childBegin = function(name){
	var buf = this.getIndentBuffer();
	if (name){
		buf += name + ' = ';
	}
	buf += '{\n';
	this.buffer += buf;
	this.indent ++ ;
}

Lua.prototype.childEnd = function(){
	this.indent --;
	this.buffer += this.getIndentBuffer() + '},\n';
}

console.clear()
var flash = new Flash(fl.getDocumentDOM(), 'file:///User/Robin/Projects/flash-parser/example/output/')
flash.exportLua();
console.log('done...');



