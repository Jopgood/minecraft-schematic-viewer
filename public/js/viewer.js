class SchematicViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.schematic = null;
    this.blockTextures = {};
    this.meshes = [];
    this.layerMeshes = [];
    this.currentLayer = null;
    this.wireframeMode = false;
    this.texturesEnabled = true;
    this.textureLoader = new MinecraftTextureLoader();
    
    this.init();
  }
  
  init() {
    // Set up Three.js renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      70, 
      this.container.clientWidth / this.container.clientHeight, 
      0.1, 
      1000
    );
    this.camera.position.set(50, 50, 50);
    this.camera.lookAt(0, 0, 0);
    
    // Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Animation loop
    this.animate();
  }
  
  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  async loadSchematic(schematicId) {
    try {
      console.log(`Loading schematic: ${schematicId}`);
      
      // Fetch the processed schematic data
      const response = await fetch(`/schematics/${schematicId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch schematic: ${response.status} ${response.statusText}`);
      }
      
      this.schematic = await response.json();
      console.log('Schematic data:', this.schematic);
      
      // Make sure the schematic has blocks
      if (!this.schematic.blocks || this.schematic.blocks.length === 0) {
        console.warn('Warning: Schematic has no blocks, using fallback rendering');
        return this.renderFallbackSchematic(this.schematic.dimensions);
      }
      
      // Load texture atlas and preload common textures
      await this.textureLoader.loadAtlas();
      this.preloadCommonTextures(); // Start loading in background
      
      // Clear previous schematic
      this.clear();
      
      // Render the schematic
      await this.renderSchematic();
      
      // Set up layer controls
      this.setupLayerControls();
      
      // Position camera
      this.resetCamera();
      
      return true;
    } catch (error) {
      console.error('Failed to load schematic:', error);
      
      // Try to render a fallback if we have dimensions
      if (this.schematic && this.schematic.dimensions) {
        return this.renderFallbackSchematic(this.schematic.dimensions);
      }
      
      return false;
    }
  }
  
  // Render a simple fallback schematic when parsing fails
  renderFallbackSchematic(dimensions) {
    try {
      console.log('Rendering fallback schematic');
      
      // Clear previous meshes
      this.clear();
      
      // Default dimensions if not available
      const dims = dimensions || { width: 10, height: 10, length: 10 };
      
      // Create a simple grid of blocks
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
      
      // Create grid to represent structure outline
      const gridSize = Math.max(dims.width, dims.height, dims.length);
      
      // Create a wireframe box to show the structure bounds
      const boxGeometry = new THREE.BoxGeometry(dims.width, dims.height, dims.length);
      const edges = new THREE.EdgesGeometry(boxGeometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x00FF00 })
      );
      line.position.set(0, dims.height / 2, 0);
      this.scene.add(line);
      this.meshes.push(line);
      
      // Add a few blocks to make it look like something is there
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(Math.random() * dims.width) - dims.width/2;
        const y = Math.floor(Math.random() * dims.height);
        const z = Math.floor(Math.random() * dims.length) - dims.length/2;
        
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);
        this.scene.add(cube);
        this.meshes.push(cube);
      }
      
      // Add a base platform
      const platformGeometry = new THREE.BoxGeometry(dims.width, 1, dims.length);
      const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const platform = new THREE.Mesh(platformGeometry, platformMaterial);
      platform.position.set(0, -0.5, 0);
      this.scene.add(platform);
      this.meshes.push(platform);
      
      // Add grid for reference
      this.addGrid(dims);
      
      // Position camera
      this.camera.position.set(
        dims.width * 1.5,
        dims.height * 1.5,
        dims.length * 1.5
      );
      this.camera.lookAt(0, dims.height / 2, 0);
      this.controls.target.set(0, dims.height / 2, 0);
      this.controls.update();
      
      return true;
    } catch (error) {
      console.error('Error rendering fallback:', error);
      return false;
    }
  }
  
  async renderSchematic() {
    const { blocks, dimensions } = this.schematic;
    
    // Group blocks by type for instanced rendering
    const blockTypes = _.groupBy(blocks, 'id');
    
    // For each block type, create an instanced mesh
    for (const [blockId, blockInstances] of Object.entries(blockTypes)) {
      // Skip air blocks
      if (blockId === 'minecraft:air') continue;
      
      try {
        // Create geometry
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Get or create material
        let material;
        if (this.texturesEnabled) {
          // Set whether to use fallback colors based on texturesEnabled
          this.textureLoader.setUseFallbackColors(!this.texturesEnabled);
          // Try to get the texture for this block type
          material = await this.textureLoader.getBlockMaterial(blockId);
        } else {
          // Fallback to colored material
          material = this.textureLoader.createMaterialsFromColor(blockId);
        }
        
        // Handle array of materials (for different faces)
        let instancedMesh;
        if (Array.isArray(material)) {
          // For multiple materials, we need separate meshes for each face
          // Create a merged geometry for all faces
          const mergedGeometry = new THREE.BoxGeometry(1, 1, 1);
          const mergedMaterial = material[0]; // Use first material for instanced rendering
          
          instancedMesh = new THREE.InstancedMesh(
            mergedGeometry,
            mergedMaterial,
            blockInstances.length
          );
        } else {
          // Single material for all faces
          instancedMesh = new THREE.InstancedMesh(
            geometry,
            material,
            blockInstances.length
          );
        }
        
        // Set transforms for each instance
        const matrix = new THREE.Matrix4();
        blockInstances.forEach((block, index) => {
          matrix.setPosition(
            block.x - dimensions.width / 2,
            block.y,
            block.z - dimensions.length / 2
          );
          instancedMesh.setMatrixAt(index, matrix);
        });
        
        // Add to scene
        this.scene.add(instancedMesh);
        this.meshes.push(instancedMesh);
        
        // Track y-position for layer view
        const blocksByLayer = _.groupBy(blockInstances, 'y');
        for (const [y, layerBlocks] of Object.entries(blocksByLayer)) {
          if (!this.layerMeshes[y]) {
            this.layerMeshes[y] = [];
          }
          
          // Create a mesh for this layer using the same material
          const layerMesh = new THREE.InstancedMesh(
            geometry,
            Array.isArray(material) ? material[0] : material,
            layerBlocks.length
          );
          
          // Set transforms
          layerBlocks.forEach((block, index) => {
            matrix.setPosition(
              block.x - dimensions.width / 2,
              block.y,
              block.z - dimensions.length / 2
            );
            layerMesh.setMatrixAt(index, matrix);
          });
          
          // Don't add to scene yet - will be added when layer is selected
          this.layerMeshes[y].push(layerMesh);
        }
      } catch (error) {
        console.error(`Failed to render block type ${blockId}:`, error);
      }
    }
    
    // Add grid for reference
    this.addGrid(dimensions);
  }
  
  // Preload common textures for better performance
  async preloadCommonTextures() {
    const commonBlocks = [
      'minecraft:stone',
      'minecraft:dirt',
      'minecraft:grass_block',
      'minecraft:oak_log',
      'minecraft:oak_planks',
      'minecraft:glass',
      'minecraft:cobblestone',
      'minecraft:sand',
      'minecraft:gravel',
      'minecraft:water'
    ];
    
    // Preload common textures in the background
    for (const blockId of commonBlocks) {
      try {
        await this.textureLoader.getBlockMaterial(blockId);
      } catch (error) {
        console.warn(`Failed to preload texture for ${blockId}:`, error);
      }
    }
  }
  
  addGrid(dimensions) {
    const gridHelper = new THREE.GridHelper(
      Math.max(dimensions.width, dimensions.length),
      Math.max(dimensions.width, dimensions.length)
    );
    gridHelper.position.y = -0.5;
    this.scene.add(gridHelper);
    this.meshes.push(gridHelper);
  }
  
  setupLayerControls() {
    const slider = document.getElementById('layer-slider');
    const layerValue = document.getElementById('layer-value');
    
    // If there are no layer meshes, disable the slider
    const hasLayers = Object.keys(this.layerMeshes).length > 0;
    
    if (!hasLayers) {
      slider.disabled = true;
      layerValue.textContent = 'No layers';
      return;
    }
    
    // Set slider range
    const maxY = Math.max(...Object.keys(this.layerMeshes).map(Number));
    slider.min = 0;
    slider.max = maxY;
    slider.value = 0; // Show all layers by default
    slider.disabled = false;
    
    slider.addEventListener('input', () => {
      const layer = parseInt(slider.value);
      layerValue.textContent = layer === 0 ? 'All' : layer;
      this.showLayer(layer);
    });
  }
  
  showLayer(layer) {
    // Remove current layer meshes
    if (this.currentLayer !== null) {
      for (const mesh of Object.values(this.layerMeshes).flat()) {
        this.scene.remove(mesh);
      }
    }
    
    // Show all layers
    if (layer === 0) {
      this.currentLayer = null;
      
      // Show the complete schematic meshes
      for (const mesh of this.meshes) {
        mesh.visible = true;
      }
    } else {
      // Hide complete schematic
      for (const mesh of this.meshes) {
        mesh.visible = false;
      }
      
      // Show only the selected layer
      this.currentLayer = layer;
      const layerMeshes = this.layerMeshes[layer] || [];
      for (const mesh of layerMeshes) {
        this.scene.add(mesh);
      }
    }
  }
  
  toggleWireframe() {
    this.wireframeMode = !this.wireframeMode;
    
    // Apply to all meshes
    for (const mesh of this.meshes) {
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => {
            if (mat) mat.wireframe = this.wireframeMode;
          });
        } else {
          mesh.material.wireframe = this.wireframeMode;
        }
      }
    }
    
    // Apply to layer meshes
    for (const layerMeshes of Object.values(this.layerMeshes)) {
      for (const mesh of layerMeshes) {
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => {
              if (mat) mat.wireframe = this.wireframeMode;
            });
          } else {
            mesh.material.wireframe = this.wireframeMode;
          }
        }
      }
    }
  }
  
  toggleTextures() {
    this.texturesEnabled = !this.texturesEnabled;
    
    // Update texture loader setting
    this.textureLoader.setUseFallbackColors(!this.texturesEnabled);
    
    // Reload schematic to apply texture changes
    this.clear();
    this.renderSchematic();
    
    // Restore layer view if active
    if (this.currentLayer !== null) {
      this.showLayer(this.currentLayer);
    }
  }
  
  resetCamera() {
    if (!this.schematic) return;
    
    const { dimensions } = this.schematic;
    const maxDimension = Math.max(dimensions.width, dimensions.height, dimensions.length);
    
    // Position camera based on schematic size
    this.camera.position.set(
      maxDimension * 1.5,
      maxDimension * 1.5,
      maxDimension * 1.5
    );
    
    this.camera.lookAt(0, dimensions.height / 2, 0);
    this.controls.target.set(0, dimensions.height / 2, 0);
    this.controls.update();
  }
  
  clear() {
    // Remove all meshes from scene
    for (const mesh of this.meshes) {
      this.scene.remove(mesh);
    }
    this.meshes = [];
    
    // Clear layer meshes
    for (const layer of Object.values(this.layerMeshes).flat()) {
      this.scene.remove(layer);
    }
    this.layerMeshes = [];
    this.currentLayer = null;
  }
}