"use strict";

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function createChairTransforms(numChairs, distanceBetweenChairs) {
  const chairTransforms = [];
  for (let i = 0; i < numChairs; i++) {
    const translation = [
      (i - (numChairs - 1) / 2) * distanceBetweenChairs,
      0,
      0,
    ];
    const scale = [1, 1, 1];
    chairTransforms.push({ translation, scale });
  }
  return chairTransforms;
}

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
