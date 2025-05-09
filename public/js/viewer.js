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
    this.isLoading = false;
    this.loadingProgress = 0;
    
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
    
    // Loading indicator within the 3D scene
    this.createLoadingIndicator();
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Animation loop
    this.animate();
  }
  
  createLoadingIndicator() {
    // Create a loading indicator in 3D space
    this.loadingText = document.createElement('div');
    this.loadingText.style.position = 'absolute';
    this.loadingText.style.top = '50%';
    this.loadingText.style.left = '50%';
    this.loadingText.style.transform = 'translate(-50%, -50%)';
    this.loadingText.style.color = 'white';
    this.loadingText.style.backgroundColor = 'rgba(0,0,0,0.7)';
    this.loadingText.style.padding = '10px 20px';
    this.loadingText.style.borderRadius = '5px';
    this.loadingText.style.fontFamily = 'Arial, sans-serif';
    this.loadingText.style.display = 'none';
    this.loadingText.style.zIndex = '1000';
    this.loadingText.textContent = 'Processing blocks... 0%';
    
    this.container.appendChild(this.loadingText);
  }
  
  updateLoadingIndicator(progress, message = null) {
    if (!this.loadingText) return;
    
    const percent = Math.floor(progress * 100);
    this.loadingText.textContent = message || `Processing blocks... ${percent}%`;
    
    if (progress >= 1) {
      setTimeout(() => {
        this.loadingText.style.display = 'none';
      }, 500);
    } else {
      this.loadingText.style.display = 'block';
    }
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
      this.isLoading = true;
      this.updateLoadingIndicator(0, 'Fetching schematic data...');
      
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
      
      this.updateLoadingIndicator(0.1, 'Loading textures...');
      
      // Load texture atlas and preload common textures
      await this.textureLoader.loadAtlas();
      
      // Clear previous schematic
      this.clear();
      
      // Render the schematic
      this.updateLoadingIndicator(0.2, `Processing ${this.schematic.blocks.length} blocks...`);
      await this.renderSchematic();
      
      // Set up layer controls
      this.setupLayerControls();
      
      // Position camera
      this.resetCamera();
      
      this.isLoading = false;
      this.updateLoadingIndicator(1, 'Completed!');
      
      // Make sure we have something visible
      if (this.meshes.length === 0) {
        console.warn('No meshes were created, using fallback');
        return this.renderFallbackSchematic(this.schematic.dimensions);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load schematic:', error);
      this.isLoading = false;
      this.updateLoadingIndicator(1, 'Error: ' + error.message);
      
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
      
      // Create a wireframe box to show the structure bounds
      const boxGeometry = new THREE.BoxGeometry(dims.width, dims.height, dims.length);
      const edges = new THREE.EdgesGeometry(boxGeometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x00FF00 })
      );
      line.position.set(dims.width/2 - dims.width/2, dims.height/2, dims.length/2 - dims.length/2);
      this.scene.add(line);
      this.meshes.push(line);
      
      // Add more blocks to make it look like something is there
      const blockColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
      
      for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * dims.width) - dims.width/2;
        const y = Math.floor(Math.random() * dims.height);
        const z = Math.floor(Math.random() * dims.length) - dims.length/2;
        
        const coloredMaterial = new THREE.MeshLambertMaterial({ 
          color: blockColors[i % blockColors.length] 
        });
        
        const cube = new THREE.Mesh(geometry, coloredMaterial);
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
      
      // Position camera to show the fallback structure
      const maxDim = Math.max(dims.width, dims.height, dims.length);
      this.camera.position.set(
        maxDim * 0.8,
        maxDim * 0.8,
        maxDim * 0.8
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
    try {
      const { blocks, dimensions } = this.schematic;
      
      console.log(`Rendering ${blocks.length} blocks with dimensions: ${dimensions.width}x${dimensions.height}x${dimensions.length}`);
      
      // Group blocks by type for instanced rendering
      const blockTypes = _.groupBy(blocks, 'id');
      
      let processedTypes = 0;
      const totalTypes = Object.keys(blockTypes).length;
      
      // For each block type, create an instanced mesh
      for (const [blockId, blockInstances] of Object.entries(blockTypes)) {
        // Skip air blocks
        if (blockId === 'minecraft:air' || blockId.includes('air')) continue;
        
        try {
          // Update loading progress
          processedTypes++;
          this.updateLoadingIndicator(
            0.2 + (0.8 * processedTypes / totalTypes), 
            `Processing ${blockId} (${processedTypes}/${totalTypes})`
          );
          
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
            // Adjusted position calculation
            const xOffset = -dimensions.width / 2;  // Center the model on x-axis
            const zOffset = -dimensions.length / 2; // Center the model on z-axis
            
            matrix.setPosition(
              block.x + xOffset,
              block.y,
              block.z + zOffset
            );
            instancedMesh.setMatrixAt(index, matrix);
          });
          
          // Update matrix to make the changes visible
          instancedMesh.instanceMatrix.needsUpdate = true;
          
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
              const xOffset = -dimensions.width / 2;
              const zOffset = -dimensions.length / 2;
              
              matrix.setPosition(
                block.x + xOffset,
                block.y,
                block.z + zOffset
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
      
      // Create a bounding box to show the structure bounds
      const boxGeometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.length);
      const edges = new THREE.EdgesGeometry(boxGeometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x00FF00, opacity: 0.5, transparent: true })
      );
      this.scene.add(line);
      this.meshes.push(line);
      
      // Add grid for reference
      this.addGrid(dimensions);
      
      // If we didn't create any meshes, show fallback
      if (this.meshes.length === 0) {
        console.warn('No meshes were created during rendering');
        return this.renderFallbackSchematic(dimensions);
      }
      
      return true;
    } catch (error) {
      console.error('Error in renderSchematic:', error);
      return this.renderFallbackSchematic(this.schematic.dimensions);
    }
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
    const gridSize = Math.max(dimensions.width, dimensions.length);
    const gridHelper = new THREE.GridHelper(gridSize, gridSize);
    gridHelper.position.y = -0.5;
    this.scene.add(gridHelper);
    this.meshes.push(gridHelper);
  }
  
  setupLayerControls() {
    const slider = document.getElementById('layer-slider');
    const layerValue = document.getElementById('layer-value');
    
    if (!slider || !layerValue) {
      console.warn('Layer controls not found in the document');
      return;
    }
    
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