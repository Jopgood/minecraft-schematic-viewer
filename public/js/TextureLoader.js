// TextureLoader.js - Helper class for loading and managing Minecraft textures

class MinecraftTextureLoader {
  constructor() {
    this.textureCache = new Map();
    this.atlasTexture = null;
    this.atlasMapping = null;
    this.textureLoader = new THREE.TextureLoader();
    this.materialCache = new Map();
    this.useFallbackColors = false;
  }
  
  // Load individual texture for a block
  async loadTexture(blockId) {
    // Transform block ID to texture path
    // e.g., 'minecraft:stone' -> 'textures/blocks/stone.png'
    const textureName = this.getTextureNameFromBlockId(blockId);
    const texturePath = `textures/blocks/${textureName}.png`;
    
    // Check if already loaded
    if (this.textureCache.has(texturePath)) {
      return this.textureCache.get(texturePath);
    }
    
    // Try to load texture
    try {
      return new Promise((resolve, reject) => {
        this.textureLoader.load(
          texturePath,
          (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.magFilter = THREE.NearestFilter; // Pixelated look
            texture.minFilter = THREE.NearestFilter;
            
            this.textureCache.set(texturePath, texture);
            resolve(texture);
          },
          undefined, // onProgress callback (not used)
          (error) => {
            console.warn(`Failed to load texture ${texturePath}:`, error);
            
            // Fallback to color
            const fallbackTexture = this.getFallbackTexture(blockId);
            this.textureCache.set(texturePath, fallbackTexture);
            resolve(fallbackTexture);
          }
        );
      });
    } catch (error) {
      console.warn(`Error loading texture ${texturePath}:`, error);
      return this.getFallbackTexture(blockId);
    }
  }
  
