// Função para obter as dimensões mínimas e máximas de um conjunto de posições
function getExtents(positions) {
  const min = positions.slice(0, 3);
  const max = positions.slice(0, 3);
  for (let i = 3; i < positions.length; i += 3) {
    for (let j = 0; j < 3; ++j) {
      const v = positions[i + j];
      min[j] = Math.min(v, min[j]);
      max[j] = Math.max(v, max[j]);
    }
  }
  return { min, max };
}

// Função para obter as dimensões mínimas e máximas de múltiplas geometrias
function getGeometriesExtents(geometries) {
  return geometries.reduce(({ min, max }, { data }) => {
    const minMax = getExtents(data.position);
    return {
      min: min.map((min, ndx) => Math.min(minMax.min[ndx], min)),
      max: max.map((max, ndx) => Math.max(minMax.max[ndx], max)),
    };
  }, {
    min: Array(3).fill(Number.POSITIVE_INFINITY),
    max: Array(3).fill(Number.NEGATIVE_INFINITY),
  });
}

// Função para converter graus em radianos
function degToRad(deg) {
  return deg * Math.PI / 180;
}


// Função para verificar se duas posições estão muito próximas
function arePositionsClose(pos1, pos2, minDistance) {
  const dx = pos1[0] - pos2[0];
  const dz = pos1[2] - pos2[2];
  return Math.sqrt(dx * dx + dz * dz) < minDistance;
}

// Função para criar transformações para múltiplos objetos, garantindo que não haja colisões
function createTransforms(numObjects, distanceBetweenObjects, rowHeight) {
  const transforms = [];
  const minDistance = 15; // Distância mínima para evitar colisões

  for (let row = 0; row < Math.ceil(numObjects / 5); row++) { // 5 objetos por linha
    for (let i = 0; i < Math.min(5, numObjects - row * 5); i++) { // Ajusta para o número total de objetos
      let zPosition = row * rowHeight;
      let xPosition = i * distanceBetweenObjects;
      let scale = [1, 1, 1];

      // Verifique se a posição está longe o suficiente das posições existentes
      let validPosition = true;
      for (const transform of transforms) {
        if (arePositionsClose([xPosition, 0, zPosition], transform.translation, minDistance)) {
          validPosition = false;
          break;
        }
      }

      // Se a posição for válida, adicione a transformação
      if (validPosition) {
        transforms.push({
          translation: [xPosition, 0, zPosition],
          scale: scale,
        });
      }
    }
  }
  return transforms;
}

// Função para carregar e criar objetos a partir de arquivos OBJ e MTL
async function loadObj(gl, baseHref, meshProgramInfo, objectHref) {
  const response = await fetch(objectHref);
  const text = await response.text();
  const obj = parseOBJ(text);
  
  const matTexts = await Promise.all(obj.materialLibs.map(async filename => {
    const matHref = new URL(filename, baseHref).href;
    const response = await fetch(matHref);
    return await response.text();
  }));
  const materials = parseMTL(matTexts.join('\n'));

  const textures = {
    defaultWhite: twgl.createTexture(gl, { src: [255, 255, 255, 255] }),
  };

  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith('Map'))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = new URL(filename, baseHref).href;
          texture = twgl.createTexture(gl, { src: textureHref, flipY: true });
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }

  const defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: textures.defaultWhite,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    shininess: 400,
    opacity: 1,
  };

  const objectParts = obj.geometries.map(({ material, data }) => {
    if (data.color) {
      if (data.position.length === data.color.length) {
        data.color = { numComponents: 3, data: data.color };
      }
    } else {
      data.color = { value: [1, 1, 1, 1] };
    }

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: {
        ...defaultMaterial,
        ...materials[material],
      },
      bufferInfo,
      vao,
    };
  });

  return objectParts;
}

// Função para gerar posições únicas usando amostragem de disco de Poisson
function generateUniquePositions(numPositions, area, minDistance) {
  const positions = [];
  const gridSize = minDistance / Math.sqrt(2); // Tamanho da célula da grade
  const grid = new Map(); // Para verificar rapidamente se uma célula da grade já foi usada
  const cells = Math.ceil(area.x / gridSize) * Math.ceil(area.z / gridSize);
  
  function getGridCell(x, z) {
    return Math.floor(x / gridSize) + ',' + Math.floor(z / gridSize);
  }

  function addPosition(x, z) {
    positions.push({ x, z });
    const cell = getGridCell(x, z);
    grid.set(cell, true);
  }

  // Função auxiliar para verificar se uma nova posição é válida
  function isValid(x, z) {
    const cell = getGridCell(x, z);
    if (grid.has(cell)) return false;

    const minDistSq = minDistance * minDistance;
    for (const pos of positions) {
      const dx = x - pos.x;
      const dz = z - pos.z;
      if (dx * dx + dz * dz < minDistSq) return false;
    }
    return true;
  }

  // Início da amostragem
  let x, z, tries = 0;
  while (positions.length < numPositions && tries < numPositions * 30) {
    x = Math.random() * area.x;
    z = Math.random() * area.z;
    if (isValid(x, z)) {
      addPosition(x, z);
    } else {
      tries++;
    }
  }

  return positions;
}


// Função para atualizar a posição da câmera com base nos valores dos sliders
function updateCameraPosition(cameraPosition) {
  const cameraX = parseFloat(document.getElementById("cameraX").value);
  const cameraY = parseFloat(document.getElementById("cameraY").value);
  const cameraZ = parseFloat(document.getElementById("cameraZ").value);
  cameraPosition[0] = cameraX;
  cameraPosition[1] = cameraY;
  cameraPosition[2] = cameraZ;
}

// Função para criar os dados do chão
function createGround(groundSize) {
  const groundData = {
    position: {
      numComponents: 3,
      data: [
        -groundSize, 0, -groundSize,
        groundSize, 0, -groundSize,
        -groundSize, 0, groundSize,
        groundSize, 0, groundSize,
      ],
    },
    normal: {
      numComponents: 3,
      data: [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
      ],
    },
    texcoord: {
      numComponents: 2,
      data: [
        0, 0,
        1, 0,
        0, 1,
        1, 1,
      ],
    },
    indices: {
      numComponents: 3,
      data: [
        0, 1, 2,
        2, 1, 3,
      ],
    },
  };

  return groundData;
}
