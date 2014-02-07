var outputFolder = fl.browseForFolderURL("select output folder")
var s = outputFolder.split('/');
outputFolder = '';
for (i in s){
    if (i > 3){
        outputFolder += '/' + s[i];
    }
}
outputFolder += '/';
// fl.trace(outputFolder);
FLfile.write("file:///tmp/flash_parser.tmp", outputFolder + '\n');

if (FLfile.exists("file:///" + outputFolder + "images/")){
    FLfile.remove("file:///" + outputFolder + "images/");
}
FLfile.createFolder("file:///" + outputFolder + "images/");
function DistinctImages() {
    this.imageCount = 0;
}
DistinctImages.prototype.nextName = function () {
    var name = 'imgs_' + (this.imageCount < 10 ? '0' + this.imageCount : this.imageCount) + '.png';
    this.imageCount++;
    return name;
}

var imgCounter = new DistinctImages();
var lib = fl.getDocumentDOM().library.items;
for (var i = 0, len = lib.length; i < len; i++){
    var item = lib[i];
    if (item.itemType == 'bitmap' ){
        var filename = imgCounter.nextName();
        item.exportToFile('file:///' + outputFolder + 'images/' + filename,100)
    }
}
