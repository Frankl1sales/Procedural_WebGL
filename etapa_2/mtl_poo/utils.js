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
  

// Função para criar transformações para múltiplos moinhos de vento
function createWindmillTransforms(numWindmills, distanceBetweenWindmills, geometries) {
  const windmillTransforms = [];
  const extents = getGeometriesExtents(geometries);
  const range = m4.subtractVectors(extents.max, extents.min);
  const objOffset = m4.scaleVector(
    m4.addVectors(extents.min, m4.scaleVector(range, 0.5)),
    -1
  );

  for (let i = 0; i < numWindmills; i++) {
    const translation = [
      (i - (numWindmills - 1) / 2) * distanceBetweenWindmills,
      0,
      0,
    ];
    const scale = [1, 1, 1]; // Pode ser ajustado conforme necessário
    windmillTransforms.push({ translation: m4.addVectors(translation, objOffset), scale });
  }

  return windmillTransforms;
}