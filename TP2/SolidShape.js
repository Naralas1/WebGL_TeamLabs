class SolidShape {
  constructor(vertices, indices, colors, normals, center, color, numberVertices, numberIndices) {
    this.vertices = vertices;
    this.indices = indices;
    this.colors = colors;
    this.normals = normals;

    this.verticesOffset = this.vertices.length;
    this.indicesOffset = this.indices.length;
    this.colorsOffset = this.colors.length;
    this.numberVertices = numberVertices;
    this.numberIndices = numberIndices;

    this.center = center;
    this.speed, this.positionComparaisonError;
    this.changeSpeed(1);
    this.lastPathPoint = 0;
    this.color = color;

    if (new.target === SolidShape)
      throw new TypeError("Cannot construct SolidShape instances directly.");
  }

  delete() {
    this.vertices.splice(this.verticesOffset, this.numberVertices*3);
    this.indices.splice(this.indicesOffset, this.numberIndices);
    this.colors.splice(this.colorsOffset, this.numberVertices*4);
    this.normals.splice(this.verticesOffset, this.numberVertices*3);
  }

  updateOffsets(deltaVertices, deltaIndices, deltaColors) {
    this.verticesOffset -= deltaVertices;
    this.indicesOffset -= deltaIndices;
    this.colorsOffset -= deltaColors;
    this.setIndices(true);
  }

  setVertices() { throw new Error("This method must be implemented by derived classes."); }
  setIndices() { throw new Error("This method must be implemented by derived classes."); }
  setColors() { throw new Error("This method must be implemented by derived classes."); }

  move(newCenter) {
    let oldCenter = this.center;
    this.center = newCenter;

    // compute translation vector
    let translatationVec = {x: newCenter.x - oldCenter.x,
                            y: newCenter.y - oldCenter.y,
                            z: newCenter.z - oldCenter.z};

    // translate each vertex (in place)
    for (let i=this.verticesOffset; i<this.verticesOffset+(this.numberVertices*3); i+=3) {
      this.vertices[i+0] += translatationVec.x;
      this.vertices[i+1] += translatationVec.y;
      this.vertices[i+2] += translatationVec.z;
    }
  }

  rotate(angle, xAxis=true, yAxis=true, zAxis=true) {
    // translate the solid to origin
    let oldCenter = this.center;
    this.move({x:0.0, y:0.0, z:0.0});

    // retrieve solid's vertices
    let oldVertices = this.vertices.slice(this.verticesOffset, this.verticesOffset+(this.numberVertices*3));
    let newVertices = [];

    // for each group of 3 values (forming a vertex)
    for (let i=0; i<oldVertices.length; i+=3) {
      // init vec4 vertex coords
      let vertex = vec4.fromValues(oldVertices[i+0], oldVertices[i+1], oldVertices[i+2], 1.0);

      // create an identity mat4
      let viewMatrix = mat4.create();
      mat4.identity(viewMatrix);

      // rotate the mat4 according to the given angle and axis
      if(xAxis) mat4.rotate(viewMatrix, viewMatrix, degToRad(angle), [1.0, 0.0, 0.0]);
      if(yAxis) mat4.rotate(viewMatrix, viewMatrix, degToRad(angle), [0.0, 1.0, 0.0]);
      if(zAxis) mat4.rotate(viewMatrix, viewMatrix, degToRad(angle), [0.0, 0.0, 1.0]);

      // multiply the vertex coordinates by the rotation matrix
      vec4.transformMat4(vertex, vertex, viewMatrix);

      // push the new coordinates
      newVertices.push(vertex[0], vertex[1], vertex[2]);
    }

    // replace the old vertices by the new ones and move the solid back to its original position
    this.vertices.splice.apply(this.vertices, [this.verticesOffset, this.numberVertices*3].concat(newVertices));
    this.move(oldCenter);

    this.setNormals(true);
  }

  changeSpeed(newSpeed) {
    this.speed = newSpeed;
    this.positionComparaisonError = 0.01 * this.speed;
  }

  setNormals(hasBeenInitialized=false) {
    let allNormals = [];
    for(let i=0; i<this.numberVertices/3; i++) { // for each triangle
      let points = [];
      for (let j=0; j<9; j+=3) // finds the 3 triangle's vertices
        points.push([this.vertices[this.verticesOffset + (i*9+j) + 0],  // vertex's x
                     this.vertices[this.verticesOffset + (i*9+j) + 1],  // vertex's y
                     this.vertices[this.verticesOffset + (i*9+j) + 2]   // vertex's z
                  ]);

      // finds triangle's normal and pushes it to the allNormals array once for each triangle's vertex
      let normalVec = this.findNormal(points[0], points[1], points[2]);
      allNormals.push(normalVec[0], normalVec[1], normalVec[2], // vertex1's normal
                      normalVec[0], normalVec[1], normalVec[2], // vertex2's normal
                      normalVec[0], normalVec[1], normalVec[2]  // vertex3's normal
                    );
    }
    
    // push normals components one by one in the shared normals array
    for (let i=0; i<allNormals.length; i++)
      this.normals.splice(this.verticesOffset + i, // index
                          hasBeenInitialized ? 1 : 0, // number of elements to remove before pushing
                          allNormals[i]
                        );
  }

  findNormal(v1, v2, v3) {
    let vNormal = [0.0, 0.0, 0.0];

    vNormal[0] = (v2[1] - v1[1]) * (v3[2] - v1[2])  -   (v2[2] - v1[2]) * (v3[1] - v1[1]);
    vNormal[1] = (v2[2] - v1[2]) * (v3[0] - v1[0])  -   (v2[0] - v1[0]) * (v3[2] - v1[2]);
    vNormal[2] = (v2[0] - v1[0]) * (v3[1] - v1[1])  -   (v2[1] - v1[1]) * (v3[0] - v1[0]);

    let norm = Math.sqrt(vNormal[0] * vNormal[0] + vNormal[1] * vNormal[1] + vNormal[2] * vNormal[2]);

    if(norm > 0.0) {
      vNormal[0] /= norm;
      vNormal[1] /= norm;
      vNormal[2] /= norm;

      return vNormal;
    } else {
      console.log("Null vector");
      return [0.0, 0.0, 0.0];
    }
  }
}
