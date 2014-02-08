eval("var src = " + FLfile.read(jsonPath));
src.findSrc = function (filename){
    // fl.trace("looking for " + filename)
    if (! src.frames[filename]){
        fl.trace(filename);
    }
	return src.frames[filename].frame;
	// fl.trace("not found " + filename)
}

var console = {
    log: function () {
        var args = Array.prototype.slice.call(arguments, 0);
        fl.outputPanel.trace(args.join(','));
    },
    clear: function () {
        fl.outputPanel.clear();
    }
};
function each(array, fn, bind) {
    if (!bind) {
        bind = this;
    }
    var str = '';
    for (var i = 0, len = array.length; i < len; i++) {
        str += fn.call(bind, array[i], i) + '\n';
    }
}
function reverseEach(array, fn, bind) {
    if (!bind) {
        bind = this;
    }
    var str = '';
    for (var i = array.length - 1; i >= 0; i--) {
        str += fn.call(bind, array[i], i) + '\n';
    }
}
function BitmapItem(path) {
    this.filename = path;
}
BitmapItem.prototype.exportLua = function (lua) {
	lua.begin();
	lua.inline('type = "picture"');
	lua.inline('filename = \"' + this.filename + '\"');
	var s = src.findSrc(this.filename);
	var x = s.x, y = s.y, w = s.w, h = s.h;
	var pstr = '';
	pstr += x + ', ' + y + ', ';
	pstr += (x+w) + ', ' + y + ', ';
	pstr += (x+w) + ', ' + (y+h) + ', ';
	pstr += x + ', ' + (y+h) + ', ';
	var screenStr = '0, 0, ';
	screenStr += w*16 + ', ' + 0 + ', ';
	screenStr += w*16 + ', ' + h*16 + ', ';
	screenStr += 0 + ', ' + h*16 + ', ';
	lua.inline('{ tex = 1, src = {' + pstr + '}, screen = {'  + screenStr + '} }');
	lua.inline('id = ' + this.index);
	lua.end();
}

function Flash(document, dest, path, luafile, imgCounter) {
    this.timelines = [];
    this.document = document;
    this.curIndex = 0;
    fl.trace("path " + path)
    fl.trace('dest ' + dest)

    this.resourcePath = path;
    if (path.length == 0) {
        this.destFolder = dest + path;
    } else {
        this.destFolder = dest + '/' + path;
    }

    this.luaFile = luafile;
    this.imgFolder = 'images';
    this.imgCounter = imgCounter;

    this.loadLibrary(document.library);
}
Flash.prototype.loadLibrary = function (library) {
    var itemsmap = this.itemsmap = {};
    var items = this.items = [];

    each(library.items, function (item) {
        var itemwrap = new Item(item);
        itemsmap[item.name] = itemwrap;
        items.push(itemwrap);

        // if current item is a movie clip
        if (item.itemType == 'movie clip' || item.itemType == 'graphic') {
            itemwrap.movieclip = true;
            itemwrap.directRefer = true;
            var timeline = new Timeline(this, item.timeline).setName(item.name);
            this.timelines.push(timeline);
            itemwrap.setContent(timeline);
        } else if (item.itemType == 'bitmap') {
            var filename = this.genBitmapName();
            itemwrap.setContent(new BitmapItem(filename));
        } else if (item.itemType == 'folder') {
            console.log('not supported library item:' + item.itemType);
        }
    }, this);
}
Flash.prototype.getImgPath = function (name) {
    if(this.destFolder.length == 0) {
        return this.imgFolder + '/' + name;
    }
    return this.destFolder + '/' + this.imgFolder + '/' + name;
}
Flash.prototype.getFilePath = function (file) {
    if(this.destFolder.length == 0) {
        return file;
    }
    return this.destFolder + file;
}
Flash.prototype.getRelativePath = function (file) {
    if(this.resourcePath.length == 0) {
        return file;
    }
    return this.resourcePath + '/' + file;
}
Flash.prototype.genBitmapName = function () {
    return this.imgCounter.nextName();
}
Flash.prototype.exportLua = function () {
    var  lua = new Lua(0);
    lua.content('return {\n');

    each(this.items, function (item) {
        if (item.isCounted()) {
            item.content.exportLua(lua);
        }
    });
    this.main.exportLua(lua);
    lua.content('}\n');

    this.saveLua(lua);
}
Flash.prototype.saveLua = function (lua) {
    var URI = this.getFilePath(this.luaFile+ '.lua');
    if (FLfile.write(URI, lua.buffer)) {
        console.log('export:' + URI + ' success');
    }
}
Flash.prototype.parse = function (timeline) {
    // add default timeline
    this.main = new Timeline(this, timeline).setName('main');
    this.main.parse();
    this.main.referResource();

    // parse all timeline, including movieclip timeline
    for (var i = 0, length = this.timelines.length; i < length; i++) {
        this.timelines[i].parse();
    }

    var index = this.curIndex;
    each(this.items, function (item) {
        if (item.isCounted()) {
            item.setIndex(index++);
        }
    });
    this.main.index = index;
}
Flash.prototype.findItem = function (name) {
    return this.itemsmap[name];
}

