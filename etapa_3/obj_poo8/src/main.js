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
  const groundData = createGround(groundSize);
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

  // Função para pegar os valores dos controles HTML
  function getControlValues() {
    return {
      numWindmills: parseInt(document.getElementById("numWindmills").value),
      windmillsDistance: parseInt(document.getElementById("windmillsDistance").value),
      numSkeleton_Arrow: parseInt(document.getElementById("numSkeleton_Arrow").value),
      Skeleton_ArrowDistance: parseInt(document.getElementById("Skeleton_ArrowDistance").value),
      numSkeleton_Warrior: parseInt(document.getElementById("numSkeleton_Warrior").value),
      Skeleton_WarriorDistance: parseInt(document.getElementById("Skeleton_WarriorDistance").value),
      numTrees: parseInt(document.getElementById("numTrees").value),
      TreesDistance: parseInt(document.getElementById("TreesDistance").value),
      numPlanes: parseInt(document.getElementById("numPlanes").value),
      planesDistance: parseInt(document.getElementById("planesDistance").value),
      numZombie: parseInt(document.getElementById("numZombie").value),
      zombieDistance: parseInt(document.getElementById("zombieDistance").value),
    };
  }

  // Função para gerar um novo cenário
  async function generateNewScenario() {
    const {
      numWindmills, windmillsDistance,
      numSkeleton_Arrow, Skeleton_ArrowDistance,
      numSkeleton_Warrior, Skeleton_WarriorDistance,
      numTrees, TreesDistance,
      numPlanes, planesDistance,
      numZombie, zombieDistance
    } = getControlValues();

    // Configurações dos WindMills
    const windmillsTransforms = await generateUniquePositions(numWindmills, { x: 500, z: 500 }, windmillsDistance);
    const windmillsHref = 'assets/windmill.obj';

    // Configurações dos Skeleton_Arrow
    const Skeleton_ArrowTransforms = await generateUniquePositions(numSkeleton_Arrow, { x: 500, z: 500 }, Skeleton_ArrowDistance);
    const Skeleton_ArrowHref = 'assets/Skeleton_Arrow.obj';

    // Configurações dos Skeleton_Warrior
    const Skeleton_WarriorTransforms = await generateUniquePositions(numSkeleton_Warrior, { x: 500, z: 500 }, Skeleton_WarriorDistance);
    const Skeleton_WarriorHref = 'assets/Skeleton_Warrior.obj';

    // Configurações dos Trees
    const TreesTransforms = await generateUniquePositions(numTrees, { x: 500, z: 500 }, TreesDistance);
    const TreesHref = 'assets/tree08.obj';

    // Configurações dos Planes
    const planesTransforms = await generateUniquePositions(numPlanes, { x: 500, z: 500 }, planesDistance);
    const planesHref = 'assets/MountainRocks-0.obj';

    // Configurações dos Zombies
    const zombieTransforms = await generateUniquePositions(numZombie, { x: 500, z: 500 }, zombieDistance);
    const zombieHref = 'assets/Zed_1.obj';

    // Carregando modelos 3D no formato OBJ e criando os objetos necessários para renderizá-los usando TWGL (Tiny WebGL)
    const windmillsParts = await loadObj(gl, baseHref, meshProgramInfo, windmillsHref);
    const Skeleton_ArrowParts = await loadObj(gl, baseHref, meshProgramInfo, Skeleton_ArrowHref);
    const Skeleton_WarriorParts = await loadObj(gl, baseHref, meshProgramInfo, Skeleton_WarriorHref);
    const TreesParts = await loadObj(gl, baseHref, meshProgramInfo, TreesHref);
    const planesParts = await loadObj(gl, baseHref, meshProgramInfo, planesHref);
    const zombieParts = await loadObj(gl, baseHref, meshProgramInfo, zombieHref);

    // Renderização da Cena
    function render(time) {
      time *= 0.001; // Converte para segundos

      twgl.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.enable(gl.DEPTH_TEST);

      // Definir cor de fundo (preto neste caso)
      gl.clearColor(0.1, 0.1, 0.2, 1.0); // Azul escuro
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


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
      for (const { bufferInfo, vao, material } of windmillsParts) {
        gl.bindVertexArray(vao);

        for (const { x, z } of windmillsTransforms) {
          let u_world = m4.translate(m4.identity(), x, 0, z);
          u_world = m4.scale(u_world, 1, 1, 1); // Ajuste a escala se necessário

          twgl.setUniforms(meshProgramInfo, { u_world }, material);
          twgl.drawBufferInfo(gl, bufferInfo);
        }
      }
      
      // Render Skeleton_Arrow
      for (const { bufferInfo, vao, material } of Skeleton_ArrowParts) {
        gl.bindVertexArray(vao);

        for (const { x, z } of Skeleton_ArrowTransforms) {
          let u_world = m4.translate(m4.identity(), x, 0, z);
          u_world = m4.scale(u_world, 1, 1, 1); // Ajuste a escala se necessário

          twgl.setUniforms(meshProgramInfo, { u_world }, material);
          twgl.drawBufferInfo(gl, bufferInfo);
        }
      }

      // Render Skeleton_Warrior
      for (const { bufferInfo, vao, material } of Skeleton_WarriorParts) {
        gl.bindVertexArray(vao);

        for (const { x, z } of Skeleton_WarriorTransforms) {
          let u_world = m4.translate(m4.identity(), x, 0, z);
          u_world = m4.scale(u_world, 1, 1, 1); // Ajuste a escala se necessário

          twgl.setUniforms(meshProgramInfo, { u_world }, material);
          twgl.drawBufferInfo(gl, bufferInfo);
        }
      }

      // Render Trees
      for (const { bufferInfo, vao, material } of TreesParts) {
        gl.bindVertexArray(vao);

        for (const { x, z } of TreesTransforms) {
          let u_world = m4.translate(m4.identity(), x, 0, z);
          u_world = m4.scale(u_world, 1, 1, 1); // Ajuste a escala se necessário

          twgl.setUniforms(meshProgramInfo, { u_world }, material);
          twgl.drawBufferInfo(gl, bufferInfo);
        }
      }

      // Render Planes
      for (const { bufferInfo, vao, material } of planesParts) {
        gl.bindVertexArray(vao);

        for (const { x, z } of planesTransforms) {
          let u_world = m4.translate(m4.identity(), x, 0, z);
          u_world = m4.scale(u_world, 1, 1, 1); // Ajuste a escala se necessário

          twgl.setUniforms(meshProgramInfo, { u_world }, material);
          twgl.drawBufferInfo(gl, bufferInfo);
        }
      }

      // Render Zombies
      for (const { bufferInfo, vao, material } of zombieParts) {
        gl.bindVertexArray(vao);

        for (const { x, z } of zombieTransforms) {
          let u_world = m4.translate(m4.identity(), x, 0, z);
          u_world = m4.scale(u_world, 1, 1, 1); // Ajuste a escala se necessário

          twgl.setUniforms(meshProgramInfo, { u_world }, material);
          twgl.drawBufferInfo(gl, bufferInfo);
        }
      }

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }

  // Adiciona o evento ao botão para gerar novo cenário
  document.getElementById("generateButton").addEventListener("click", generateNewScenario);

  // Chama a geração de cenário inicial
  generateNewScenario();
}

main();
