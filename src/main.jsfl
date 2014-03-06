// var outputPath = "file:///tmp/flash_parser/output/";
// var src = "file:///tmp/flash_parser/t.json";
eval("var src = " + FLfile.read("file:///tmp/flash_parser/t.json"));
src.findSrc = function (filename){
    if (! src.frames[filename]){
        fl.trace("cant find " + filename);
    }
    return src.frames[filename];
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

function Flash(document, dest, path, luafile, imgCounter, index) {
    this.timelines = [];
    this.document = document;
    this.curIndex = index;

    this.resourcePath = path;
    if (path.length == 0) {
        this.destFolder = dest + path;
    } else {
        this.destFolder = dest + '/' + path;
    }

    this.luaFile = luafile;
    this.imgFolder = 'images';
    this.imgCounter = imgCounter;

    this.autoInsertKeyframe();
    this.loadLibrary(document.library);
}

Flash.prototype.autoInsertKeyframe = function (item){
    var d = fl.getDocumentDOM();
    function convertLayer(l){
            var f_vec = []
            each (l.frames, function (f){
                    if (f.tweenType != "none"){ f_vec.push(f); }
                    // f.convertToFrameByFrameAnimation(); 
                });
            each (f_vec, function(f){
                f.convertToFrameByFrameAnimation(); 
            });
        }

    each (d.library.items, function (item){
        if (item.symbolType == 'graphic'){
            var tl = item.timeline;
            each(tl.layers, convertLayer);
        }
        });
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
            var filename = item.name;
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
    fl.trace("preparing output " + URI)
    if (FLfile.write(URI, lua.buffer)) {
        console.log('export:' + URI + ' success');
    }
}
Flash.prototype.parse = function (timeline) {
    // add default timeline
    this.main = new Timeline(this, timeline).setName(this.luaFile);
    this.main.bIsMain = true
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
    this.curIndex = index + 1
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
    this.elementStartFrame = element.firstFrame + 1;

    this.elementColorAlphaAmount = element.colorAlphaAmount;
    this.elementColorAlphaPercent = element.colorAlphaPercent;
    this.elementColorBlueAmount = element.colorBlueAmount;
    this.elementColorBluePercent = element.colorBluePercent;
    this.elementColorGreenAmount = element.colorGreenAmount;
    this.elementColorGreenPercent = element.colorGreenPercent;
    this.elementColorRedAmount = element.colorRedAmount;
    this.elementColorRedPercent = element.colorRedPercent;

    // console.log(element.name, this.mat.tx,this.tmat.x,",,,",element.x);
    // console.log(element.scaleX)
    // console.log(element.rotation)
    // console.log(this.mat.a,this.mat.b,this.mat.c,this.mat.d,this.mat.tx,this.mat.ty)
}

function RGBToHex(rgb){ 
   var regexp = /[0-9]{0,4}/g;  
   var re = rgb.match(regexp);//利用正则表达式去掉多余的部分，将rgb中的数字提取
   var hexColor = ""; var hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];  
   for (var i = 0; i < re.length; i++) {
        var r = null, c = re[i], l = c; 
        var hexAr = [];
        while (c > 16){  
              r = c % 16;  
              c = (c / 16) >> 0; 
              hexAr.push(hex[r]);  
         } hexAr.push(hex[c]);
         if(l < 16&&l != ""){        
             hexAr.push(0)
         }
       hexColor += hexAr.reverse().join(''); 
    }  
   return hexColor;  
} 

