Flash-Parser 中文使用手册
====




这个工具能做什么？
----

* 生成[EJOY 2D 使用的texture格式](https://github.com/cloudwu/ejoy2d/blob/master/doc/apicn.md#texture)  [Example](https://github.com/robinxb/flash-parser/tree/master/output)

* 生成XML文件 [Example1](https://github.com/robinxb/flash-parser/blob/master/output/type1/type1.xml) [Example2](https://github.com/robinxb/flash-parser/blob/master/output/type2/type2.xml)


准备工作
----

1. 安装Flash CC Mac 或 Windows 版本. 
2. 安装TexturePacker后安装其命令行工具。 确保在 cmd/shell 中输入 ```TexturePacker``` 不会出现Command not found.

运行参数解释
----


	python run.py [-i folder] [-o folder] [-x] [-t]
	
	
#### [-i folder]

**input**

存放Flash文件的文件夹。 支持Linux/Win格式， 支持相对路径。

***默认参数为run.py脚本所在目录的input文件夹***，等同于`python run.py -i input`

例:

	python run.py -i ./
	python run.py -i ../abc/
	python run.py -i /User/Robin/FlashFiles
	python run.py -i E:\Files
	python run.py -i E:/Files\Flash/

#### [-o folder]

**output**

存放输出文件目录。此目录若不存在会自动生成。
***默认参数为run.py脚本所在目录的input文件夹***，等同于`python run.py -o output`

#### [-x]

***xml***

控制是否输出xml文件， 默认关闭即只输出 ppg/ppm/lua 文件。

#### [-t]

***tree***

保留input文件夹下的目录树结构.***默认不开启***


例：

flash文件存放的文件夹树结构为

	input
	├── type1
	│   └── robot@act1.fla
	└── type2
	    ├── robot@act1.fla
		├── robot@act2.fla
		└── robot_01.fla


运行命令 ```python run.py -i input -o output```

则输出至run.py 同级目录output (如没有则自动创建)

其文件夹树结构为：

	output
	├── type1.1.pgm
	├── type1.1.ppm
	├── type1.lua
	├── type1.xml
	├── type2.1.pgm
	├── type2.1.ppm
	├── type2.lua
	└── type2.xml
	
若加上```-t```参数，则输出文件夹目录为

	output
	├── type1
	│   ├── type1.1.pgm
	│   ├── type1.1.ppm
	│   └── type1.lua
	└── type2
	    ├── type2.1.pgm
	    ├── type2.1.ppm
	    └── type2.lua



#### Flash文件名称及元件名的特殊含义

##### 文件名

在```input/type2```文件夹下，可以看到```robot@act1.fla```和```robot@act2.fla```

***文件名中的```@```表明 ： 从```@```到后缀的```.```中间的内容为robot动作的action名。***

如果你很熟悉ejoy2d的资源格式，想必不难理解action的用途。

你可以在lua文件中首先创建robot并指定其播放的动作:

	local pack = require "ejoy2d.simplepackage"
	local obj = ej.sprite('type1', 'robot')
	obj.action = "act1"
	--obj.action = 'act2'
	
##### Flash元件名

打开示例的```robot@act1.fla```文件，在库中你会发现一个名称为```@HeadMc```的元件。

***以```@```开头的元件会以其作为另一个树结构的根而保留，而不是完全摊平Flash的树结构***

或许这样说很难理解，不妨看一下output/type2/type2.lua。

```
    id = 0,
    name = "body.png",
    { tex = 1, src = {3, 3, 75, 3, 75, 113, 3, 113, }, screen = {16, 32, 1168, 32, 1168, 1792, 16, 1792, } },
    type = "picture",

	id = 4,
    name = "wheel.png",
    { tex = 1, src = {161, 3, 235, 3, 235, 77, 161, 77, }, screen = {80, 80, 1264, 80, 1264, 1264, 80, 1264, } },
    type = "picture",   

    id = 9,
    type = "animation",
    export = "robot@act2@HeadMc",
    component = {
        {id = 3},
    },
    {
        {{index = 0, mat = {1024, 0, 0, 1024, -256, -1001}},},
    },

    id = 11,
    type = "animation",
    export = "robot",
    component = {
        {id = 4},
        {id = 1},
        {id = 5},
        {id = 7},
        {id = 2},
        {id = 0},
        {id = 5},
        {id = 1},
        {id = 5},
        {id = 7},
        {id = 2},
        {id = 7},
        {id = 6},
        {name = "robot@act2@HeadMc", id = 9},
        {name = "robot@act1@HeadMc", id = 8},
    },
        { action = "act2",
        .....省略动画
       	},
       	{ action = "act1",
       	.....省略动画
       	},
    },
    
```

可以看到 robot 动画包含了HeadMc这个组件， 引用了另一个animation(id = 9 和 8)。而其他组件都只是引用了picture类型。

由于我们有两个动画(act1和act2)，所以就有两个部件(robot@act2@HeadMc 和 robot@act1@HeadMc)


其他
====

这个工具还有一些不完善的地方，例如Flash中的Alpha通道、色彩效果暂未能支持。

如果需要帮助请在[Issues](https://github.com/robinxb/flash-parser/issues)提出。

生成的xml格式可以方便进行二次开发。生成xml文件的脚本经轻度修改即可剥离出来。