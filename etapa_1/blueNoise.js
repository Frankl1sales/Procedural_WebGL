function blueNoise(width, height, gridSpacing, innerCellSize, center, prng) { 
    const positions = new Set();
    const offset = [center[0] - (width - 1) * gridSpacing / 2, center[1] - (height - 1) * gridSpacing / 2];
    
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        let position = [i * gridSpacing + offset[0], j * gridSpacing + offset[1]];
        const center = [position[0], position[1]];
        
        position[0] += (prng() * 2 - 1) * innerCellSize / 2;
        position[1] += (prng() * 2 - 1) * innerCellSize / 2;
        
        positions.add([position, center]);
      }
    }
    
    return positions;
  }