function GenARGB(alphaP, rA, gA, bA){
    if (alphaP == 100 && rA == 0 && gA == 0 && bA == 0){ return }
    if (alphaP < 0){alphaP = 0;}
    var addFlag = false;
    var add_r = 0 , add_g = 0, add_b = 0;
    if (rA > 0){ addFlag = true; add_r = rA; rA = 0;};
    if (gA > 0){ addFlag = true; add_g = gA; gA = 0;};
    if (bA > 0){ addFlag = true; add_b = bA; bA = 0;};
    rA += 255;
    gA += 255;
    bA += 255;
    var color,add;
    color = "0x" + RGBToHex( parseInt(alphaP*255/100) + "," + rA + "," + gA + "bA" + bA  )
    if(addFlag){
        add = "0x00" + RGBToHex(add_r + "," + add_g + "," + add_b);
    }
    if ((addFlag || color!="0xFFFFFFFF") && color != "0x"){
        return [color, add];
    }
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
                var str = '{ ';
                if (this.elementStartFrame){
                    str += ' startFrame = ' + this.elementStartFrame + ", "
                    this.elementStartFrame += 1
                }

                var r= GenARGB(this.elementColorAlphaPercent,
                                     this.elementColorRedAmount,
                                     this.elementColorGreenAmount,
                                     this.elementColorBlueAmount);
                if (r){
                    var color = r[0];
                    var add = r[1];
                    if (color) {
                        str += "color = " + color + ", ";
                    }
                    if (add) {
                        str += "add = " + add + ", ";
                    }
                }

                

                str += ' index = ' + f.elementIndex + ', mat = {' + f.mat.a*1024 + ', ' + f.mat.b*1024 + ', ' + f.mat.c*1024 +', ' + f.mat.d*1024 + ', ' + f.mat.tx*16 + ', ' + f.mat.ty*16 + ' }}';
                if (f.text){ str += ", --  " + f.text}
                lua.childBegin();
                lua.inline(str);
                lua.childEnd();
            }
        }, this);
    }
}

