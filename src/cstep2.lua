local require = require
local lib = require "lib"
local foreach = lib.foreach

string.split = function(s, p)
    local rt= {}
    string.gsub(s, '[^'..p..']+', function(w) table.insert(rt, w) end )
    return rt
end

assert(arg[1])
local dir = arg[2]
local bUseAction = arg[3]=="enable" and true or false
local filelist = require(arg[1])

local f = {}
for k,v in pairs(filelist) do
	local t = v:split("_")
	if not bUseAction or ((not t[1]) or not t[2]) then
		f[v] = {require(dir..v)}
	else
		assert(t[1], "file name error", v)
		assert(t[2], "file name error", v)
		local base_name, ani_name = t[1], t[2]
		if f[base_name] == nil then
			f[base_name] = {}
		end

		f[base_name][ani_name] = require(dir..v)
	end
end

local function mark_component_name(t)
	local this_lib = {}
	for k,v in pairs(t) do
		if v.type == "picture" then
			this_lib[v.id] = v
		end
	end

	for k,v in pairs(t) do
		if v.type == "animation" then
			for k1,v1 in pairs(v.component) do 
				v1.name = this_lib[v1.id].filename
			end
		end
	end
end

local function gen_pub_lib(t, pub_lib, id_table)
	for k,v in pairs(t) do
		if v.type == "picture" then
			if pub_lib[v.filename] == nil then
				pub_lib[v.filename] = v
				local new_id = #id_table + 1
				v.id = new_id
				id_table[v.id] = true
			else
				t[k] = nil
			end
		end
	end
end

local function rebuild_component_id(pub_lib, t)
	for k,v in pairs(t) do
		if v.type == "animation" then
			for k1,v1 in pairs(v.component) do 
				v1.id = pub_lib[v1.name].id
			end
			v.id = -1
		end
	end
end

local function rebuild_animation_id(name ,t, id_table)
	for k,v in pairs(t) do
		if v.type == "animation" then
			assert(v.export == "main")
			v.export = name
			local new_id = #id_table + 1
			v.id = new_id
			id_table[v.id] = true
		end
	end
end

local function combine_one_ani_files(base_name, ani_files, id_table, pub_lib)
	for ani_name, t in pairs(ani_files) do
		mark_component_name(t)
	end
	for ani_name, t in pairs(ani_files) do
		gen_pub_lib(t, pub_lib, id_table)
	end
	for ani_name, t in pairs(ani_files) do
		rebuild_component_id(pub_lib, t)
	end
	for ani_name, t in pairs(ani_files) do
		if type(ani_name) == "string" then
			rebuild_animation_id(base_name.."_"..ani_name ,t, id_table)
		else
			rebuild_animation_id(base_name ,t, id_table)
		end
	end

	if bUseAction then
		local now_id = #id_table + 1
		local combine = { type = "animation", id = now_id, export = base_name, component = {}}
		local export_table = {}
		for ani_name, t in pairs(ani_files) do
			for k,v in pairs(t) do
				if v.export then
					table.insert(export_table, {ac_name = ani_name, c_id = v.id, frame_count = v.frame_count})
				end
			end
		end
		assert(#export_table >= 1)
		for index, v in pairs(export_table) do
			combine.component[index] = {id = v.c_id,}
			if not combine[index] then
				combine[index] = {}
			end
			combine[index].action = v.ac_name
			for i = 0, v.frame_count do
				table.insert(combine[index], {{index = index-1},})
			end
		end
		
		local file_count = 0
		for ani_name, t in pairs(ani_files) do
			file_count = file_count + 1
			if file_count > 1 then
				id_table[now_id] = true
				return combine
			end
		end
	end
end

local output = {}
local id_table = {}
local pub_lib = {}
for k,v in pairs(f) do
	local this_combine = combine_one_ani_files(k, v, id_table, pub_lib)

	for k2,v2 in pairs(v) do
		for k3,v3 in pairs(v2) do
			table.insert(output,v3)
		end
	end
	if this_combine then table.insert(output, this_combine) end
end

local file = io.open("final_output.lua","w")
file:write("return {\n"..lib.final_dump(output).."\n}")
file:close()

