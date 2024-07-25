# Projeto de Geração Procedural de Cenário 3D com WebGL

## Descrição

Este projeto visa criar um cenário 3D procedural utilizando WebGL e a biblioteca TWGL para renderização. O cenário inclui diversos tipos de objetos 3D distribuídos de maneira automática e configurável, com suporte a alterações dinâmicas durante a execução.
![Exemplo de Imagem](https://github.com/Frankl1sales/procedural_generation/blob/main/etapa_3/obj_poo8/imageSample.png)
## Principais Pontos

- **Geração Procedural**: O projeto utiliza algoritmos para gerar e distribuir objetos 3D em um cenário. Esses objetos incluem Windmills, Skeletons, Trees, Planes e Zombies.
- **Controle Dinâmico**: Controles interativos permitem ao usuário ajustar a posição da câmera e o número e a distância dos diferentes tipos de objetos no cenário.
- **Shaders**: Utiliza shaders em GLSL para definir a aparência dos objetos e a iluminação do cenário.
- **Interatividade**: Um botão permite gerar um novo cenário com base nas configurações atuais dos controles.

## Princípios Abordados

- **Programação Orientada a Objetos**: Implementação de classes e objetos para gerenciar e renderizar diferentes tipos de elementos no cenário.
- **Geração Procedural**: Algoritmos para a criação automática e distribuição dos objetos 3D no cenário.
- **Shaders e WebGL**: Uso de shaders para controle da aparência dos objetos e manipulação de gráficos 3D utilizando a API WebGL.
- **Interatividade e Controles**: Desenvolvimento de controles de interface do usuário para ajustes em tempo real do cenário.

## Funcionalidades

- **Controle da Câmera**: Ajuste da posição da câmera em três dimensões (X, Y, Z) usando controles deslizantes.
- **Configuração de Objetos**:
  - Número e distância dos Windmills, Skeletons, Trees, Planes e Zombies podem ser configurados.
- **Geração de Novo Cenário**: Um botão permite atualizar o cenário com base nas configurações atuais.

## Requisitos

- **Web Browser**: O projeto é executado em um navegador moderno que suporte WebGL2.
- **Arquivos de Modelo**: Modelos 3D no formato OBJ são usados para representar os diferentes tipos de objetos no cenário.

## Instruções de Uso

### Executando o Servidor Python

Para executar o projeto no navegador, você pode usar um servidor HTTP simples. O Python oferece uma maneira fácil de fazer isso com o módulo `http.server`. Siga as instruções abaixo para iniciar o servidor:

1. **Abra o Terminal**: Navegue até o diretório que contém os arquivos do seu projeto (por exemplo, o diretório onde está o arquivo `index.html`).

2. **Execute o Servidor**: Utilize o seguinte comando para iniciar o servidor HTTP:

   ```sh
   python3 -m http.server
   ```

   Por padrão, o servidor será iniciado na porta 8000. Se você precisar usar uma porta diferente, adicione o número da porta ao final do comando:

   ```sh
   python3 -m http.server 8080
   ```

3. **Acesse o Projeto**: Abra o navegador e vá para `http://localhost:8000` (ou `http://localhost:8080` se você usou a porta 8080).

4. **Interaja com o Cenário**: Use os controles no navegador para ajustar a configuração do cenário e gerar novos cenários conforme desejado.

## Contribuições

Contribuições são bem-vindas! Para contribuir, faça um fork do repositório e envie um pull request com suas melhorias ou correções.

## Licença

Este projeto é licenciado sob a [MIT License](LICENSE.md).
