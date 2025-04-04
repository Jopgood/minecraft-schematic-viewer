# Texture Implementation for Minecraft Schematic Viewer

This document explains how textures have been implemented in the Minecraft Schematic Viewer.

## Overview of Changes

The following files have been modified or added to support Minecraft textures:

1. **TextureLoader.js**: Enhanced with full texture support, including individual textures and texture atlas
2. **viewer.js**: Updated to work with the new texture system, with async texture loading
3. **Directory Structure**: Added `public/textures/blocks/` for storing block textures
4. **Sample Files**: Added sample `atlas-mapping.json` for texture atlas support

## Implementation Details

### 1. TextureLoader.js

The `TextureLoader.js` now includes:

- Loading of individual textures from the `textures/blocks/` directory
- Support for texture atlas (a single image containing multiple textures)
- Fallback to colored blocks when textures aren't available
- Support for transparent blocks (glass, leaves, water)
- Different textures for different faces of blocks (e.g., grass blocks, logs)
- Caching to improve performance

### 2. viewer.js

The `viewer.js` has been updated to:

- Support async texture loading
- Use the enhanced TextureLoader
- Handle blocks with different textures on different faces
- Preload common textures for better performance
- Maintain compatibility with the existing layer view and wireframe toggles

### 3. Directory Structure

The following directory structure has been set up:

```
public/textures/
├── atlas.png               # Optional texture atlas
├── atlas-mapping.json      # Mapping for atlas coordinates
└── blocks/                 # Individual block textures
    ├── stone.png
    ├── dirt.png
    ├── ... other textures ...
```

## How to Add Textures

### Option 1: Individual Textures (Simplest)

1. Place PNG textures in the `public/textures/blocks/` directory
2. Name them according to the block ID without the `minecraft:` prefix
   - Example: `stone.png` for `minecraft:stone`
3. For blocks with different textures per face, use suffixes:
   - `grass_block_top.png`
   - `grass_block_side.png`
   - `oak_log_top.png`
   - `oak_log_side.png`

### Option 2: Texture Atlas (More Efficient)

1. Create a single PNG image with all textures arranged in a grid
2. Save it as `public/textures/atlas.png`
3. Update the `atlas-mapping.json` file with UV coordinates for each texture

## How the System Works

1. When a schematic is loaded, the system first tries to load the texture atlas
2. If no atlas is found, it falls back to individual textures
3. If no textures are found, it uses colored blocks as before
4. The "Toggle Textures" button allows switching between textured and colored modes

## Texture File Format

- PNG format is recommended for all textures
- Recommended size: 16x16 or 32x32 pixels
- For transparent blocks (glass, leaves), use PNG with alpha transparency

## Performance Considerations

The implementation includes several optimizations:

- Texture caching to avoid reloading the same textures
- Material instancing to minimize GPU load
- Preloading of common textures
- Optional texture atlas support for better performance

## Legal Considerations

Minecraft textures are copyrighted by Mojang/Microsoft. The current implementation:

1. Supports user-supplied textures
2. Gracefully falls back to colored blocks when textures aren't available
3. Doesn't include any copyrighted textures

For development purposes, you can extract textures from your own Minecraft installation or use freely available alternatives.

## Future Enhancements

Possible future improvements include:

1. Support for user-uploaded resource packs
2. Animated textures (water, lava)
3. Advanced block models beyond simple cubes
4. Ambient occlusion and better lighting
5. Face culling (not rendering faces between adjacent blocks)

## Troubleshooting

If textures aren't working:

1. Check the browser console for error messages
2. Verify that textures are in the correct directory with the correct names
3. Try toggling textures off and on
4. Ensure texture files are properly formatted (PNG, appropriate size)
