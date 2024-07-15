'use strict';

async function main() {
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  twgl.setAttributePrefix("a_");

  const vs = `#version 300 es
    in vec4 a_position;
    in vec3 a_normal;
    in vec2 a_texcoord;
    in vec4 a_color;

    uniform mat4 u_projection;
    uniform mat4 u_view;
    uniform mat4 u_world;
    uniform vec3 u_viewWorldPosition;

    out vec3 v_normal;
    out vec3 v_surfaceToView;
    out vec2 v_texcoord;
    out vec4 v_color;

    void main() {
      vec4 worldPosition = u_world * a_position;
      gl_Position = u_projection * u_view * worldPosition;
      v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
      v_normal = mat3(u_world) * a_normal;
      v_texcoord = a_texcoord;
      v_color = a_color;
    }
  `;

  const fs = `#version 300 es
    precision highp float;

    in vec3 v_normal;
    in vec3 v_surfaceToView;
    in vec2 v_texcoord;
    in vec4 v_color;

    uniform vec3 diffuse;
    uniform sampler2D diffuseMap;
    uniform vec3 ambient;
    uniform vec3 emissive;
    uniform vec3 specular;
    uniform float shininess;
    uniform float opacity;
    uniform vec3 u_lightDirection;
    uniform vec3 u_ambientLight;

    out vec4 outColor;

    void main () {
      vec3 normal = normalize(v_normal);
      vec3 surfaceToViewDirection = normalize(v_surfaceToView);
      vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

      float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
      float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);

      vec4 diffuseMapColor = texture(diffuseMap, v_texcoord);
      vec3 effectiveDiffuse = diffuse * diffuseMapColor.rgb * v_color.rgb;
      float effectiveOpacity = opacity * diffuseMapColor.a * v_color.a;

      outColor = vec4(
        emissive +
        ambient * u_ambientLight +
        effectiveDiffuse * fakeLight +
        specular * pow(specularLight, shininess),
        effectiveOpacity);
    }
  `;

  // Compile shaders and set up program
  const meshProgramInfo = twgl.createProgramInfo(gl, [vs, fs]);

  const objHref = 'assets/windmill.obj';  
  const response = await fetch(objHref);
  const text = await response.text();
  const obj = parseOBJ(text);
  const baseHref = new URL(objHref, window.location.href);
  
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

  const parts = obj.geometries.map(({ material, data }) => {
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


  // Create ground
  const groundSize = 500; // Size of the ground
  const resolution = 10; // Resolução para gerar o terreno
  const groundData = createGround(groundSize,resolution);
  const groundBufferInfo = twgl.createBufferInfoFromArrays(gl, groundData);
  const groundVAO = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, groundBufferInfo);

  // Carregar a textura do chão
  const groundTexture = await twgl.createTexture(gl, { src: 'assets/gray_rocks_diff_4k.jpg', flipY: true });

  const extents = getGeometriesExtents(obj.geometries);
  const range = m4.subtractVectors(extents.max, extents.min);

  const cameraTarget = [0, 0, 0];
  const radius = m4.length(range) * 1.5;
  const cameraPosition = m4.addVectors(cameraTarget, [0, 0, radius * 1.5]);
  const zNear = radius / 100;
  const zFar = radius * 100;

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  const numWindmills = 10; // 5 moinhos por fileira
  const distanceBetweenWindmills = 20; // Distance between windmills
  const numRows = 1; // Número de fileiras
  const windmillTransforms = createWindmillTransforms(numWindmills, distanceBetweenWindmills, numRows, 20);

  document.getElementById("cameraX").addEventListener("input", () => updateCameraPosition(cameraPosition));
  document.getElementById("cameraY").addEventListener("input", () => updateCameraPosition(cameraPosition));
  document.getElementById("cameraZ").addEventListener("input", () => updateCameraPosition(cameraPosition));
  
  function render(time) {
    time *= 0.001; // Convert to seconds

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
      u_viewWorldPosition: cameraPosition,
    };

    gl.useProgram(meshProgramInfo.program);
    twgl.setUniforms(meshProgramInfo, sharedUniforms);

    // Render the ground
    let u_world = m4.translate(m4.identity(), 0, 0, 0);
    twgl.setUniforms(meshProgramInfo, { u_world, diffuseMap: groundTexture });
    gl.bindVertexArray(groundVAO);
    twgl.drawBufferInfo(gl, groundBufferInfo);

    // Render windmills
    for (const { bufferInfo, vao, material } of parts) {
      gl.bindVertexArray(vao);

      for (const { translation, scale } of windmillTransforms) {
        let u_world = m4.translate(m4.identity(), ...translation);
        u_world = m4.scale(u_world, ...scale);
        u_world = m4.multiply(u_world, m4.yRotation(time));

        twgl.setUniforms(meshProgramInfo, { u_world }, material);
        twgl.drawBufferInfo(gl, bufferInfo);
      }
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
