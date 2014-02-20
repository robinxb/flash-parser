var publishFolder = fl.browseForFolderURL("请选择你要批量发布.fla的目录");

var num = 0;
var summaryTxt = "";



function DistinctImages() {
    this.imageCount = 0;
}
DistinctImages.prototype.nextName = function () {
    var name = 'imgs_' + (this.imageCount < 10 ? '0' + this.imageCount : this.imageCount) + '.png';
    this.imageCount++;
    return name;
}


function batToDo(folder)
{
	var files = FLfile.listFolder(folder + "/*.fla", "files");
	var i = 0;
	var imgCounter = new DistinctImages();
	for(; i < files.length; i++)
	{
		pub(folder, files[i], imgCounter);
	}
	
	var directorys = FLfile.listFolder(folder + "/../", "directories");
	for(i = 0; i < directorys.length; i++)
	{
		batToDo(folder + "/" + directorys[i]);
	}
}


function pub(dir, file, imgCounter)
{
	fl.trace(dir + file + imgCounter)
	var doc = fl.openDocument(dir + "/" + file);
	// doc.publish();
	// fl.trace(fl.getDocumentDOM().name)

	var lib = fl.getDocumentDOM().library.items;
	for (var i = 0, len = lib.length; i < len; i++){
	    var item = lib[i];
	    if (item.itemType == 'bitmap' ){
	    	fl.trace(item.name)
	        var filename = imgCounter.nextName();
	        item.exportToFile("file:///tmp/flash_parser/images/" + item.name, 100)
	        // item.exportToFile('file:///' + outputFolder + 'images/' + filename,100)
	    }
	}

	doc.close();
	summaryTxt += num++ + "、" + file + "\n"
}

batToDo(publishFolder);
FLfile.write("file:///tmp/flash_parser.tmp",FLfile.uriToPlatformPath(publishFolder) + "\n");
