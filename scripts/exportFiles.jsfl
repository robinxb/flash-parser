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
            item.exportToFile("file:///" + dir + '/__tmp/singleimg/' + item.name, 100)
        }
    }
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