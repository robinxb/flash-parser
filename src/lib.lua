local table = table
local mt = {}
mt.__index = mt

function mt.dump(data, prefix)
	if prefix == nil or type(prefix) ~= "string" then
		prefix = ""
	end

	local str = ""
	for k,v in pairs(data) do
		if type(v) == "table" then
			str = str..prefix..(type(k)=="string" and k.." = " or "").."{\n"
			str = str..mt.dump(v, prefix.."    ")
			str = str..prefix.."},\n"
		else
			str = str..prefix..(type(k)=="string" and k.." = " or "")
			str = str ..(type(v) == "string" and "\""..v.."\"" or v)
			str = str ..",\n"
		end
	end
	return str
end

function mt.print_r(d)
	local print = print
	local tconcat = table.concat
	local tinsert = table.insert
	local srep = string.rep
	local type = type
	local pairs = pairs
	local tostring = tostring
	local next = next
	 
	function print_r(root)
		local cache = {  [root] = "." }
		local function _dump(t,space,name)
			local temp = {}
			for k,v in pairs(t) do
				local key = tostring(k)
				if cache[v] then
					tinsert(temp,"+" .. key .. " {" .. cache[v].."}")
				elseif type(v) == "table" then
					local new_key = name .. "." .. key
					cache[v] = new_key
					tinsert(temp,"+" .. key .. _dump(v,space .. (next(t,k) and "|" or " " ).. srep(" ",#key),new_key))
				else
					tinsert(temp,"+" .. key .. " [" .. tostring(v).."]")
				end
			end
			return tconcat(temp,"\n"..space)
		end
		print(_dump(root, "",""))
	end

	print_r(d)
end

function mt.build_lib(data)
	local res = {}
	mt.foreach(data, 
		function (d)
			if d.type == "picture" then
				res[d.id] = {type = d.type, filename = d.filename,  info = d[1]}
			elseif d.type == "animation" then
				res[d.id] = {type = d.type, name = d.tlname or d.lname}
				local frames = {}
				local com = d.component
				for t,v1 in ipairs(d[1]) do
					local this_frame = {}
					for _,v2 in ipairs(v1) do
						if type(v2) == "table" then
							table.insert(this_frame, {item = com[v2.index + 1].id, mat = v2.mat})
						else
							table.insert(this_frame, {item = com[v2 + 1].id, mat = {1024,0,0,1024,0,0}})
						end
					end
					frames[t] = this_frame
				end
				res[d.id]["frames"] = frames
			end
		end)
	return res
end

function mt.foreach(t,fn)
	for k,v in pairs(t) do
		fn(v)
	end
end

function mt.new_stack(copy_stack)
	local s = {}
	s.__index = s
	s.data = {}
	if type(copy_stack) == "table" then
		for k,v in ipairs(copy_stack.data) do s.data[k] = v end 
	end
	function s:push (d) table.insert(self.data, d) end
	function s:pop () local d = self.data[#self.data]  self.data[#self.data] = nil return d end
	function s:clean () self.data = {} end
	return s
end

function mt.export_mat_from_stack(stack)
	local m = {1024,0,0,1024,0,0}
	for k,v in ipairs(stack.data) do
		m = mt.matrix_mul(v, m)
	end
	return m
end

function mt.matrix_mul(m1, m2)
	local m = {}
	m[1] = (m1[1] * m2[1] + m1[2] * m2[3]) /1024;
	m[2] = (m1[1] * m2[2] + m1[2] * m2[4]) /1024;
	m[3] = (m1[3] * m2[1] + m1[4] * m2[3]) /1024;
	m[4] = (m1[3] * m2[2] + m1[4] * m2[4]) /1024;
	m[5] = (m1[5] * m2[1] + m1[6] * m2[3]) /1024 + m2[5];
	m[6] = (m1[5] * m2[2] + m1[6] * m2[4]) /1024 + m2[6];
	return m
end

function mt.build_single_frame_tree(node, frame, lib)
	local function build_tree(res, node, frame, stack)
		if node.type == "animation" then
			local thisframe = frame
			while thisframe > #node.frames do
				thisframe = thisframe - #node.frames
			end
			mt.foreach(node.frames[thisframe], 
				function (v) 
					assert(lib[v.item])
					if lib[v.item].type == "picture" then --到头了亲
						local new_stack = mt.new_stack(stack)
						new_stack:push(v.mat)
						local mat = mt.export_mat_from_stack(new_stack)
						res = build_tree(res, lib[v.item], frame, new_stack)
						table.insert(res, {filename = lib[v.item].filename, type = "animation", mat = mat})
					else
						local new_stack = mt.new_stack(stack)
						new_stack:push(v.mat)
						res = build_tree(res, lib[v.item], frame, new_stack)
					end
				end)
		elseif node.type == "picture" then
			table.insert(res, { filename = node.filename, type = "picture"})
			res[#res][1] = node.info
			-- print(node.src)
		end
		return res
	end
	local res = {}
	local stack = mt.new_stack()
	res = build_tree(res, node, frame, stack)
	return res
end

function mt.make_id(data)
	local function _make_pic_id(data, id, name2id)
		for k,v in pairs(data) do
			if type(v) == "table" then
				if v.type == "picture" then
					if not name2id[v.filename] then
						name2id[v.filename] = id
						id = id + 1
					end
					v.id = name2id[v.filename] 
				else
					id = _make_pic_id(v, id, name2id)
				end
			end
		end
		return id
	end 
	local function _make_ani_id(data, id, name2id)
		for k,v in pairs(data) do
			if type(v) == "table" then
				if v.type == "animation" then
					assert(name2id[v.filename])
					v.cid = name2id[v.filename]
					-- v.id = id
					id = id + 1
				else
					_make_ani_id(v, id, name2id)
				end
			end
		end
		return data
	end

	local name2id = {}
	id = _make_pic_id(data, 1, name2id)
	return _make_ani_id(data, id, name2id)
end

function mt.split_ani_and_pic(frame)
	local ani = {}
	local pic = {}
	for k,v in ipairs(frame) do
		if v.type == "animation" then
			table.insert(ani, v)
		elseif v.type == "picture" then
			table.insert(pic, v)
		end
	end
	return ani,pic
end

function mt.export_ani(ani)
	local total_frame = { component = {}, type = "animation" , id = 99, export = "main"}
	total_frame[1] = {}
	local function _is_in(l, t)
		for k,v in pairs(t) do 
			if l == v then return k end
		end
		return false
	end

	for t,v in ipairs(ani) do
		local this_frame = {}
		local this_frame_component = {}
		for _, c in ipairs(v) do
			local index
			if not _is_in(c.cid, total_frame.component) then
				assert(not _is_in(c.cid, this_frame_component))
				table.insert(this_frame_component, c.cid)
				table.insert(total_frame.component, c.cid)
				index = #total_frame.component - 1
			else
				if _is_in(c.cid, this_frame_component) then
					-- two same component in one frame
					table.insert(total_frame.component, c.cid)
					index = #total_frame.component - 1
				else
					index = _is_in(c.cid, total_frame.component) - 1
				end
			end
			table.insert(this_frame, {index = index, mat = c.mat})
		end
		total_frame[1][t] = this_frame
	end
	total_frame.frame_count = #total_frame[1]
	component_true = {}
	for k,v in ipairs(total_frame.component) do
		table.insert(component_true, {id = v})
	end
	total_frame.component = component_true
	return total_frame
end

return mt