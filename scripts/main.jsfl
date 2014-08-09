function Point(x, y, scale){
	this.x = x;
	this.y = y;
	if (scale) {
		this.scale = scale
		this.Scale(scale)
	}
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

Point.prototype.ChangePoint = function (x, y){
	this.x = x;
	this.y = y;
	if (this.scale) {
		this.Scale(this.scale)
	}
}

Point.prototype.DeltaChangeX = function (dx){
	this.ChangePoint(this.x + dx, this.y);
}

Point.prototype.DeltaChangeY = function (dy){
	this.ChangePoint(this.x, this.y + dy);
}

function Square(x1, y1, x2, y2, x3, y3, x4, y4, scale){
	this.p1 = new Point(x1, y1, scale);
	this.p2 = new Point(x2, y2, scale);
	this.p3 = new Point(x3, y3, scale);
	this.p4 = new Point(x4, y4, scale);
}

Square.prototype.ToString = function (mul){
	return this.p1.ToString(mul) + this.p2.ToString(mul) + this.p3.ToString(mul) + this.p4.ToString(mul)
}

Square.prototype.Clone = function (){
	return new Square(
			this.p1.x,
			this.p1.y,
			this.p2.x,
			this.p2.y,
			this.p3.x,
			this.p3.y,
			this.p4.x,
			this.p4.y,
			this.p1.scale
			)
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
	var sourceSize = file.sourceSize;
    var x = s.x,
        y = s.y,
        w = s.w,
        h = s.h;
    var tx = trimSize.x,
        ty = trimSize.y;
	var scale = Number(JSONFILE.meta.scale)
	
	var sh = originSize.h,
		sw = originSize.w;
	
	var offset_w = sourceSize.w - trimSize.w,
		offset_h = sourceSize.h - trimSize.h;

	main_name = getFileName(filename);

	var odd_h = false,
		odd_w = false;
	if (sh % 2 != 0) {
		odd_h = true;
	}
	if (sw % 2 != 0) {
		odd_w = true;
	}

	if (endWith(main_name, '_C')){
		sh = sh / 2;
		sw = sw / 2;
	}else if (endWith(main_name, '_LR')){
		sw = sw / 2;
	}else if (endWith(main_name, '_UD')){
		sh = sh / 2;
	}
	sh = Math.floor(sh);
	sw = Math.floor(sw);

	if (bIsRotated){
		t = w;
		w = h;
		h = t;
	}

	var sq_src, sq_screen;
	if (!bIsRotated) {
		sq_src = new Square(x, y, x + w, y, x + w, y + h, x, y + h);
	} else {
		sq_src = new Square(x + w, y, x + w, y + h, x, y + h, x, y);
	}
	sw = sw - offset_w;
	sh = sh - offset_h;
	sq_screen = new Square( tx, ty, tx + sw, ty, tx + sw, ty + sh, tx, ty + sh);

    var str = '{ tex = 1, src = {' + sq_src.ToString(1) + '}, screen = {' + sq_screen.ToString()+ '} }';
	if (endWith(main_name, '_LR')){
		var sq_screen = new Square(tx + 2 * sw - offset_w, ty, tx + sw, ty, tx + sw, ty + sh, tx + 2 * sw - offset_w, ty + sh);
		if (odd_w) {
			sq_src.p2.DeltaChangeX(-1);
			sq_src.p3.DeltaChangeX(-1);
		}
		str += ',{ tex = 1, src = {' + sq_src.ToString(1) + '}, screen = {' + sq_screen.ToString() + '} }';
	}else if (endWith(main_name, '_UD')){
		var sq_screen = new Square(tx, 2 * sh + ty - offset_h, sw + tx, 2 * sh + ty - offset_h, sw + tx, sh + ty, tx, sh + ty);
		if (odd_h) {
			sq_src.p3.DeltaChangeY(-1);
			sq_src.p4.DeltaChangeY(-1);
		}
		str += ',{ tex = 1, src = {' + sq_src.ToString(1) + '}, screen = {' + sq_screen.ToString() + '} }';
	}else if (endWith(main_name, '_C')){
		var sq_screen = new Square(2 * sw + tx - offset_w, ty, sw + tx, ty, sw + tx, sh + ty, 2 * sw + tx - offset_w, sh + ty);
		if (odd_w) {
			var new_sq_src = sq_src.Clone(),
				new_sq_screen = sq_screen.Clone();
			new_sq_src.p2.DeltaChangeX(-1);
			new_sq_src.p3.DeltaChangeX(-1);
			str += ',{ tex = 1, src = {' +new_sq_src.ToString(1) + '}, screen = {' + new_sq_screen.ToString() + '} }';
		}else {
			str += ',{ tex = 1, src = {' + sq_src.ToString(1) + '}, screen = {' + sq_screen.ToString() + '} }';
		}

		sq_screen = new Square(tx, 2 * sh + ty - offset_h, sw + tx, 2 * sh + ty - offset_h, sw + tx, sh + ty, tx, sh + ty);
		if (odd_h) {
			var new_sq_src = sq_src.Clone(),
				new_sq_screen = sq_screen.Clone();
			new_sq_src.p3.DeltaChangeY(-1);
			new_sq_src.p4.DeltaChangeY(-1);
			str += ',{ tex = 1, src = {' +new_sq_src.ToString(1) + '}, screen = {' + new_sq_screen.ToString() + '} }';
		}else {
			str += ',{ tex = 1, src = {' + sq_src.ToString(1) + '}, screen = {' + sq_screen.ToString() + '} }';
		}
		sq_screen = new Square(2 * sw + tx - offset_w, 2 * sh + ty - offset_h, sw + tx, 2 * sh + ty - offset_h, sw + tx, sh + ty, 2 * sw + tx - offset_w, sh + ty);
		if (odd_w || odd_h) {
			var new_sq_src = sq_src.Clone(),
				new_sq_screen = sq_screen.Clone();
			if (odd_w) {
				new_sq_src.p2.DeltaChangeX(-1);
				new_sq_src.p3.DeltaChangeX(-1);
			}
			if (odd_h) {
				new_sq_src.p3.DeltaChangeY(-1);
				new_sq_src.p4.DeltaChangeY(-1);
			}
			str += ',{ tex = 1, src = {' +new_sq_src.ToString(1) + '}, screen = {' + new_sq_screen.ToString() + '} }';
		}else {
			str += ',{ tex = 1, src = {' + sq_src.ToString(1) + '}, screen = {' + sq_screen.ToString() + '} }';
		}
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
            var mat = [e.matrix.a * 1024, e.matrix.b * 1024, e.matrix.c * 1024, e.matrix.d * 1024, (e.matrix.tx - (e.matrix.tx - e.left)) * 16, e.matrix.ty * 16].join(',');
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

