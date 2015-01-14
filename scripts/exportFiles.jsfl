function batToDo(folder) {
    fl.showIdleMessage(false)
    fl.closeAll(false)
    var files = FLfile.listFolder('file:///' + folder + "/*.fla", "files");
    for (var i = 0; i < files.length; i++) {
        pub(folder, files[i]);
    }
    fl.showIdleMessage(true)
}

function pub(dir, file) {
    var t = 'file:///' + dir.replace(":", "|") + "/" + file
    var doc = fl.openDocument(t);
    var lib = fl.getDocumentDOM().library.items;
    for (var i = 0, len = lib.length; i < len; i++) {
        var item = lib[i];
        if (item.itemType == 'bitmap' && !isUnused(item)) {
            var name = item.name,
                fixed_name = item.name.replace(/^\s+|\s+$/g, ""),
                ext_name = fixed_name.split('.').pop()
                if (ext_name != "png"){
                    fixed_name = fixed_name + ".png";
                }
            if (fixed_name != name){
                fl.trace("changing " + file + ':'+ item.name + '->' + fixed_name);
                item.name = fixed_name
            }
            item.exportToFile("file:///" + dir + '/__tmp/singleimg/' + item.name, 100)
        }
    }
	doc.save(true);
    doc.close(false);
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