function Symbol(item) {
    this.parse(item);
}

Symbol.prototype.parse = function (item) {
    this.library = item.libraryItem;
    switch (item.symbolType) {
        case 'movie clip':
            this.type = 'moveclip';
            break;
        case 'graphic':
            this.type = 'graphic';
            break;
        default:
            console.log('unsupported symbol type:' + item + item.symbolType);
    }
}

function Bitmap(item) {
    this.parse(item);
}
Bitmap.prototype.parse = function (item) {
    this.library = item.libraryItem;
    switch (item.instanceType) {
        case 'bitmap':
            break;
        default :
            console.log('unsupported bitmap type:' + item.instanceType);
            break;
    }
}

function Item(item) {
    this.item = item;
    this.name = item.name;
    this.type = item.itemType;
    this.directRefer = false;
    this.movieclip = false;
}
Item.prototype.setContent = function (c) {
    this.content = c;
}
Item.prototype.isCounted = function () {
    return this.directRefer;
}
Item.prototype.setIndex = function (index) {
    this.content.index = index;
}

/**
 * key frame
 */
function Frame(frame, totalFrame) {
    this.totalFrame = totalFrame;
    this.frame = frame;
    this.parseRotate(frame);
    this.element = frame.elements[0];
    this.parseFrame(this.element);
    this.instance = this.parseInstance(this.element);
    this.elementIndex = 0;
    if(this.element.elementType != 'instance') {
        console.log('not supported yet : ' + this.element.elementType + this.element.name);
    }
}
Frame.prototype.parseRotate = function (frame) {
    this.duration = frame.duration;
    this.startFrame = frame.startFrame;
    this.tweenType = frame.tweenType;

    this.direction = 0;
    var tweenType = frame.motionTweenRotate;
    if (tweenType == 'clockwise') {
        this.direction = 1;
    } else if (tweenType == 'counter-clockwise') {
        this.direction = -1;
    }

    this.cycles = frame.motionTweenRotateTimes;
}
Frame.prototype.parseInstance = function (element) {
    var instance;
    switch (element.instanceType) {
        case 'symbol':
            instance = new Symbol(element);
            break;
        case 'bitmap':
            instance = new Bitmap(element);
            break;
        default:
            console.log('unsupported instance type:' + element.instanceType);
            break;
    }
    return instance;
}
Frame.prototype.parseFrame = function (element) {
	this.mat = element.matrix;
	this.tmat = element.getTransformationPoint();
    // console.log(element.name, this.mat.tx,this.tmat.x,",,,",element.x);
    // console.log(element.scaleX)
    // console.log(element.rotation)
    // console.log(this.mat.a,this.mat.b,this.mat.c,this.mat.d,this.mat.tx,this.mat.ty)
}
Frame.prototype.exportLua = function (lua, onlyposition) {
    if (onlyposition) {
        lua.inline('onlyposition' + this.position);
    } else {
        var res = this.insertLinerKeyframe(this.nextFrame,this.lastFrame);
        each(res,function(f){
            if (f.type && f.type == "blank"){
                var str = "{}, -- blank"
                //insert blank frame
                lua.inline(str);
            }else{
                var str = '{ ' + ' index = ' + f.elementIndex + ', mat = {' + f.mat.a*1024 + ', ' + f.mat.b*1024 + ', ' + f.mat.c*1024 +', ' + f.mat.d*1024 + ', ' + f.mat.tx*16 + ', ' + f.mat.ty*16 + ' }}';
                if (f.text){ str += ", --  " + f.text}
                lua.childBegin();
                lua.inline(str);
                lua.childEnd();
            }
        });
    }
}

