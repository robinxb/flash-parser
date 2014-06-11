function Point(x, y, scale){
	this.x = x;
	this.y = y;
	if (scale) {
		this.Scale(scale)
	}
}

function endWith(s1,s2){  
	if(s1.length<s2.length)
		return false;
	if(s1==s2)
		return true;  
	if(s1.substring(s1.length-s2.length)==s2)  
		return true;  
	return false;
}

function getFileName(s){
	arr = s.split(".");
	len = arr.length;
	if (len > 1){
		arr.length = len - 1;
	}
	return arr.join('');
}

function isUnused(item){
    var arr = fl.getDocumentDOM().library.unusedItems;
    for (var i in arr){
        if (item == arr[i]){
            return true
        }
    }
    return false
}

ORIGIN_SIZE.getSize = function (filename){
	if (!ORIGIN_SIZE[filename]) {
        fl.trace("cant find orgin size ," + filename);
		return
	}
	return ORIGIN_SIZE[filename]
}

Point.prototype.Scale = function (s) {
	this.x = this.x * s;
	this.y = this.y * s;
	return this
}

Point.prototype.ToString = function (mul){
	if (!mul){
		mul = 16;
	}
	return this.x * mul + ', ' + this.y * mul + ', '
}

JSONFILE.findSrc = function (filename) {
    if (!JSONFILE.frames[filename]) {
        fl.trace("cant find " + filename);
		return
    }
    return JSONFILE.frames[filename];
}

JSONFILE.getDesc = function (filename) {
	if (filename.indexOf('__anchor') >= 0){
		return "anchor"
	}
    var file = JSONFILE.findSrc(filename);
	var originSize = ORIGIN_SIZE.getSize(filename)
    var s = file.frame;
    var bIsRotated = file.rotated;
    var trimSize = file.spriteSourceSize;
    var x = s.x,
        y = s.y,
        w = s.w - 1,
        h = s.h - 1;
    var tx = trimSize.x,
        ty = trimSize.y;
	var scale = Number(JSONFILE.meta.scale)
	
	var sh = originSize.h,
		sw = originSize.w;
	
	main_name = getFileName(filename);

	if (endWith(main_name, '_C')){
		sh = sh * scale / 2;
		sw = sw * scale / 2;
	}else if (endWith(main_name, '_LR')){
		sw = sw * scale / 2;
	}else if (endWith(main_name, '_UD')){
		sh = sh * scale / 2;
	}

	if (bIsRotated){
		t = w;
		w = h;
		h = t;
	}

    var pstr = '';
    if (!bIsRotated) {
		pstr += new Point(x, y).ToString(1)
		pstr += new Point(x + w, y).ToString(1)
		pstr += new Point(x + w, y + h).ToString(1)
		pstr += new Point(x, y + h).ToString(1)
    } else {
		pstr += new Point(x + w, y).ToString(1)
		pstr += new Point(x + w, y + h).ToString(1)
		pstr += new Point(x, y + h).ToString(1)
		pstr += new Point(x, y).ToString(1)
    }
    screenStr = new Point(tx, ty).ToString()
    screenStr += new Point(sw - tx, ty).ToString()
    screenStr += new Point(sw - tx, sh - ty).ToString()
    screenStr += new Point(tx, sh - ty).ToString()

    var str = '{ tex = 1, src = {' + pstr + '}, screen = {' + screenStr + '} }';
	if (endWith(main_name, '_LR')){
		screenStr = new Point(2 * sw - tx, ty).ToString()
		screenStr += new Point(sw - tx, ty).ToString()
		screenStr += new Point(sw - tx, sh - ty).ToString()
		screenStr += new Point(2 * sw - tx, sh - ty).ToString()
		str += ','
		str += '{ tex = 1, src = {' + pstr + '}, screen = {' + screenStr + '} }';
	}else if (endWith(main_name, '_UD')){
		screenStr = new Point(tx, 2 * sh - ty).ToString()
		screenStr += new Point(sw - tx, 2 * sh - ty).ToString()
		screenStr += new Point(sw - tx, sh - ty).ToString()
		screenStr += new Point(tx, sh - ty).ToString()
		str += ','
		str += '{ tex = 1, src = {' + pstr + '}, screen = {' + screenStr + '} }';
	}else if (endWith(main_name, '_C')){
		screenStr = new Point(2 * sw - tx, ty).ToString()
		screenStr += new Point(sw - tx, ty).ToString()
		screenStr += new Point(sw - tx, sh - ty).ToString()
		screenStr += new Point(2 * sw - tx, sh - ty).ToString()
		str += ','
		str += '{ tex = 1, src = {' + pstr + '}, screen = {' + screenStr + '} }';
		screenStr = new Point(tx, 2 * sh - ty).ToString()
		screenStr += new Point(sw - tx, 2 * sh - ty).ToString()
		screenStr += new Point(sw - tx, sh - ty).ToString()
		screenStr += new Point(tx, sh - ty).ToString()
		str += ','
		str += '{ tex = 1, src = {' + pstr + '}, screen = {' + screenStr + '} }';
		screenStr = new Point(2 * sw - tx, 2 * sh - ty).ToString()
		screenStr += new Point(sw - tx, 2 * sh - ty).ToString()
		screenStr += new Point(sw - tx, sh - ty).ToString()
		screenStr += new Point(2 * sw - tx, sh - ty).ToString()
		str += ','
		str += '{ tex = 1, src = {' + pstr + '}, screen = {' + screenStr + '} }';
	}
    return str;
}

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