  // Generate a fallback texture based on block color
  getFallbackTexture(blockId) {
    const blockColor = this.getBlockColor(blockId);
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    // Fill with the base color
    ctx.fillStyle = `#${blockColor.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 16, 16);
    
    // Add some noise/texture to make it look less flat
    const darkerColor = this.darkenColor(blockColor, 0.8);
    ctx.fillStyle = `#${darkerColor.toString(16).padStart(6, '0')}`;
    
    // Draw noise pattern
    for (let y = 0; y < 16; y += 4) {
      for (let x = (y % 8) ? 0 : 4; x < 16; x += 8) {
        ctx.fillRect(x, y, 4, 4);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    
    return texture;
  }
  
  // Helper to darken a color
  darkenColor(color, factor) {
    const r = Math.floor(((color >> 16) & 255) * factor);
    const g = Math.floor(((color >> 8) & 255) * factor);
    const b = Math.floor((color & 255) * factor);
    return (r << 16) | (g << 8) | b;
  }
  
  // Extract texture name from block ID
  getTextureNameFromBlockId(blockId) {
    // Handle special blocks with different textures
    const specialCases = {
      'minecraft:grass_block': 'grass_block_side',
      'minecraft:oak_log': 'oak_log_side',
      'minecraft:birch_log': 'birch_log_side',
      'minecraft:spruce_log': 'spruce_log_side',
      'minecraft:jungle_log': 'jungle_log_side',
      'minecraft:acacia_log': 'acacia_log_side',
      'minecraft:dark_oak_log': 'dark_oak_log_side',
      'minecraft:oak_leaves': 'oak_leaves',
      // Add more special cases as needed
    };
    
    if (specialCases[blockId]) {
      return specialCases[blockId];
    }
    
    // Remove minecraft: prefix and handle generic cases
    return blockId.replace('minecraft:', '');
  }
  
  // Load all six faces for a cube (different textures for each face)
  async loadBlockTextures(blockId) {
    const blockConfig = this.getBlockTextureConfig(blockId);
    const materials = [];
    
    // Default to all sides using the same texture
    const defaultTextureName = this.getTextureNameFromBlockId(blockId);
    
    for (const face of ['right', 'left', 'top', 'bottom', 'front', 'back']) {
      // Get the specific texture for this face, or use default
      const textureName = (blockConfig && blockConfig[face]) || defaultTextureName;
      const texturePath = `textures/blocks/${textureName}.png`;
      
      // Try to load the texture
      try {
        const texture = await this.loadTexture(blockId);
        
        const material = new THREE.MeshLambertMaterial({
          map: texture,
          transparent: this.isTransparent(blockId),
          alphaTest: 0.5 // Helps with transparency rendering
        });
        
        materials.push(material);
      } catch (error) {
        console.warn(`Error loading texture for ${blockId} (${face}):`, error);
        // Fallback to colored material
        materials.push(this.createMaterialsFromColor(blockId));
      }
    }
    
    return materials;
  }
  
  // Return block-specific texture configurations (for blocks with different textures on different faces)
  getBlockTextureConfig(blockId) {
    const textureConfigs = {
      'minecraft:grass_block': {
        top: 'grass_block_top',
        bottom: 'dirt',
        front: 'grass_block_side',
        back: 'grass_block_side',
        left: 'grass_block_side',
        right: 'grass_block_side'
      },
      'minecraft:oak_log': {
        top: 'oak_log_top',
        bottom: 'oak_log_top',
        front: 'oak_log_side',
        back: 'oak_log_side',
        left: 'oak_log_side',
        right: 'oak_log_side'
      },
      // Add more blocks with multiple textures
    };
    
    return textureConfigs[blockId];
  }
  
  // Check if a block should be rendered with transparency
  isTransparent(blockId) {
    const transparentBlocks = [
      'minecraft:glass',
      'minecraft:water',
      'minecraft:oak_leaves',
      'minecraft:birch_leaves',
      'minecraft:spruce_leaves',
      'minecraft:jungle_leaves',
      'minecraft:acacia_leaves',
      'minecraft:dark_oak_leaves',
      'minecraft:ice',
      // Add more transparent blocks
    ];
    
    return transparentBlocks.includes(blockId);
  }
  
  // Load atlas texture and mapping if available
  async loadAtlas() {
    try {
      // First try to load the atlas configuration
      const response = await fetch('textures/atlas-mapping.json');
      
      if (response.ok) {
        // We have an atlas configuration
        const mapping = await response.json();
        this.atlasMapping = mapping;
        
        // Now load the atlas texture
        this.atlasTexture = await new Promise((resolve, reject) => {
          this.textureLoader.load(
            'textures/atlas.png',
            (texture) => {
              texture.magFilter = THREE.NearestFilter;
              texture.minFilter = THREE.NearestFilter;
              resolve(texture);
            },
            undefined,
            (error) => reject(error)
          );
        });
        
        console.log('Loaded texture atlas');
        return true;
      } else {
        // No atlas available, fall back to individual textures or colors
        console.warn('Texture atlas not found, using individual textures');
        this.createMockAtlasMapping(); // For fallback colors
        return false;
      }
    } catch (error) {
      console.warn('Failed to load texture atlas:', error);
      this.createMockAtlasMapping(); // For fallback colors
      return false;
    }
  }
  
  // Creates a simple color-based mock mapping for testing and fallbacks
  createMockAtlasMapping() {
    this.atlasMapping = {
      'minecraft:stone': { color: 0x888888 },
      'minecraft:dirt': { color: 0x8B4513 },
      'minecraft:grass_block': { color: 0x567D46 },
      'minecraft:oak_log': { color: 0x6D5032 },
      'minecraft:oak_planks': { color: 0xC8AD7F },
      'minecraft:sand': { color: 0xE9DAB2 },
      'minecraft:gravel': { color: 0x777777 },
      'minecraft:glass': { color: 0xC0F0F0, transparent: true },
      'minecraft:cobblestone': { color: 0x666666 },
      'minecraft:bedrock': { color: 0x444444 },
      'minecraft:water': { color: 0x3D50CD, transparent: true },
      'minecraft:lava': { color: 0xFF5400 },
      'minecraft:coal_ore': { color: 0x777777 },
      'minecraft:iron_ore': { color: 0xDDCCB5 },
      'minecraft:gold_ore': { color: 0xFCEE4B },
      'minecraft:diamond_ore': { color: 0x5DECF5 },
      'minecraft:redstone_ore': { color: 0xFF0000 },
      'minecraft:oak_leaves': { color: 0x2E502E, transparent: true },
      'minecraft:birch_leaves': { color: 0x3A5F3A, transparent: true },
      'minecraft:spruce_leaves': { color: 0x2E4C2E, transparent: true },
      'minecraft:jungle_leaves': { color: 0x225F22, transparent: true },
      // Add more block types as needed
    };
  }
  
  // Get a material for a block, either from texture or color
  async getBlockMaterial(blockId) {
    // Check if we already have this material cached
    if (this.materialCache.has(blockId)) {
      return this.materialCache.get(blockId);
    }
    
    let material;
    
    if (this.useFallbackColors) {
      // Use fallback colors
      material = this.createMaterialsFromColor(blockId);
    } else {
      try {
        // Try to load textures first
        if (this.atlasTexture && this.atlasMapping && this.atlasMapping[blockId]?.uv) {
          // We have an atlas with this block, use it
          material = this.createMaterialFromAtlas(blockId);
        } else {
          // No atlas or block not in atlas, try individual textures
          material = await this.loadBlockTextures(blockId);
        }
      } catch (error) {
        console.warn(`Error creating material for ${blockId}:`, error);
        // Fallback to colors
        material = this.createMaterialsFromColor(blockId);
      }
    }
    
    // Cache the material
    this.materialCache.set(blockId, material);
    return material;
  }
  
  // Create a material using the texture atlas
  createMaterialFromAtlas(blockId) {
    const blockUV = this.atlasMapping[blockId]?.uv;
    
    if (!blockUV || !this.atlasTexture) {
      return this.createMaterialsFromColor(blockId);
    }
    
    const materials = [];
    const isTransparent = this.isTransparent(blockId);
    
    // For each face (in order: right, left, top, bottom, front, back)
    for (const face of ['right', 'left', 'top', 'bottom', 'front', 'back']) {
      const faceUV = blockUV[face] || blockUV.all;
      
      if (faceUV) {
        // Clone the atlas texture for this face
        const texture = this.atlasTexture.clone();
        texture.needsUpdate = true;
        
        // Set UV coordinates for this face on the texture
        texture.offset.set(faceUV.x, faceUV.y);
        texture.repeat.set(faceUV.w, faceUV.h);
        
        const material = new THREE.MeshLambertMaterial({
          map: texture,
          transparent: isTransparent,
          alphaTest: 0.5
        });
        
        materials.push(material);
      } else {
        // Fallback if specific face not found
        materials.push(this.createMaterialsFromColor(blockId));
      }
    }
    
    return materials;
  }
  
  // Create materials for a block based on its color (fallback)
  createMaterialsFromColor(blockId) {
    const mapping = this.atlasMapping[blockId] || { color: 0xAAAAAA };
    
    const material = new THREE.MeshLambertMaterial({ 
      color: mapping.color,
      transparent: mapping.transparent || false,
      opacity: mapping.transparent ? 0.8 : 1
    });
    
    return material;
  }
  
  // Get a color for a block type
  getBlockColor(blockId) {
    // Check if we have this block in our mapping
    if (this.atlasMapping && this.atlasMapping[blockId]) {
      return this.atlasMapping[blockId].color;
    }
    
    // Handle wood/plank variants
    if (blockId.includes('_planks')) {
      return this.atlasMapping['minecraft:oak_planks']?.color || 0xC8AD7F;
    }
    
    // Handle log variants
    if (blockId.includes('_log')) {
      return this.atlasMapping['minecraft:oak_log']?.color || 0x6D5032;
    }
    
    // Handle leaf variants
    if (blockId.includes('_leaves')) {
      return this.atlasMapping['minecraft:oak_leaves']?.color || 0x2E502E;
    }
    
    // Default color
    return 0xAAAAAA;
  }
  
  // Toggle between textured and colored rendering
  setUseFallbackColors(useColors) {
    if (this.useFallbackColors !== useColors) {
      this.useFallbackColors = useColors;
      this.materialCache.clear(); // Clear cache when switching modes
    }
  }
}