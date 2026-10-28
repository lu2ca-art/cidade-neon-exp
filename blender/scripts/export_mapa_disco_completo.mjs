import net from 'node:net';
import { montarMundoDisco } from '../../app/linha/estrada/mundoDisco.ts';

const host = '127.0.0.1';
const port = 9876;
const root = '/Users/lu2ca/cidade-neon-exp-disco';
const scenePath = `${root}/blender/cenas/cidade-neon-mapa-disco-full.blend`;
const renderPath = `${root}/blender/exports/cidade-neon-mapa-disco-full.png`;
const world = montarMundoDisco();

const roads = world.vias
  .map((via, index) => ({
    id: via.id,
    color: via.cor ?? '#ff6a35',
    kind: world.info[index]?.parte ?? 'via',
    track: world.info[index]?.pista ?? -1,
    points: Array.from({ length: via.n }, (_, point) => [
      Number(via.px[point].toFixed(2)),
      Number(via.py[point].toFixed(2)),
      Number(via.pz[point].toFixed(2)),
    ]),
  }))
  .filter((_, index) => !world.vias[index].rede || world.vias[index].rede.ida);

const landmarkSpecs = [
  ['lugar:bar', 'BAR', '#ff6a35'],
  ['lugar:casa-drewboy', 'CASA DREWBOY', '#ff3fb0'],
  ['lugar:balada', 'BALADA', '#ff3fb0'],
  ['lugar:escondido', 'CASA ELLA', '#2fe8ff'],
  ['lugar:topo', 'TERRACO', '#5dffa0'],
  ['lugar:casa-shows', 'CASA SHOWS', '#ffc857'],
  ['lugar:beco', 'BECO', '#8a8f9e'],
  ['lugar:posto', 'POSTO', '#b38cff'],
  ['lugar:plataforma', 'LINHA 9', '#e6f0ff'],
  ['lugar:casa-dbee', 'CASA D-BEE', '#3d7bff'],
  ['pagina:oficina', 'OFICINA', '#ffc857'],
  ['pagina:fliperama', 'FLIPERAMA', '#ff3fb0'],
  ['pagina:galeria', 'GALERIA', '#2fe8ff'],
  ['pagina:ginasio', 'GINASIO', '#ffc857'],
  ['pagina:shows', 'SHOWS', '#ff6a35'],
  ['parque', 'PARQUE', '#ff3fb0'],
];

const landmarks = landmarkSpecs.flatMap(([key, name, color]) => {
  const location = world.onde(key);
  if (!location) return [];

  const via = world.vias[location.via];
  const index = Math.max(0, Math.min(via.n - 1, Math.round(location.u / 2)));
  const side = location.lado ?? 1;
  return [{
    name,
    color,
    x: Number((via.px[index] - via.tz[index] * side * 24).toFixed(2)),
    y: Number(via.py[index].toFixed(2)),
    z: Number((via.pz[index] + via.tx[index] * side * 24).toFixed(2)),
    heading: Number(Math.atan2(via.tz[index], via.tx[index]).toFixed(4)),
  }];
});

const data = {
  roads,
  towers: world.torres.map((tower) => ({
    x: Number(tower.x.toFixed(2)),
    z: Number(tower.z.toFixed(2)),
    radius: tower.raio,
    core: tower.nucleo,
    top: Number(tower.topo.toFixed(2)),
    floors: tower.andares,
  })),
  landmarks,
};

