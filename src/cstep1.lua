local require = require
local lib = require "lib"
local foreach = lib.foreach

local src = arg[1]
local dst = arg[2]
assert(src and type(src) == "string", src)
assert(dst and type(dst) == "string", dst)
data = require(src)

local output = lib.rebuild_tree(data)

local file = io.open(dst..".lua","w")
file:write("return {\n"..lib.dump(output).."\n}")
file:close()