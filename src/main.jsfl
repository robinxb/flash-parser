function each(array, fn, bind) {
    if (!bind) {
        bind = this;
    }
    var str = '';
    for (var i = 0, len = array.length; i < len; i++) {
        str += fn.call(bind, array[i], i) + '\n';
    }
}

function Flash(Document){
	this.imgconter = 0;
	this.document = Document;

	this.loadLibrary(this.document.library);
}

Flash.prototype.loadLibrary = function (lib){
	each(lib.items,function(item){
		if (item.itemType == 'movie clip' || item.itemType == 'graphic'){
			;
		}else if (item.itemType == 'bitmap'){
			fl.trace(item.name);
		}else if (item.itemType == 'folder'){
			;
		}
	});
}





fl.trace(fl.getDocumentDOM().path);
var flash = new Flash(fl.getDocumentDOM());