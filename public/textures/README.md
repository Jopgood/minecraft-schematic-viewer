# Minecraft Textures

This directory is where block textures should be placed for the Minecraft Schematic Viewer.

## Directory Structure

```
public/textures/
├── atlas.png               # Optional texture atlas (all textures in one image)
├── atlas-mapping.json      # Mapping file for atlas coordinates
└── blocks/                 # Individual block textures
    ├── stone.png
    ├── dirt.png
    ├── grass_block_top.png
    ├── grass_block_side.png
    ├── oak_log_top.png
    ├── oak_log_side.png
    └── ... other textures ...
```

## Adding Textures

### Individual Textures

1. Place individual block textures in the `blocks/` directory
2. Follow the Minecraft naming convention:
   - Remove the `minecraft:` prefix (e.g., `minecraft:stone` → `stone.png`)
   - For blocks with multiple textures, use suffixes:
     - `grass_block_top.png`
     - `grass_block_side.png`
     - `oak_log_top.png`
     - `oak_log_side.png`

### Texture Atlas (Optional)

For better performance with many blocks, you can use a texture atlas:

1. Create a single image (`atlas.png`) containing all block textures arranged in a grid
2. Update the `atlas-mapping.json` file to specify the UV coordinates for each texture
3. The `atlas-mapping.json` format should match the sample provided

## Legal Considerations

Minecraft textures are copyrighted by Mojang/Microsoft. For a proper implementation:

1. **Extract from Minecraft**: For development, you can extract textures from your own Minecraft installation
2. **Resource Pack API**: Create functionality for users to upload their own resource packs
3. **Alternative Textures**: Create or use freely available textures that are inspired by but not identical to Minecraft

## Recommended Basic Textures

For initial development, add these common textures:

- stone.png
- dirt.png
- grass_block_top.png
- grass_block_side.png
- cobblestone.png
- oak_log_top.png
- oak_log_side.png
- oak_planks.png
- sand.png
- gravel.png

## Transparency Support

For transparent blocks like glass or leaves, use PNG files with alpha transparency.
