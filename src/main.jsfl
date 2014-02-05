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
	// console.log(document.library);

	this.loadLibrary(document.library);
}

Flash.prototype.loadLibrary = function (library){
	each(library.items, function(item){
		if (item.itemType == 'movie clip' || item.itemType == 'graphic'){
			var timeline = new Timeline(this, item.timeline).setName(item.name);
			this.timelines.push(timeline);
			// console.log(item.name + ' mc g');
		}else if (item.itemType == 'bitmap'){
			// console.log(item.name + ' bitmap');
		}
	},this);
}

// Flash.prototype.parse = function

function Timeline(flash, timeline){
	this.flash = flash;
	this.index = 0;
	this.timeline = timeline;
	this.layers = [];
	this.name = '';
	this.graphic = false;

	each(this.timeline.layers, this.parseLayers, this);
}

Timeline.prototype.setName = function (name){
	this.name = name;
	// console.log(this.timeline);
	return this;
}

Timeline.prototype.parseLayers = function (layer){
	var l = new Layer(this.flash, layer);
	this.layers.push(l);
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

function Frame(frame){
	this.frame = frame;
	// console.log(frame.elements.length);
	this.element = frame.elements[0];
	// this.mat = [1,0,0,1,0,0];
	this.mat = this.parseMatrix(this.element);
	this.instance = this.parseInstance(this.element);
	// each(this.frame.elements, this.parseElement, this);
	// each(this.frame.elements, this.parseIns)
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

function Lua(){
	this.buffer = '';
	this.space = '\t';
}

Lua.prototype.begin()

console.clear()
var flash = new Flash(fl.getDocumentDOM(), 'file:///User/Robin/Program/flash-parser/example/output/')
console.log('done...');



