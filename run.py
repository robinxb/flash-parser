#-*- coding:utf-8 -*-
import os
import platform
import shutil
import time
import sys
import codecs
import inspect
import getopt
import math
import subprocess
import argparse

argParser = argparse.ArgumentParser()
argParser.add_argument("-i", "--input", help="input folder", type=str, default=None)
argParser.add_argument("-o", "--output", help="output folder", type=str, default=None)
argParser.add_argument("-x", "--xml", help="export xml", action="store_true", default=False)
argParser.add_argument("-s", "--scale", help="scale the source images", type=int, default=1)
argParser.add_argument("--with-png", help="output with the combined png", action="store_true", default=False)
group = argParser.add_mutually_exclusive_group()
group.add_argument("--tree", help="dump tree structure", action="store_true",default=False)
group.add_argument("--single", help="export flash one by one", action="store_true", default=False)
args = argParser.parse_args()

def show_exception_and_exit(exc_type, exc_value, tb):
    import traceback
    traceback.print_exception(exc_type, exc_value, tb)
    raw_input("run failed.")
    sys.exit(-1)

sys.excepthook = show_exception_and_exit

this_file = inspect.getfile(inspect.currentframe())
DIR_PATH = os.path.abspath(os.path.dirname(this_file))
SEP = os.path.sep

sys.path.append(DIR_PATH + SEP + 'scripts')
import handleCombine as HC

FLASH_ROOT = args.input
OUTPUT_PATH = args.output

print(args)

OUTPUT_NAME = "flash"
LEAVE_FILE = ['%s.1.ppm'%OUTPUT_NAME, '%s.1.pgm'%OUTPUT_NAME, '%s.lua'%OUTPUT_NAME]
if args.with_png:
    LEAVE_FILE.append('%s.1.png'%OUTPUT_NAME)

if args.xml:
    LEAVE_FILE.append('combine.xml')

global sysOpen
TMP_FOLDER_NAME = "__tmp"
SCRIPT_PATH = DIR_PATH + SEP + 'scripts'
OUTPUT_PATH = OUTPUT_PATH or DIR_PATH + SEP + 'output'
FLASH_ROOT = FLASH_ROOT or DIR_PATH + SEP + 'input'
FLASH_ROOT = os.path.realpath(FLASH_ROOT)
OUTPUT_PATH = os.path.realpath(OUTPUT_PATH)
CONVERT_PATH = SCRIPT_PATH + SEP + 'convert '

if not os.path.exists(OUTPUT_PATH):
    os.makedirs(OUTPUT_PATH)

class CmdError(Exception):
    def __init__(self, string):
        self.string = string 

    def __str__(self):
        return repr(self.string)