const blenderCode = String.raw`
import bpy, json, math, random
from mathutils import Vector
D = json.loads(__DATA__)
OUT = __SCENE_PATH__
PNG = __RENDER_PATH__

for cname in ("CN_TorreCentral_Blockout_v01", "CN_MapaDisco_Completo_v01"):
    old = bpy.data.collections.get(cname)
    if old:
        tree = []
        def collect_tree(collection):
            tree.append(collection)
            for child in collection.children:
                collect_tree(child)
        collect_tree(old)
        for collection in reversed(tree):
            for obj in list(collection.objects):
                bpy.data.objects.remove(obj, do_unlink=True)
            bpy.data.collections.remove(collection)

root = bpy.data.collections.new("CN_MapaDisco_Completo_v01")
bpy.context.scene.collection.children.link(root)
def collection(name):
    result = bpy.data.collections.new(name)
    root.children.link(result)
    return result

roads_col = collection("01 | 9 faixas e espirais - geometria fiel")
towers_col = collection("02 | torres e andares")
city_col = collection("03 | cidade neon - massa de estudo")
poi_col = collection("04 | lugares e missoes")
terrain_col = collection("00 | deserto e horizonte")

def material(name, color, metal=0.0, rough=0.6, emission=None, strength=0.0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = rough
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1)
        shader.inputs["Emission Strength"].default_value = strength
    return result

asphalt = material("CN | asfalto grafite", (0.11, 0.12, 0.16), 0.18, 0.88, (0.035, 0.045, 0.075), 0.65)
linewhite = material("CN | pintura branca", (0.76, 0.82, 0.9), 0.05, 0.65, (0.35, 0.46, 0.65), 0.22)
coremat = material("CN | vidro obsidiana", (0.018, 0.022, 0.045), 0.68, 0.22)
metalmat = material("CN | estrutura grafite", (0.1, 0.12, 0.17), 0.82, 0.28)
groundmat = material("CN | deserto da cidade", (0.055, 0.065, 0.09), 0.02, 0.96, (0.025, 0.032, 0.055), 0.55)
neon_materials = {}
def neon(hex_color):
    if hex_color not in neon_materials:
        rgb = tuple(int(hex_color[i:i+2], 16) / 255 for i in (1, 3, 5))
        neon_materials[hex_color] = material("CN | neon " + hex_color, rgb, 0.22, 0.3, rgb, 2.2)
    return neon_materials[hex_color]

def create_mesh(name, vertices, faces, target, materials, material_indices=None):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    for item in materials:
        mesh.materials.append(item)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    if material_indices:
        for polygon, index in zip(mesh.polygons, material_indices):
            polygon.material_index = index
    return obj

# Game samples each route every 2 m. Blender Z is the game's vertical axis.
road_offsets = [-8.4, -8.12, -4.48, -4.22, -0.13, 0.13, 4.22, 4.48, 8.12, 8.4]
for road_index, road in enumerate(D["roads"]):
    points = road["points"]
    count = len(points)
    if count < 2:
        continue
    vertices = []
    for i, point in enumerate(points):
        before = points[max(0, i - 1)]
        after = points[min(count - 1, i + 1)]
        dx, dy = after[0] - before[0], after[2] - before[2]
        length = math.hypot(dx, dy) or 1
        tx, ty = dx / length, dy / length
        for offset in road_offsets:
            vertices.append((point[0] - ty * offset, point[2] + tx * offset, point[1] + 0.08))
    faces, material_indices = [], []
    edge_material = neon(road["color"])
    for i in range(count - 1):
        for band in range(9):
            a, b = i * 10 + band, (i + 1) * 10 + band
            faces.append((a, b, b + 1, a + 1))
            if band in (0, 8):
                material_indices.append(2)
            elif band in (2, 6) and i % 14 < 7:
                material_indices.append(1)
            elif band == 4:
                material_indices.append(1)
            else:
                material_indices.append(0)
    obj = create_mesh("Via %02d | %s" % (road_index + 1, road["id"]), vertices, faces, roads_col, [asphalt, linewhite, edge_material], material_indices)
    obj["faixa_id"] = road["id"]
    obj["faixa_cor"] = road["color"]
    obj["jogo_tipo"] = road["kind"]
    if road["track"] >= 0:
        obj["faixa_indice"] = road["track"]

# The full map canvas extends beyond the 1.9 km playable bounds.
grid_count, terrain_size = 100, 2700.0
vertices, faces = [], []
for j in range(grid_count + 1):
    y = -terrain_size / 2 + terrain_size * j / grid_count
    for i in range(grid_count + 1):
        x = -terrain_size / 2 + terrain_size * i / grid_count
        z = -12.7 + math.sin(x * 0.004) * math.cos(y * 0.005) * 2.5
        vertices.append((x, y, z))
for j in range(grid_count):
    for i in range(grid_count):
        a = j * (grid_count + 1) + i
        faces.append((a, a + 1, a + grid_count + 2, a + grid_count + 1))
create_mesh("Deserto | terreno completo", vertices, faces, terrain_col, [groundmat])

# Runtime tower locations and floor heights come from the game generator.
for index, tower in enumerate(D["towers"]):
    x, y, z = tower["x"], tower["z"], -12.0
    radius = tower["core"]
    height = max(tower["top"] + 22, z + 28) - z
    bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=radius * 1.08, radius2=radius * 0.82, depth=height, location=(x, z, y + height / 2))
    body = bpy.context.object
    body.name = "Torre %d | nucleo" % (index + 1)
    body.data.materials.append(coremat)
    towers_col.objects.link(body)
    for current in list(body.users_collection):
        if current != towers_col:
            current.objects.unlink(body)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=tower["radius"], depth=2.6, location=(x, z, -10.8))
    deck = bpy.context.object
    deck.name = "Torre %d | plataforma" % (index + 1)
    deck.data.materials.append(metalmat)
    towers_col.objects.link(deck)
    for current in list(deck.users_collection):
        if current != towers_col:
            current.objects.unlink(deck)
    for floor_index, floor in enumerate(tower["floors"]):
        bpy.ops.mesh.primitive_torus_add(major_segments=64, minor_segments=8, major_radius=radius + 0.85, minor_radius=0.62, location=(x, z, floor["y"]))
        ring = bpy.context.object
        ring.name = "Torre %d | anel %02d | %s" % (index + 1, floor_index + 1, floor["nome"])
        ring.data.materials.append(neon(floor["cor"]))
        towers_col.objects.link(ring)
        for current in list(ring.users_collection):
            if current != towers_col:
                current.objects.unlink(ring)
    bpy.ops.mesh.primitive_torus_add(major_segments=96, minor_segments=12, major_radius=radius * 0.72, minor_radius=1.0, location=(x, z, y + height + 1))
    crown = bpy.context.object
    crown.name = "Torre %d | coroa" % (index + 1)
    crown.data.materials.append(neon("#ff6a35"))
    towers_col.objects.link(crown)
    for current in list(crown.users_collection):
        if current != towers_col:
            current.objects.unlink(crown)

# A deterministic massing pass provides city scale without changing route clearances.
cell, road_grid = 42.0, {}
for road in D["roads"]:
    for i in range(0, len(road["points"]), 8):
        point = road["points"][i]
        key = (math.floor(point[0] / cell), math.floor(point[2] / cell))
        road_grid.setdefault(key, []).append((point[0], point[2]))
def near_road(x, y):
    cx, cy = math.floor(x / cell), math.floor(y / cell)
    for ax in range(cx - 1, cx + 2):
        for ay in range(cy - 1, cy + 2):
            for rx, ry in road_grid.get((ax, ay), []):
                if (rx - x) ** 2 + (ry - y) ** 2 < 34 ** 2:
                    return True
    return False

line_names = ["Nectar", "Copo Americano", "DopaminA", "Sexta-Feira", "Sabe Ontem?", "Ojala", "Swav", "CHUVA", "Rollercoaster"]
line_colors = ["#b38cff", "#ffc857", "#5dffa0", "#ff3fb0", "#ff6a35", "#3d7bff", "#ff3fb0", "#2fe8ff", "#ff3fb0"]
rng = random.Random(7)
def add_box(vertices, faces, indices, center_x, center_y, center_z, width, depth, height, angle, mat_index):
    cosine, sine = math.cos(angle), math.sin(angle)
    start = len(vertices)
    for z in (-height / 2, height / 2):
        for y in (-depth / 2, depth / 2):
            for x in (-width / 2, width / 2):
                vertices.append((center_x + x * cosine - y * sine, center_y + x * sine + y * cosine, center_z + z))
    faces.extend([(start, start + 1, start + 3, start + 2), (start + 4, start + 6, start + 7, start + 5), (start, start + 4, start + 5, start + 1), (start + 2, start + 3, start + 7, start + 6), (start, start + 2, start + 6, start + 4), (start + 1, start + 5, start + 7, start + 3)])
    indices.extend([mat_index] * 6)

for track in range(9):
    road = next((item for item in D["roads"] if item["id"] == "disco:%d:ida" % track), None)
    if not road:
        continue
    track_material = material("CN | torre urbana " + line_names[track], (0.18, 0.24, 0.38), 0.36, 0.48, (0.08, 0.14, 0.28), 1.1)
    window_material = neon(line_colors[track])
    vertices, faces, indices = [], [], []
    points = road["points"]
    for i in range(35, len(points) - 35, 13):
        point = points[i]
        before, after = points[max(0, i - 2)], points[min(len(points) - 1, i + 2)]
        dx, dy = after[0] - before[0], after[2] - before[2]
        length = math.hypot(dx, dy) or 1
        tx, ty = dx / length, dy / length
        side = -1 if (i // 13) % 2 else 1
        offset = 8.4 + 8 + rng.random() * 52
        bx, by = point[0] - ty * side * offset, point[2] + tx * side * offset
        if any(math.hypot(bx - tower["x"], by - tower["z"]) < tower["radius"] + 45 for tower in D["towers"]):
            continue
        if near_road(bx, by):
            continue
        width, depth = 8 + rng.random() * 13, 8 + rng.random() * 15
        height = 16 + rng.random() ** 1.45 * 145
        angle, base = math.atan2(ty, tx), -12.5
        add_box(vertices, faces, indices, bx, by, base + height / 2, width, depth, height, angle, 0)
        bands = min(7, max(2, int(height / 19)))
        for band in range(bands):
            z = base + 4 + (height - 7) * (band + 0.5) / bands
            add_box(vertices, faces, indices, bx, by + math.cos(angle) * depth * 0.505, z, width * 0.62, 0.16, 0.42, angle, 1)
        add_box(vertices, faces, indices, bx, by, base + height + 0.15, width * 0.78, depth * 0.78, 0.3, angle, 2)
    if faces:
        city = create_mesh("Bairro | " + line_names[track], vertices, faces, city_col, [track_material, window_material, metalmat], indices)
        city["visualizacao"] = "massa urbana de estudo; geometria de jogo permanece procedural"

# Landmark markers are located from the runtime route table.
for landmark in D["landmarks"]:
    x, y, z = landmark["x"], landmark["z"], landmark["y"]
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 7))
    obj = bpy.context.object
    obj.name = "Marco | " + landmark["name"]
    obj.dimensions = (18, 13, 14)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler[2] = landmark["heading"]
    obj.data.materials.append(coremat)
    poi_col.objects.link(obj)
    for current in list(obj.users_collection):
        if current != poi_col:
            current.objects.unlink(obj)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 14.2))
    sign = bpy.context.object
    sign.name = "Marco | luz " + landmark["name"]
    sign.dimensions = (11, 0.35, 1.1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    sign.rotation_euler[2] = landmark["heading"]
    sign.data.materials.append(neon(landmark["color"]))
    poi_col.objects.link(sign)
    for current in list(sign.users_collection):
        if current != poi_col:
            current.objects.unlink(sign)

# Production overview camera and lighting; this is a static Blender presentation.
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 1600, 1200, 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = PNG
scene.view_settings.view_transform = "AgX"
world = bpy.data.worlds.new("CN | noite azul") if not bpy.data.worlds else bpy.data.worlds[0]
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.016, 0.035, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.32
for obj in list(scene.objects):
    if obj.type in {"CAMERA", "LIGHT"}:
        bpy.data.objects.remove(obj, do_unlink=True)
camera_data = bpy.data.cameras.new("CN | camera mapa completo")
camera = bpy.data.objects.new("CN | camera mapa completo", camera_data)
root.objects.link(camera)
camera.location = (0, -1650, 3700)
target = Vector((0, 0, 30))
camera.rotation_euler = (target - Vector(camera.location)).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 2600
camera_data.clip_end = 6000
scene.camera = camera
for name, color, power, size, location in [
    ("CN | sol suave", (1, 0.78, 0.57), 2100000, 1500, (-600, -850, 1600)),
    ("CN | recorte frio", (0.26, 0.42, 1.0), 850000, 1100, (850, 650, 1100)),
]:
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy, light_data.color, light_data.shape, light_data.size = power, color, "DISK", size
    light = bpy.data.objects.new(name, light_data)
    root.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, 0, 0)) - Vector(location)).to_track_quat("-Z", "Y").to_euler()

bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("saved=" + OUT)
print("render=" + PNG)
print("roads=" + str(len(D["roads"])) + " towers=" + str(len(D["towers"])) + " landmarks=" + str(len(D["landmarks"])))
print("urban_meshes=" + str(len(city_col.objects)))
`;

const python = blenderCode
  .replace('__DATA__', JSON.stringify(JSON.stringify(data)))
  .replace('__SCENE_PATH__', JSON.stringify(scenePath))
  .replace('__RENDER_PATH__', JSON.stringify(renderPath));

const socket = net.createConnection({ host, port }, () => {
  socket.write(JSON.stringify({ type: 'execute_code', params: { code: python } }));
});

let buffer = '';
socket.setTimeout(120_000);
socket.on('data', (chunk) => {
  buffer += chunk.toString();
  try {
    const response = JSON.parse(buffer);
    console.log(JSON.stringify(response));
    socket.end();
  } catch {
    // The add-on sends one JSON document after Blender finishes the operation.
  }
});
socket.on('timeout', () => {
  console.error('Blender MCP timed out:', buffer.slice(-1000));
  socket.destroy();
  process.exitCode = 1;
});
socket.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});