function XML(indent) {
    this.buffer = '';
    this.space = '\t';
    this.indent = indent ? indent : 0;
    this.tags = [];
}

XML.prototype.getargs = function (args) {
    var buf = '';
    var stack = []
    for (var p in args) {
        if (args[p] == undefined) {
            continue;
        }
        stack.push(p + '="' + args[p] + '"');
    }
    buf += stack.join(' ');
    return buf;
}

XML.prototype.begin = function (tag, args) {
    var space = "";
    for (var i = this.indent; i > 0; i--) {
        space += this.space;
    }
    this.buffer += space + '<' + tag + ' ' + this.getargs(args) + '>\n';
    this.indent += 1;
    this.tags.push(tag);
}

XML.prototype.end = function () {
    this.indent -= 1;
    var space = "";
    for (var i = this.indent; i > 0; i--) {
        space += this.space;
    }
    this.buffer += space + '</' + this.tags.pop() + '>\n'
}

XML.prototype.content = function (buf) {
    var space = "";
    for (var i = this.indent; i > 0; i--) {
        space += this.space;
    }
    this.buffer += space + buf
}

XML.prototype.oneline = function (tag, args) {
    var space = "";
    for (var i = this.indent; i > 0; i--) {
        space += this.space;
    }
    this.buffer += space + '<' + tag + " " + this.getargs(args) + '>' + '</' + tag + '>\n';
}

XML.prototype.print = function () {
    fl.trace(this.buffer);
}

XML.prototype.export = function (path) {
    FLfile.write('file:///' + path, this.buffer);
}



function Timeline(timeline, xml) {
    this.timeline = timeline;
    this.xml = xml;
    this.layers = [];
    this.textItems = []
}

Timeline.prototype.parse = function () {
    reverseEach(this.timeline.layers, function (l) {
        var layer = new Layer(this, l);
        layer.parse();
        this.layers.push(layer);
    }, this);
    for (var tl in this.itemTimelines) {
        this.itemTimelines[tl].parse()
    }
}

Timeline.prototype.buildLib = function (library) {
    this.libItems = {};
    this.itemTimelines = {};
    each(library.items, function (item) {
		if (isUnused(item)) {
			return
		}
        if (item.itemType == 'bitmap') {
            this.libItems[item.name] = item;
        } else if (item.itemType == 'graphic') {
            this.libItems[item.name] = item;
            this.itemTimelines[item.name] = new Timeline(item.timeline, this.xml);
        } else if (item.itemType == 'movie clip') { // now same as graphic, more future to add.
            this.libItems[item.name] = item;
            this.itemTimelines[item.name] = new Timeline(item.timeline, this.xml);
        }
    }, this);
}

Timeline.prototype.export = function (tmpPath, filename) {
    filename = filename.replace(".fla", "")
    this.xml.begin('document', {
        'filename': filename
    });
    this.parseXML();
    for (var tl in this.itemTimelines) {
        this.itemTimelines[tl].parseXML()
    }
    this.xml.end();
    this.xml.export(tmpPath + '/' + filename + '.xml');
}

Timeline.prototype.parseXML = function () {
    this.xml.begin('Timeline', {
        "name": this.timeline.name,
        'framecount': this.timeline.frameCount
    });
    each(this.layers, function (l) {
        l.parseXML();
    }, this);
    this.xml.end();
}

