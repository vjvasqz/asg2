class Cube{
    constructor(){
      this.type = 'cube';
      //this.position = [0.0, 0.0, 0.0];
      this.color = [1.0,1.0,1.0,1.0];
      //this.size = 5.0;
      //this.segments = 10;
      this.matrix = new Matrix4();
    }
  
    render(){
      //var xy = this.position;
      var rgba = this.color;
      //var size = this.size;
  
      // Pass the color of a point to u_FragColor variable
      gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

      drawCube(this.matrix);
      

    }
}


function drawCube(M) {
  //pass the model matric inro shader
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  // Get the current color from the most recent gl.uniform4f call
  const rgba = [gl.getUniform(gl.program, u_FragColor)[0],
                gl.getUniform(gl.program, u_FragColor)[1],
                gl.getUniform(gl.program, u_FragColor)[2],
                gl.getUniform(gl.program, u_FragColor)[3]];

  //Front of cube
  drawTriangle3D([0,0,0, 1,1,0, 1,0,0 ]);
  drawTriangle3D([0,0,0, 0,1,0, 1,1,0 ]);

  // Pass the color of a point to u_FragColor uniform variable
  gl.uniform4f(u_FragColor, rgba[0]*.8, rgba[1]*.8, rgba[2]*.8, rgba[3]);
  //Top of cube
  drawTriangle3D([0,1,0, 0,1,1, 1,1,1 ]);
  drawTriangle3D([0,1,0, 1,1,1, 1,1,0 ]);

  // Right face - even darker
  gl.uniform4f(u_FragColor, rgba[0]*.7, rgba[1]*.7, rgba[2]*.7, rgba[3]);
  drawTriangle3D([1,0,0, 1,1,1, 1,1,0]);
  drawTriangle3D([1,0,0, 1,0,1, 1,1,1]);

  // Left face
  gl.uniform4f(u_FragColor, rgba[0]*.6, rgba[1]*.6, rgba[2]*.6, rgba[3]);
  drawTriangle3D([0,0,0, 0,1,1, 0,1,0]);
  drawTriangle3D([0,0,0, 0,0,1, 0,1,1]);

  // Back face
  gl.uniform4f(u_FragColor, rgba[0]*.5, rgba[1]*.5, rgba[2]*.5, rgba[3]);
  drawTriangle3D([0,0,1, 1,1,1, 1,0,1]);
  drawTriangle3D([0,0,1, 0,1,1, 1,1,1]);

  // Bottom face
  gl.uniform4f(u_FragColor, rgba[0]*.4, rgba[1]*.4, rgba[2]*.4, rgba[3]);
  drawTriangle3D([0,0,0, 1,0,1, 1,0,0]);
  drawTriangle3D([0,0,0, 0,0,1, 1,0,1]);
}

