'use strict';


async function main() {



  // Configuração do Canvas e WebGL2
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  twgl.setAttributePrefix("a_");





  // Vertex Shader (vs)
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
  // Fragment Shader (fs)
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
  // Compilação dos shaders e Configuração dos Shaders:
  const meshProgramInfo = twgl.createProgramInfo(gl, [vs, fs]);










  // Carregamento do OBJ e MTL:
  const objHref = 'assets/MountainRocks-0.obj';
  const response = await fetch(objHref);
  const text = await response.text();
  const obj = parseOBJ(text);
  const baseHref = new URL(objHref, window.location.href);
  

  // Criação do Ground - chão 
  const groundSize = 500;
  const resolution = 10;
  const groundData = createGround(groundSize, resolution);
  const groundBufferInfo = twgl.createBufferInfoFromArrays(gl, groundData);
  const groundVAO = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, groundBufferInfo);

  // Load ground texture
  const groundTexture = await twgl.createTexture(gl, { src: 'assets/gray_rocks_diff_4k.jpg', flipY: true });

  const extents = getGeometriesExtents(obj.geometries); // usa-se o tamanho do objeto p ser suficientemente grande
  const range = m4.subtractVectors(extents.max, extents.min); // minimos e max
















  // Configuração da Câmera
  const cameraTarget = [0, 0, 0];
  const radius = m4.length(range) * 1.5;
  const cameraPosition = m4.addVectors(cameraTarget, [0, 0, radius * 1.5]);
  const zNear = radius / 100;
  const zFar = radius * 100;

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  document.getElementById("cameraX").addEventListener("input", () => updateCameraPosition(cameraPosition));
  document.getElementById("cameraY").addEventListener("input", () => updateCameraPosition(cameraPosition));
  document.getElementById("cameraZ").addEventListener("input", () => updateCameraPosition(cameraPosition));
















  // Transformações dos Objetos
  // configuração do windmill

  //const numWindmills = 100; 
  //const distanceBetweenWindmills = 20; 
  //const numRows = 1; 
  //const windmillTransforms = createWindmillTransforms(numWindmills, distanceBetweenWindmills, numRows, 20);



  // Configurações dos banners
  const numWindmills = 10; // Número de banners
  const WindmillsDistance = 20; // Distância entre banners
  const WindmillsRowHeight = 5; // Altura entre fileiras
  const WindmillsTransforms = createTransforms(numWindmills, WindmillsDistance, WindmillsRowHeight);
  const WindmillsrHref = 'assets/windmill.obj';

  // configurações dos Montanhas
  const numPlanes = 10; // Número de banners
  const planesDistance = 40; // Distância entre banners
  const planesRowHeight = 35; 
  const planesTransforms = createTransforms(numPlanes, planesDistance, planesRowHeight);
  const planesHref = 'assets/MountainRocks-0.obj';

  // configuração doszombie
  const numZombie = 10; // Número de banners
  const zombieDistance = 40; // Distância entre banners
  const zombieRowHeight = 35; 
  const zombieTransforms = createTransforms(numZombie, zombieDistance, zombieRowHeight);
  const zombieHref = 'assets/Zed_1.obj';

  // carregando modelos 3D no formato OBJ e criando os objetos necessários para renderizá-los usando TWGL (Tiny WebGL)
  const WindmillsParts = await loadObj(gl, baseHref, meshProgramInfo, WindmillsrHref); // Passa meshProgramInfo
  const planesParts = await loadObj(gl, baseHref, meshProgramInfo, planesHref); // Passa meshProgramInfo
  const zombieParts = await loadObj(gl, baseHref, meshProgramInfo, zombieHref); // Passa meshProgramInfo
  
  
























  
  // Renderização da Cena
  function render(time) {
    time *= 0.001; // Converte para segundos

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
    for (const { bufferInfo, vao, material } of WindmillsParts) {
      gl.bindVertexArray(vao);

      for (const { translation, scale } of WindmillsTransforms) {
        let u_world = m4.translate(m4.identity(), ...translation);
        u_world = m4.scale(u_world, ...scale);

        twgl.setUniforms(meshProgramInfo, { u_world }, material);
        twgl.drawBufferInfo(gl, bufferInfo);
      }
    }

    // Render banners
    for (const { bufferInfo, vao, material } of planesParts) {
      gl.bindVertexArray(vao);

      for (const { translation, scale } of planesTransforms) {
        let u_world = m4.translate(m4.identity(), ...translation);
        u_world = m4.scale(u_world, ...scale);

        twgl.setUniforms(meshProgramInfo, { u_world }, material);
        twgl.drawBufferInfo(gl, bufferInfo);
      }
    }
    // Render banners
    for (const { bufferInfo, vao, material } of zombieParts) {
      gl.bindVertexArray(vao);

      for (const { translation, scale } of zombieTransforms) {
        let u_world = m4.translate(m4.identity(), ...translation);
        u_world = m4.scale(u_world, ...scale);

        twgl.setUniforms(meshProgramInfo, { u_world }, material);
        twgl.drawBufferInfo(gl, bufferInfo);
      }
    }
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
