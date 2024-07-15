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
  
function degToRad(deg) {
    return deg * Math.PI / 180;
  }
  

// plicar a perspectiva nas coordenadas dos objetos
function applyPerspective(position, cameraPosition, fov, near, far) {
  const aspect = window.innerWidth / window.innerHeight;
  const f = 1 / Math.tan((fov / 2) * (Math.PI / 180));
  const rangeInv = 1 / (near - far);
  
  return [
    (position[0] - cameraPosition[0]) * f / aspect,
    (position[1] - cameraPosition[1]) * f,
    (position[2] - cameraPosition[2]) * rangeInv
  ];
}

// Função para criar transformações para múltiplos moinhos de vento
function createWindmillTransforms(numWindmills, distanceBetweenWindmills, numRows, distanceBetweenRows) {
  const transforms = [];
  for (let row = 0; row < numRows; row++) {
    for (let i = 0; i < numWindmills; i++) {
      const zPosition = row * distanceBetweenRows; // Distância entre fileiras
      const xPosition = i * distanceBetweenWindmills; // Distribui em X
      const scale = [1, 1, 1]; // Escala padrão

      transforms.push({
        translation: [xPosition, 0, zPosition],
        scale: scale,
      });
    }
  }
  return transforms;
}


// Função para atualizar a posição da câmera
function updateCameraPosition(cameraPosition) {
  const cameraX = parseFloat(document.getElementById("cameraX").value);
  const cameraY = parseFloat(document.getElementById("cameraY").value);
  const cameraZ = parseFloat(document.getElementById("cameraZ").value);
  cameraPosition[0] = cameraX;
  cameraPosition[1] = cameraY;
  cameraPosition[2] = cameraZ;
}


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