Frame.prototype.insertLinerKeyframe = function (nextFrame, lastFrame){
	var res = [];
    //First frame is blank
    if (!lastFrame && this.startFrame!=1 ){
        for (var i = 0, len = this.startFrame; i < len; i ++){
            res.push({
                'type' : "blank",
            });
        }
    }
	res.push({
		'elementIndex' : this.elementIndex,
		'mat' : {
			'a' : this.mat.a,
			'b' : this.mat.b,
			'c' : this.mat.c,
			'd' : this.mat.d,
			'tx' : this.mat.tx,
			'ty' : this.mat.ty,
		},
	});
	if (nextFrame && nextFrame.startFrame == (this.startFrame+this.duration) ){ //确保是连续的，否则直接复制当前帧 x this.duration次
		var delta = {
			'a' : (this.mat.a - nextFrame.mat.a) / (this.duration + 1) ,
			'b' : (this.mat.b - nextFrame.mat.b) / (this.duration + 1) ,
			'c' : (this.mat.c - nextFrame.mat.c) / (this.duration + 1),
			'd' : (this.mat.d - nextFrame.mat.d) / (this.duration + 1),
			'tx' : (this.mat.tx - nextFrame.mat.tx) / (this.duration + 1),
			'ty' : (this.mat.ty - nextFrame.mat.ty) / (this.duration + 1),
		};
		for (var i = 1; i < this.duration; i++){
			res.push({
				'elementIndex' : this.elementIndex,
				'mat' : {
					'a' : this.mat.a - (delta.a * (i)),
					'b' : this.mat.b - (delta.b * (i)),
					'c' : this.mat.c - (delta.c * (i)),
					'd' : this.mat.d - (delta.d * (i)),
					'tx' : this.mat.tx - (delta.tx * (i)),
					'ty' : this.mat.ty - (delta.ty * (i)),
				},
				'text' : "<liner insert>",
			});
		}
	}else{
		for (var i = 1; i < this.duration; i++){
			res.push({
				'elementIndex' : this.elementIndex,
				'mat' : {
					'a' : this.mat.a,
					'b' : this.mat.b,
					'c' : this.mat.c,
					'd' : this.mat.d,
					'tx' : this.mat.tx,
					'ty' : this.mat.ty,
				},
				'text' : "<copy insert>",
			});
		}
		if (nextFrame){	// insert blank frame
			for (var i = 0; i < nextFrame.startFrame - this.startFrame - this.duration; i++){
				res.push({
                    'type' : "blank",
                });
			};
		}
	}
    //fill the frames till end
    if (!nextFrame && this.startFrame + this.duration < this.totalFrame ){
        for (var i = 0, len = this.totalFrame - this.startFrame - this.duration; i < len; i ++){
            res.push({
                'type' : "blank",
            });
        }
    }
	return res;
}

function Layer(flash, layer, frameCount) {
    this.flash = flash;
    this.layer = layer;
    this.frames = [];
    this.elements = [];
    this.graphic = false;
    this.index = flash.curIndex ++;
    this.totalFrame = frameCount;
}
Layer.prototype.parse = function () {
    each(this.layer.frames, this.parseFrame, this);
}

Layer.prototype.checkGrapic = function () {
    if (this.elements.length == 1 && this.frames.length == 1) {
        var item = this.flash.findItem(this.elements[0]);
        if (!item.movieclip) {
            this.graphic = true;
            return true;
        }
    }
    return false;
}
Layer.prototype.parseFrame = function (frame, i) {
    if (frame.startFrame != i) {
        return;
    }
    if (frame.elements == 0) {
        return;
    }
    if (frame.elements > 1) {
        console.log('unsupported frame.elements');
    }

    var f = new Frame(frame, this.totalFrame);
    this.frames.push(f);
    this.distinctElement(f);
}
Layer.prototype.distinctElement = function (frame) {
    var lib = frame.instance.library;
    for (var i = 0, es = this.elements, len = es.length; i < len; i++) {
        if (lib.name == es[i]) {
            var libItem = this.flash.findItem(lib.name);
            frame.elementIndex = i;
            return;
        }
    }
    frame.elementIndex = this.elements.length;
    this.elements.push(lib.name);
}
Layer.prototype.exportLua = function (lua, graphic) {
    if (!graphic) {
    	lua.begin();
    	lua.inline('type = "animation"');
    	lua.inline('lname = \"' + this.layer.name + '\"');
    	lua.inline('id = ' + this.index)
    	lua.childBegin('component');
    	this.exportLibraryLua(lua)
    	lua.childEnd();
    	lua.childBegin();
    	this.exportFramesLua(lua)
    	lua.childEnd();
    	lua.end();
    } else {
        this.frames[0].exportLua(lua, true);
    }
}
Layer.prototype.exportLibraryLua = function (lua) {
    var flash = this.flash;
    each(this.elements, function (element, i) {
        var item = flash.findItem(element);
        lua.inline('{ id = ' + item.content.index +', cname = \"' + element + '\" }');
    });
}
Layer.prototype.exportFramesLua = function (lua) {
	for (var i = 0, len = this.frames.length; i < len; i ++){
		this.frames[i].nextFrame = this.frames[i + 1];
        this.frames[i].lastFrame = this.frames[i - 1];
	}
    each(this.frames, function (frame) {
        frame.exportLua(lua);
    });
}
Layer.prototype.referResource = function () {
    each(this.elements, function (element) {
        var item = this.flash.findItem(element);
        item.directRefer = true;
    }, this);
}

