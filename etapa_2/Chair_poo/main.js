"use strict";

async function main() {
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  twgl.setAttributePrefix("a_");

  const vs = `#version 300 es
  in vec4 a_position;
  in vec3 a_normal;

  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;

  out vec3 v_normal;

  void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
    v_normal = mat3(u_world) * a_normal;
  }
  `;

  const fs = `#version 300 es
  precision highp float;

  in vec3 v_normal;

  uniform vec4 u_diffuse;
  uniform vec3 u_lightDirection;

  out vec4 outColor;

  void main () {
    vec3 normal = normalize(v_normal);
    float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
    outColor = vec4(u_diffuse.rgb * fakeLight, u_diffuse.a);
  }
  `;

  const meshProgramInfo = twgl.createProgramInfo(gl, [vs, fs]);

  try {
    const response = await fetch('chair.obj');
    const text = await response.text();
    const obj = parseOBJ(text);

    const parts = obj.geometries.map(({ data }) => {
      const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
      const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
      return {
        material: {
          u_diffuse: [Math.random(), Math.random(), Math.random(), 1],
        },
        bufferInfo,
        vao,
      };
    });

    const extents = getGeometriesExtents(obj.geometries);
    const range = m4.subtractVectors(extents.max, extents.min);
    const objOffset = m4.scaleVector(
      m4.addVectors(extents.min, m4.scaleVector(range, 0.5)),
      -1
    );

    const cameraTarget = [0, 0, 0];
    const radius = m4.length(range) * 1.5;
    const cameraPosition = m4.addVectors(cameraTarget, [0, 0, radius]);
    const zNear = radius / 100;
    const zFar = radius * 3;

    const chairTransforms = createChairTransforms(10, 7); // cria as cadeiras

    function render(time) {
      time *= 0.001;

      twgl.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.enable(gl.DEPTH_TEST);

      const fieldOfViewRadians = degToRad(90);
      const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
      const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

      const up = [0, 1, 0];
      const camera = m4.lookAt(cameraPosition, cameraTarget, up);
      const view = m4.inverse(camera);

      const sharedUniforms = {
        u_lightDirection: m4.normalize([-1, 3, 5]),
        u_view: view,
        u_projection: projection,
      };

      gl.useProgram(meshProgramInfo.program);
      twgl.setUniforms(meshProgramInfo, sharedUniforms);

      for (const { bufferInfo, vao, material } of parts) {
        for (const transform of chairTransforms) {
          let u_world = m4.identity();
          u_world = m4.translate(u_world, ...transform.translation);
          u_world = m4.yRotate(u_world, time);
          u_world = m4.scale(u_world, ...transform.scale);
          u_world = m4.translate(u_world, ...objOffset);

          gl.bindVertexArray(vao);
          twgl.setUniforms(meshProgramInfo, {
            u_world,
            u_diffuse: material.u_diffuse,
          });
          twgl.drawBufferInfo(gl, bufferInfo);
        }
      }

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  } catch (err) {
    console.error(err);
  }
}

main();