class MainTree():
    def __init__(self, path):
        self.mainpath = path
        self.folders = {}
        self.files = []
        self.tmpPath = self.mainpath + '/' + TMP_FOLDER_NAME
        for root, dirs, files in os.walk(path):
            self.SaveFiles(files)
            self.ParseDirs(dirs)
            dirs[:] = []

    def SaveFiles(self, fileTuple):
        for k in fileTuple:
            if k[-4:] == '.fla':
                self.files.append(self.mainpath + '/' + k)

    def ParseDirs(self, dirs):
        for k in dirs:
            self.folders[k] = MainTree(self.mainpath + '/' + k)

    def SetSingleExport(self):
        self.single_export = True

    def Export(self, forceBatch=False):
        self.Clean()

        if len(self.files) > 0:
            if args.single and not forceBatch:
                self.SingleExport()
            else:
                self.BatchExport()

        for (k,v) in self.folders.items():
            v.Export()

    def BatchExport(self):
        print('[info]Walking into %s'%self.mainpath)
        os.mkdir(self.tmpPath)
        self.CopyScript(self.tmpPath)

        # pngs
        print ('[info]Export png')
        os.system(sysOpen + ' ' + self.tmpPath + SEP + 'exportFiles.jsfl')
        self.WaitJSDone(self.tmpPath + SEP + 'done', True)

        #TP
        self.PreHandleMirror()
        self.RemoveAnchorPng()
        self.TexturePacker()
        self.ImageMagicka()
        self.WriteOriginImgSizeInfo()

        #xml
        os.system(sysOpen + ' ' + self.tmpPath + SEP + '/main.jsfl')
        self.WaitJSDone(self.tmpPath + SEP + 'done', True)

        self.Combine()
        self.CopyUsefulFiles()
        #self.Clean()

    def SingleExport(self):
        groupFiles = []
        os.mkdir(self.tmpPath)
        for fpath in self.files:
            fname = os.path.basename(fpath)
            file_dir_path = self.tmpPath + SEP + fname[:-4]
            if "@" in fname:
                groupName = fname.split('@')[0]
                if groupName not in groupFiles:
                    groupFiles.append(groupName)
                groupDir = self.tmpPath + SEP + groupName
                if not os.path.isdir(groupDir):
                    os.mkdir(groupDir)
                shutil.copy(fpath, self.tmpPath + SEP + groupName + SEP + fname)
            else:
                os.mkdir(file_dir_path)
                shutil.copy(fpath, file_dir_path + SEP + fname)
                tree = MainTree(file_dir_path)
                tree.SetSingleExport()
                tree.Export(True)
        for groupName in groupFiles:
            tree = MainTree(self.tmpPath + SEP + groupName)
            tree.SetSingleExport()
            tree.Export(True)
        #self.Clean()

    def WaitJSDone(self, filepath, bRemove = False):
        while(not os.path.exists(filepath)):
            time.sleep(1)
        if bRemove:
            os.remove(filepath)

    def CopyUsefulFiles(self):
        if args.with_png:
            os.rename(self.tmpPath + SEP + "%s.png"%OUTPUT_NAME, self.tmpPath + SEP + "%s.1.png"%OUTPUT_NAME)
        for filename in LEAVE_FILE:
            if os.path.exists(self.tmpPath + '/%s'%filename):
                name, ext = os.path.splitext(filename)
            if ext == ".ppm" or ext == ".pgm" or ext == ".png":
                ext = ".1" + ext
            dirname = os.path.dirname(self.tmpPath.replace('\\', '/'))
            names = dirname.split('/')
            output_filename = names[len(names) - 1] + ext
            if args.tree:
                path_tree = self.mainpath .replace(FLASH_ROOT, '')
                if not os.path.exists(OUTPUT_PATH + path_tree):
                    os.makedirs(OUTPUT_PATH + path_tree)
                shutil.copy(self.tmpPath + '/%s'%filename, OUTPUT_PATH + path_tree + '/%s'%output_filename)
            else:
                shutil.copy(self.tmpPath + '/%s'%filename, OUTPUT_PATH + '/%s'%output_filename)


    def Clean(self):
        if os.path.exists(self.tmpPath):
            shutil.rmtree(self.tmpPath)

    def Combine(self):
        bExist = False
        filepath = self.tmpPath + '/combine.xml'
        for root, dirs, files in os.walk(self.tmpPath):
            for k in files:
                if not k[-4:] == '.xml':
                    continue
                if not bExist:
                    bExist = True
                    handle = codecs.open(filepath, 'a')
                    handle.write('<root>\n')
                    handle.close()
                src = codecs.open(root + '/' +k, 'r')
                content = src.read()
                handle = codecs.open(filepath, 'a')
                handle.write(content)
                handle.write('\n')
                handle.close()
            break
        if bExist:
            handle = codecs.open(filepath, 'a')
            handle.write('</root>\n')
            handle.close()
            self.hc = HC.Handler(filepath.replace('\\','/'))
            self.hc.Export(self.tmpPath.replace('\\','/') + '/%s.lua'%OUTPUT_NAME)

    def PreHandleMirror(self):
        self.originImgSize = {}
        tpath = self.tmpPath
        imgpath = self.tmpPath + '/singleimg'
        sysType = platform.system()
        if sysType == "Windows":
            tpath = tpath.replace('/','\\')
            imgpath = imgpath.replace('/','\\')
        files = os.listdir(imgpath)
        identify_path = SCRIPT_PATH + SEP + 'identify '
        if sysType == "Windows":
            identify_path = SCRIPT_PATH + SEP + 'identify.exe '
        for k in files:
            cmd = '%s -format "%%[fx:w]x%%[fx:h]" "%s"'%(identify_path, imgpath + '%s%s'%(os.path.sep ,k))
            sts, imgSizeStr = self.ExecuteCmd(cmd)
            assert(imgSizeStr)
            w, h = imgSizeStr.split('x')
            w, h = int(w), int(h)
            self.originImgSize[k] = '{"w": %s, "h":%s}'%(w, h)
            main_name, ext = os.path.splitext(k)
            bCrop = False
            if main_name[-3:] == '_UD':
                bCrop = True
                s_w, s_h = w, h / 2
            elif main_name[-3:] == '_LR':
                bCrop = True
                s_w, s_h = w / 2, h
            elif main_name[-2:] == '_C':
                bCrop = True
                s_w, s_h = w / 2, h / 2
            if bCrop:
                if not w % 2 == 0:
                    s_w = s_w + 1
                if not h % 2 == 0:
                    s_h = s_h + 1
                self.CropImage(imgpath, k, s_w, s_h)

    def CropImage(self, imgpath, filename, w, h):
        cmd = "%s %s -crop %sx%s+0+0 %s"
        cmd = cmd%(
                CONVERT_PATH,
                imgpath + os.path.sep + filename,
                w,
                h,
                imgpath + os.path.sep + filename,
                )
        self.ExecuteCmd(cmd)

    def RemoveAnchorPng(self):
        imgpath = self.tmpPath + os.path.sep + 'singleimg'
        files = os.listdir(imgpath)
        for k in files:
            if k.find('__anchor') >= 0:
                os.remove(imgpath + os.path.sep + k)

    def ExecuteCmd(self, cmd):
        pipe = subprocess.Popen(cmd, stdout=subprocess.PIPE, shell=True, universal_newlines=True)  
        output = "".join(pipe.stdout.readlines()) 
        sts = pipe.returncode
        if sts is None: sts = 0
        if not sts == 0:
            self.Clean()
            raise CmdError, output
            sys.exit(-1)
        return sts, output

    def ImageMagicka(self):
        cmd = CONVERT_PATH + self.tmpPath + SEP + "%s.png "%OUTPUT_NAME + self.tmpPath + SEP + "%s.1.ppm"%OUTPUT_NAME
        cmd2 = CONVERT_PATH + self.tmpPath + SEP + "%s.png "%OUTPUT_NAME  + ' -channel A -separate %s.1.pgm'%(self.tmpPath + SEP + OUTPUT_NAME)
        self.ExecuteCmd(cmd)
        self.ExecuteCmd(cmd2)

    def TexturePacker(self):
        tpath = self.tmpPath 
        sysType = platform.system()
        if sysType == "Windows":
            tpath = tpath.replace('/','\\')

        cmd = ' '.join([
                'TexturePacker',
                '--algorithm MaxRects',
                '--maxrects-heuristics Best',
                '--pack-mode Best',
                '--scale %s'%args.scale,
                '--premultiply-alpha',
                '--sheet %s' %(tpath + os.path.sep + '%s.png'%OUTPUT_NAME),
                '--texture-format png',
                '--extrude 2',
                '--data %s' % (tpath + os.path.sep + '%s.json'%OUTPUT_NAME),
                '--format json',
                '--trim-mode Trim',
				'--disable-rotation',
                '--size-constraints POT',
                #'--shape-debug',
                '%s' %  (tpath + os.path.sep + 'singleimg')
                ])

        sts, out = self.ExecuteCmd(cmd)
        if sts == 0:
            print('[info]TP success')

    def WriteOriginImgSizeInfo(self):
        content = "{"
        for k,v in self.originImgSize.items():
            content += '"%s" : %s,\n'%(k, v)
        content += "}"
        handle = open(self.mainpath + '/' + TMP_FOLDER_NAME + '/originsize.json', 'w')
        handle.write(content)
        handle.close()

    def CopyScript(self, path):
        handle = open(SCRIPT_PATH + '/exportFiles.jsfl')
        content = handle.read()
        handle.close()

        header = "var publishFolder = '%s'; \n"%(self.mainpath.replace('\\','/'))
        footer = """batToDo(publishFolder);
FLfile.write("file:///%s",FLfile.uriToPlatformPath(publishFolder) + "\\n");"""%(self.mainpath.replace('\\','/') + '/' + TMP_FOLDER_NAME + '/done')
        content = header + content + footer
        handle = open(self.mainpath + '/' + TMP_FOLDER_NAME + '/exportFiles.jsfl', 'w')
        handle.write(content)
        handle.close()

        handle = open(SCRIPT_PATH + '/main.jsfl')
        content = handle.read()
        handle.close()

        header = 'eval("var JSONFILE = " + FLfile.read("file:///%s/%s.json"));\n'%(self.tmpPath.replace('\\','/'), OUTPUT_NAME)
        header += 'eval("var ORIGIN_SIZE = " + FLfile.read("file:///%s/%s.json"));\n'%(self.tmpPath.replace('\\','/'), "originsize")
        footer = "var publishFolder = '%s'; \n"%(self.mainpath.replace('\\','/'))
        footer += "var tmpPath = '%s';\n"%(self.tmpPath.replace('\\','/'))
        footer += """batToDo(publishFolder, tmpPath);
FLfile.write("file:///%s",FLfile.uriToPlatformPath(publishFolder) + "\\n");"""%(self.mainpath.replace('\\','/') + '/' + TMP_FOLDER_NAME + '/done')
        content = header + content + footer
        handle = open(self.mainpath + '/' + TMP_FOLDER_NAME + '/main.jsfl', 'w')
        handle.write(content)
        handle.close()

    def Run(self):
        self.Export()


def loadFiles():
    root = MainTree(FLASH_ROOT)
    return root

if __name__ == '__main__':
    sysType = platform.system()
    if sysType == "Darwin":
        sysOpen = "open"
    elif sysType == "Windows":
        sysOpen = "start"
        CONVERT_PATH = SCRIPT_PATH + SEP + 'convert.exe '
    else:
        raise CmdError, 'System not support: %s'%sysType
    
    root = loadFiles()
    root.Run()