function Timeline(flash, timeline) {
    this.flash = flash;
    this.index = 0;
    this.timeline = timeline;
    this.layers = [];
    this.name = '';
    this.graphic = false;
}
Timeline.prototype.parse = function () {
    each(this.timeline.layers, this.parseLayers, this);
    this.checkSprite();
}
Timeline.prototype.referResource = function () {
    if (!this.graphic) {
        each(this.layers, function (layer) {
            layer.referResource();
        });
    }
}
Timeline.prototype.checkSprite = function () {
    if (this.timeline.frameCount == 1 && this.layers.length == 1 && this.layers[0].checkGrapic()) {
        this.graphic = true;
    }
}
Timeline.prototype.parseLayers = function (layer) {
    if (layer.layerType != 'normal'){
        console.log("Not supported layer type: " + layer.layerType + " @ " + layer.name);
    }else if (layer.visible == false){
        console.log("Invisible Layer found : " + layer.name + " , pass.")
    }else{
        var l = new Layer(this.flash, layer, this.timeline.frameCount);
        this.layers.push(l);
        l.parse();
    }
}
Timeline.prototype.exportLua = function (lua) {
    if (!this.graphic) {
		lua.begin();
		lua.inline('type = "animation"');
		lua.inline('export = "' + this.name + '\"');
		lua.inline('id = ' + this.index);
		lua.inline('framecount = ' + this.timeline.frameCount);
		var componentCnt = 0
		lua.childBegin('component');
		reverseEach(this.layers, function(layer){
			lua.inline('{ id = ' + layer.index +' }');
			componentCnt ++ ;
		},this);
        lua.childEnd();
        lua.childBegin();
        lua.childBegin();
        lua.content(lua.getIndentBuffer() + '');
        for (var i = 0; i < componentCnt; i ++){
        	lua.content(i + ', ')
        }
        lua.content('\n');
        lua.childEnd();
        lua.childEnd();
        lua.end();
        reverseEach(this.layers, function (layer) {
            layer.exportLua(lua);
        }, this);
    } else {
        var item = this.flash.findItem(this.layers[0].elements[0]);
        lua.begin();
        lua.inline('type = "picture"');
        lua.inline('id = ' +  this.index);
		var s = src.findSrc(item.content.filename);
		var x = s.x, y = s.y, w = s.w, h = s.h;
		var pstr = '';
		pstr += x + ', ' + y + ', ';
		pstr += (x+w) + ', ' + y + ', ';
		pstr += (x+w) + ', ' + (y + h) + ', ';
		pstr += x + ', ' + (y + h) + ', ';
		var screenStr = '0, 0, ';
		screenStr += w*16 + ', ' + 0 + ', ';
		screenStr += w*16 + ', ' + h*16 + ', ';
		screenStr += 0 + ', ' + h*16 + ', ';
		lua.inline('{ tex = 1, src = {' + pstr + '}, screen = {'  + screenStr + '} }');
        lua.inline('filename = "' + item.content.filename + '\"');
        lua.end();
    }
}
Timeline.prototype.setName = function (name) {
    this.name = name;
    return this;
}
function exportFla(dest, path, filename, imgCounter) {
    var flash = new Flash(fl.getDocumentDOM(), dest, path, filename, imgCounter);
    flash.parse(fl.getDocumentDOM().getTimeline());
    flash.exportLua();
}
function DistinctImages() {
    this.imageCount = 0;
}
DistinctImages.prototype.nextName = function () {
    var name = 'imgs_' + (this.imageCount < 10 ? '0' + this.imageCount : this.imageCount) + '.png';
    this.imageCount++;
    return name;
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

console.clear();
exportFla(outputPath,'', 'output',new DistinctImages());
console.log('done...');
FLfile.write("file:///tmp/flash_parser_done.tmp", "nothing");