function fix_mat(m){
    if (m.a == 0){ m.a = 0.0001 }
    if (m.b == 0){ m.b = 0.0001 }
    if (m.c == 0){ m.c = 0.0001 }
    if (m.d == 0){ m.d = 0.0001 }
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
    if (nextFrame){ // insert blank frame
        for (var i = 0; i < nextFrame.startFrame - this.startFrame - this.duration; i++){
            res.push({
                'type' : "blank",
            });
        };
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
    // for (var i = 0, len = this.frames.length; i < len; i ++){
    //     this.frames[i].convertToFrameByFrameAnimation()
    // }
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
        lua.inline('tlname = "' + this.name + '\"');
        if (this.bIsMain == true) {
            lua.inline('export = "' + this.name + '\"');
        }
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



        var file = src.findSrc(item.content.filename);
        var s = file.frame;
        var bIsRotated = file.rotated;
        var trimSize = file.spriteSourceSize;

        var x = s.x, y = s.y, w = s.w, h = s.h;
        var tx = trimSize.x, ty = trimSize.y, tw = trimSize.w, th = trimSize.h;

        var pstr = '';
        if (!bIsRotated){
            pstr += x + ', ' + y + ', ';
            pstr += (x+w) + ', ' + y + ', ';
            pstr += (x+w) + ', ' + (y+h) + ', ';
            pstr += x + ', ' + (y+h) + ', ';
        }else{
            pstr += (x+h) + ', ' + y + ', ';
            pstr += (x+h) + ', ' + (y+w) + ', ';
            pstr += x + ', ' + (y+w) + ', ';
            pstr += x + ', ' + y + ', ';
        }
        screenStr = "";
        screenStr += tx*16 + ", " + ty*16 + ", ";
        screenStr += (tx + tw)*16 + ', ' + ty*16 + ', ';
        screenStr += (tx + tw)*16 + ', ' + (ty + th)*16 + ', ';
        screenStr += tx*16 + ', ' + (ty + th)*16 + ', ';
        lua.inline('{ tex = 1, src = {' + pstr + '}, screen = {'  + screenStr + '} }');
        lua.inline('filename = "' + item.content.filename + '\"');
        lua.end();
    }
}
Timeline.prototype.setName = function (name) {
    this.name = name;
    return this;
}
function exportFla(dest, path, filename, imgCounter, beginIndex) {
    var flash = new Flash(fl.getDocumentDOM(), dest, path, filename, imgCounter, beginIndex);
    flash.parse(fl.getDocumentDOM().getTimeline());
    flash.exportLua();
    return flash.curIndex + 1
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

function batToDo(folder)
{
    var files = FLfile.listFolder(folder + "/*.fla", "files");
    var i = 0;
    var imgCounter = new DistinctImages();
    var nextindex = 0
    for(; i < files.length; i++)
    {
        nextindex = pub(folder, files[i], imgCounter, nextindex);
    }
    
    var directorys = FLfile.listFolder(folder + "/../", "directories");
    for(i = 0; i < directorys.length; i++)
    {
        batToDo(folder + "/" + directorys[i]);
    }
}

function DistinctImages() {
    this.imageCount = 0;
}
DistinctImages.prototype.nextName = function () {
    var name = 'imgs_' + (this.imageCount < 10 ? '0' + this.imageCount : this.imageCount) + '.png';
    this.imageCount++;
    return name;
}

function pub(dir, file, imgCounter, beginIndex)
{
    fl.trace("start parse "+ file)
    fl.showIdleMessage(false)
    var doc = fl.openDocument(dir + "/" + file);
    var outputPath = "file:///tmp/flash_parser/output/" ;
    var filename = doc.name
    filename = filename.replace(".fla", "")
    var nextindex = exportFla(outputPath,'',filename ,new DistinctImages(), beginIndex);
    doc.close(false);
    fl.trace(file + "trace done! max index:" + nextindex)
    return nextindex

}

function m_add(a, b){
    var r = {
        'a' : a.a + b.a,
        'b' : a.b + b.b,
        'c' : a.c + b.c,
        'd' : a.d + b.d,
        'tx': a.tx + b.tx,
        'ty': a.ty + b.ty,
    };
    return r
}

function m_mul(a, b){
    var r = {
        'a' : 0,
        'b' : 0,
        'c' : 0,
        'd' : 0,
        'tx': 0,
        'ty': 0,
    };
    r.a = (a.a * b.a + a.b * b.c) / 1024;
    r.b = (a.a * b.b + a.b * b.d) / 1024;
    r.c = (a.c * b.a + a.d * b.c) / 1024;
    r.d = (a.c * b.b + a.d * b.d) / 1024;
    r.tx = (a.tx * b.a + a.ty * b.c) / 1024 + b.tx;
    r.ty = (a.tx * b.b + a.ty * b.d) / 1024 + b.ty;
    return r
}

function m_inv(m){
    var o = {
        'a' : 0,
        'b' : 0,
        'c' : 0,
        'd' : 0,
        'tx': 0,
        'ty': 0,
    };
    var t = m.a * m.d - m.b * m.c;
    o.a = m.d * 1024 * 1024 / t;
    o.b = - m.b * 1024 * 1024 / t;
    o.c = - m.c * 1024 * 1024 / t;
    o.d = m.a * 1024 * 1024 / t;
    o.tx = - (m.tx * o.a + m.ty * o.c) / 1024;
    o.ty = - (m.tx * o.b + m.ty * o.d) / 1024;
    return o
}

function m_div(m){
    return {
        'a' : m.a / 2,
        'b' : m.b / 2,
        'c' : m.c / 2,
        'd' : m.d / 2,
        'tx' : m.tx / 2,
        'ty' : m.ty / 2,
    }
}

function gen_trans_mat(b_mat, n_mat, duration){
    function _gen_once(Y){
        var Z = {'a' : 1024, 'b' : 0, 'c' : 0, 'd': 1024, 'tx':0, 'ty':0};
        function _sqrt(Y, Z){
            var Y_1 = m_add(Y, m_inv(Z)) ;
            var Z_1 = m_add(Z, m_inv(Y)) ;


            return [m_div(Y_1), m_div(Z_1)]
        }

        var r = [];
        for (var i = 0; i < 6; i ++){
            r = _sqrt(Y, Z);
            Y = r[0];
            Z = r[1];
        }
        return Y
    }

    function _gen_1024(b_mat, n_mat){
        var Y = m_mul(m_inv(b_mat), n_mat);
        for (var i = 0; i < 11; i++){
            Y = _gen_once(Y);
        }
        return Y
    }

    var tt = _gen_1024(b_mat, n_mat);
    var r = tt;
    // var times = 32768 / duration;
    var times = 2048  / duration;
    for (i = 0; i < times; i++){
        r = m_mul(r, tt);
    }
    return r
}

console.clear();
console.log('start loop');
var publishFolder = fl.browseForFolderURL("请选择你要批量发布.fla的目录");
batToDo(publishFolder);
console.log('ALL DONE !');
FLfile.write("file:///tmp/flash_parser.tmp","");