Timeline.prototype.addText = function (item, layerName){
    for (var i in this.textItems) {
        if (item == this.textItems[i].obj) {
            fl.trace("return " + i)
            return i
        }
    }
    var idStr = this.timeline.name + '|' + layerName
    this.textItems.push(new TextObj(item, idStr))
    return idStr
}

function TextObj(item, idStr){
    this.obj = item
    this.idStr = idStr
}

function Layer(timeline, layer) {
    this.timeline = timeline;
    this.xml = timeline.xml;
    this.layer = layer;
    this.frames = [];
}

Layer.prototype.parse = function () {
    layerToTrans = [];
    for (var index in this.layer.frames) {
        var f = this.layer.frames[index];
        if (f.tweenType != "none") {
            layerToTrans.push(f);
        }
    }

    each(layerToTrans, function (l) {
        l.convertToFrameByFrameAnimation();
    }, this);

    for (var index in this.layer.frames) {
        if (this.layer.frames[index].startFrame == index) {
            var frame = new Frame(this, this.layer.frames[index]);
            this.frames.push(frame);
        }
    }
}

Layer.prototype.parseXML = function () {
    this.xml.begin('layer', {
        'name': this.layer.name,
        'frameCount': this.layer.frameCount
    });
    each(this.frames, function (f) {
        f.parseXML()
    }, this);
    this.xml.end();
}

function Frame(layer, frame) {
    this.layer = layer;
    this.frame = frame;
    this.xml = layer.xml;
}

Frame.prototype.parseXML = function () {
    this.xml.begin('frame', {
        'startFrame': this.frame.startFrame,
        'duration': this.frame.duration
    });
    each(this.frame.elements, function (e) {
        var mat = [e.matrix.a * 1024, e.matrix.b * 1024, e.matrix.c * 1024, e.matrix.d * 1024, e.matrix.tx * 16, e.matrix.ty * 16].join(',');
        // both graphic and movie clip are symbol
        // but movie clip does not have the firstFrame
        if (e.instanceType == 'symbol') {
            var aa = e.colorAlphaPercent,
                ab = e.colorAlphaAmount,
                ra = e.colorRedPercent,
                rb = e.colorRedAmount,
                ga = e.colorGreenPercent,
                gb = e.colorGreenAmount,
                ba = e.colorBluePercent,
                bb = e.colorBlueAmount;
            var bIsNormalColor = true
            if (("" + aa + ab + ra + rb + ga + gb + ba + bb) == "1000100010001000") {
                bIsNormalColor = false
            }
            this.xml.oneline('element', {
                'name': e.libraryItem.name,
                'mat': mat,
                'firstFrame': e.firstFrame ? e.firstFrame : 0,
                'color': bIsNormalColor ? [aa, ab, ra, rb, ga, gb, ba, bb].join(',') : undefined,
                'loop': e.loop
            });
        } else if (e.instanceType == 'bitmap') {
            var desc = JSONFILE.getDesc(e.libraryItem.name);
            this.xml.oneline('element', {
                'name': e.libraryItem.name,
                'mat': mat,
                'desc': desc
            });
        } else if (e.elementType == "text"){
            var idStr = this.layer.timeline.addText(e, this.layer.layer.name)
            var mat = [e.matrix.a * 1024, e.matrix.b * 1024, e.matrix.c * 1024, e.matrix.d * 1024, (e.matrix.tx - (e.matrix.tx - e.left)) * 16, e.matrix.ty - (e.matrix.ty - e.top) * 16].join(',');
            this.xml.oneline('element', {
                'idStr' : idStr,
                'mat': mat,
                'string': e.getTextString(),
                'length' : e.length,
                'height' : e.height,
                'width' : e.width,
                'align' : e.getTextAttr('alignment'),
                'size' : e.getTextAttr('size'),
                'textcolor' : e.getTextAttr('fillColor')
            });
        }
    }, this);
    this.xml.end();
}

function batToDo(folder, tmpPath) {
    fl.showIdleMessage(false)
    fl.closeAll(false)
    var files = FLfile.listFolder('file:///' + folder + "/*.fla", "files");
    for (var i = 0; i < files.length; i++) {
        pub(folder, files[i], tmpPath);
    }
    fl.showIdleMessage(true)
}

function pub(dir, file, tmpPath) {
    var doc = fl.openDocument('file:///' + dir.replace(":", "|") + "/" + file);
    var xml = new XML(1);
    var tl = new Timeline(fl.getDocumentDOM().getTimeline(), xml);
    tl.buildLib(fl.getDocumentDOM().library)
    tl.parse();
    tl.export(tmpPath, file);
    doc.close(false);
}

