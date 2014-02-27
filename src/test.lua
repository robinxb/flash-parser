local require = require
local data = require "harvest"
local lib = require "lib"
local foreach = lib.foreach

local main = nil
foreach(data, function(d) if d.export then main = d return end end)

assert(main)
local total_frame = main.framecount
local id = main.id
local lib_build = lib.build_lib(data)

local frames = {}
for i = 1, total_frame do
	table.insert(frames, lib.build_single_frame_tree(lib_build[id], i, lib_build))
end

-- table.insert(frames, lib.build_single_frame_tree(lib_build[id], 1, lib_build))
-- lib.print_r(res)
-- local test_frame = lib.build_single_frame_tree(lib_build[209], 5, lib_build)

-- 
-- lib.make_id(frames)
ani_lib = lib.make_id(frames)
pic_lib = {}

for t,v in ipairs(ani_lib) do
	local ani,pic = lib.split_ani_and_pic(v)
	frames[t] = ani

	for k,v in ipairs(pic) do
		if not pic_lib[v.filename] then
			pic_lib[v.filename] = v
		end
	end
end
ani_lib = lib.export_ani(ani_lib)
local str1 = lib.dump(pic_lib)
local str2 = lib.dump(ani_lib)
local output = {}
foreach(pic_lib, function (d) table.insert(output, d) end)
table.insert(output, ani_lib)
local str3 = lib.dump(output)
local file = io.open("ani.lua","w")
file:write(str2)
file:close()
local file = io.open("pic.lua","w")
file:write("return {\n"..str3.."\n}")
file:close()