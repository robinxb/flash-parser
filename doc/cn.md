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


	python run.py [-i <folder>] [-o <folder>] [-x] [-t] [-s <number>] [--extend-name=<string>] [--with-png]
	
	
#### [-i \<folder>]

**input**

存放Flash文件的文件夹。 支持Linux/Win格式， 支持相对路径。

***默认参数为run.py脚本所在目录的input文件夹***，等同于`python run.py -i input`

例:

	python run.py -i ./
	python run.py -i ../abc/
	python run.py -i /User/Robin/FlashFiles
	python run.py -i E:\Files
	python run.py -i E:/Files\Flash/

#### [-o \<folder>]

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



#### [-s \<number>]

***scale***

输出图素与原图大小比。

例如想输出原图一半大小的资源：```-s 0.5```

#### [--extend-name=\<string>]

自定义生成文件后缀名。

例 ```--extend-name=_hd``` 则生成```filename_hd.lua```, ```filename_hd.1.ppm```等。

#### [--with-png]

生成png图片至output目录。带有与ppm/pgn文件相同的文件名。

#### Flash文件名称及元件名的特殊含义

##### 文件名

在```input/type2```文件夹下，可以看到```robot@act1.fla```和```robot@act2.fla```。

***文件名中的```@```表明 ： 从```@```到后缀的```.```中间的内容为robot动作的action名。***

如果你很熟悉ejoy2d的资源格式，想必不难理解action的用途。

你可以在lua文件中首先创建robot并指定其播放的动作:

	local sprite = require "ejoy2d.sprite"
	local obj = sprite.sprite('type1', 'robot')
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

锚点
----

锚点目前只支持位图(bitmap)元件来定义。

关键字为```__anchor```(双下划线)

组件名为下划线前的所有字符。若无，则默认名为```anchor```。

例:  将```boss.png```更名为```boss__anchor.png```，最终的输出资源则不包含boss__anchor.png。Animation的component中，原```{id = xx}```将被替换为```{name = "boss"}```。

镜像图片裁剪
----

Flash中，若图片去掉后缀名后以```_UD```,```_LR```,```_C```结尾，则表明，该图片支持镜像。

+ ```_UD```： 水平对称轴，即上下对称。
+ ```_LR```： 垂直对称轴，即左右对称。
+ ```_C``` ： 水平、垂直对称轴，即中心对称。

例如有个中心对称的圆, 名叫```circle.png```,将其改名为```circle_C.png```，则在最终输出的资源中，会只有1/4个圆。

关于色彩效果
----

Flash中，变色是在组件的色彩效果中进行的。如要使用变色，样式请使用"高级"。

面板上会显示如下：

Alpha: 100% x A + 0

红 : 100% x R + 0

绿 : 100% x G + 0

蓝 : 100% x B + 0

EJOY2D中，颜色变换可分为color 和 add，分别对应乘法和加法。 由于flash中的变色算法和引擎有偏差，所以可以采取以下两种形式来让一个图变为任何想要的颜色：

+ 图片为纯白，只用color(对应flash中的百分比)。若采用此种方法，请确保flash中```+```号后的值全为0。
+ 图片为纯黑，只用add，对应flash中百分比后附加值。若采用此种方法，请确保flash中```%```号前的值全为100。

注意事项：

* 请确保color和add两种方式不同时使用。(Alpha可共用，比如用add做变色，但是修改Alpha的百分比)
* Alpha只能在color中使用，也就是Flash中```Alpha: 100% x A + 0```里的百分比。

已知问题
----

Flash中的元件类型若为影片剪辑(Movie clip)，在输出的时候会将其与循环选项设定为循环(Loop)的图形(Graphic)元件相同对待。影片剪辑应该是有独立时间轴的，效果上应等于循环选项设定为播放一次(Play Once)的图形(Graphic)元件。

其他
----

如果需要帮助请在[Issues](https://github.com/robinxb/flash-parser/issues)提出。

生成的xml格式可以方便进行二次开发。生成xml文件的脚本经轻度修改即可剥离出来。
