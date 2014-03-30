function batToDo(folder) {
    var files = FLfile.listFolder('file:///' + folder + "/*.fla", "files");
    for (var i = 0; i < files.length; i++) {
        pub(folder, files[i]);
    }
}

function pub(dir, file) {
    var doc = fl.openDocument('file://' + dir + "/" + file);
    var lib = fl.getDocumentDOM().library.items;
    for (var i = 0, len = lib.length; i < len; i++) {
        var item = lib[i];
        if (item.itemType == 'bitmap') {
            item.exportToFile("file:///" + dir + '/__tmp/singleimg/' + item.name, 100)
        }
    }
    doc.close();
}