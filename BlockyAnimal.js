// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`

// Fragment shader program
var FSHADER_SOURCE =`
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL(){
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }
  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  //Get the storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  //Get the storage location of u_GlobalRotateMatrix
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  //Set an initial value for this matrix to identify
  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

//Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

//Global UI elements
let g_selectedColor = [1.0,1.0,1.0,1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
var g_shapesList = [];
//let g_selectedSegments = 25;

let g_globalAngle = 0;
let g_rightFlapAngle = 0;
let g_rightArmAngle = 0;
let g_leftFlapAngle = 0;
let g_leftArmAngle = 0;
let g_headAngle = 0;
let g_leftLegAngle = 0;
let g_rightLegAngle = 0;

let g_bodyAnimation = false;
let g_headAnimation = false;
let g_leftFlapAnimation = false;
let g_rightFlapAnimation = false;

//mouseRotation
let g_isDragging = false;
let g_mouseRotatePrev = [0, 0];
let g_mouseAngleX = 0;
let g_mouseAngleY = 0;

//Shift Click
let g_isPoked = false;
let g_pokeAngle = 0;


//Set up actions for the HTML UI elements
function addActionsForHtmlUI(){
  //shift Click
  canvas.onmousedown = function(ev) {
    if (ev.shiftKey === true) {
      g_isPoked = true;
      g_pokeAngle = 0;  // Reset the falling angle
    } else {
      g_isDragging = true; 
      g_mouseRotatePrev = [ev.clientX, ev.clientY];
    }
  };
  
  canvas.onmouseup = function(ev) { g_isDragging = false; };
  //Mouse rotates
  canvas.onmousemove = function(ev) {
    if (!g_isDragging) return;
    const dx = ev.clientX - g_mouseRotatePrev[0];
    const dy = ev.clientY - g_mouseRotatePrev[1];

    // Rotation angles updated based on mouse movement
    g_mouseAngleY += dx * 0.5;  // Horizontal movement controls Y-axis rotation
    g_mouseAngleX += dy * 0.5;  // Vertical movement controls X-axis rotation
    
    g_mouseAngleX = Math.max(-90, Math.min(90, g_mouseAngleX));
    
    g_mouseRotatePrev = [ev.clientX, ev.clientY];
    renderScene();
  }

  //Button events
  //body
  document.getElementById('animationONBody').onclick = function() {g_bodyAnimation = true;};
  document.getElementById('animationOFFBody').onclick = function() {g_bodyAnimation = false;};
  //head
  document.getElementById('animationONHead').onclick = function() {g_headAnimation = true;};
  document.getElementById('animationOFFHead').onclick = function() {g_headAnimation = false;};
  //L flap
  document.getElementById('animationONLFlap').onclick = function() {g_leftFlapAnimation = true;};
  document.getElementById('animationOFFLFlap').onclick = function() {g_leftFlapAnimation = false;};
  //R flap
  document.getElementById('animationONRFlap').onclick = function() {g_rightFlapAnimation = true;};
  document.getElementById('animationOFFRFlap').onclick = function() {g_rightFlapAnimation = false;};

  //Sliders
  document.getElementById('leftLeg').addEventListener('mousemove', function() { g_leftLegAngle = this.value; renderScene();});
  document.getElementById('rightLeg').addEventListener('mousemove', function() { g_rightLegAngle = this.value; renderScene();});

  document.getElementById('headSlide').addEventListener('mousemove', function() { g_headAngle = this.value; renderScene();});

  document.getElementById('leftArm').addEventListener('mousemove', function() { g_leftFlapAngle = this.value; renderScene(); });
  document.getElementById('leftFlap').addEventListener('mousemove', function() { g_leftArmAngle = this.value; renderScene(); });

  document.getElementById('rightArm').addEventListener('mousemove', function() { g_rightArmAngle = this.value; renderScene(); });
  document.getElementById('rightFlap').addEventListener('mousemove', function() { g_rightFlapAngle = this.value; renderScene(); });
  
  document.getElementById('angleSlide').addEventListener('mousemove', function() { g_globalAngle = this.value; renderScene(); });
  
};

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();
  gl.enable(gl.DEPTH_TEST);
  // Light Blue canvas
  gl.clearColor(0.53, 0.81, 0.98, 1.0);
  renderScene();
  requestAnimationFrame(tick);

}

// Animation
var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0-g_startTime;

function tick(){
  g_seconds = performance.now()/1000.0-g_startTime;
  //console.log(g_seconds);
  renderScene();
  //renderAllShapes();
  requestAnimationFrame(tick);
}

// My Penguin is Here
function renderScene(){
  //var globalRotMat = new Matrix4().rotate(g_globalAngle,0,1,0);
  //Rotate with mouse
  var globalRotMat = new Matrix4()
    .rotate(g_mouseAngleX, 1, 0, 0)  // X-axis rotation/vertical mouse movement
    .rotate(g_mouseAngleY, 0, 1, 0)  // Y-axis rotation/horizontal mouse movement
    .rotate(g_globalAngle, 0, 1, 0); // Original slider rotation
  
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  //-----------------------Drawing my Blocky Penguin------------------------
  //Draw the body cube (parent)
  var body = new Cube();
  body.color = [0.15, 0.15, 0.15, 1.0];
  var bodyMatrixBeforeScale = new Matrix4();
  bodyMatrixBeforeScale.setTranslate(-0.25,-0.75, 0.0);
  bodyMatrixBeforeScale.translate(0.2, 0.5, 0.0); 

  // Add poke animation
  if (g_isPoked) {
    g_pokeAngle = Math.min(g_pokeAngle + 5, 90);  // Gradually fall back to 90 degrees
    if (g_pokeAngle >= 90) {
        setTimeout(() => { g_isPoked = false; g_pokeAngle = 0;}, 10000);  // Reset after a couple of seconds
    }
    bodyMatrixBeforeScale.rotate(g_pokeAngle, 1, 0, 0);  // Rotate around X axis to fall backwards
  }

  //ON or OFF
  if (g_bodyAnimation) {
    bodyMatrixBeforeScale.rotate(10*Math.sin(g_seconds), 0, 0, 1);  
  } 
  bodyMatrixBeforeScale.translate(-0.25, -0.5, 0.0);

  // Complete body's matrix with scale for rendering
  var bodyMatrix = new Matrix4(bodyMatrixBeforeScale);
  bodyMatrix.scale(0.5,1.0,0.35);
  body.matrix = bodyMatrix;
  body.render();

  //Draw the color body 1 (child of body)
  var body1 = new Cube();
  body1.color = [1.0, 0.96, 0.93, 1];
  var body1Matrix = new Matrix4(bodyMatrixBeforeScale);
  body1Matrix.translate(0.032, 0.25, -0.01); // Relative to body's coordinate system
  body1Matrix.scale(0.44,0.75,0.02);
  body1.matrix = body1Matrix;
  body1.render();

  //Draw the color body 2 (child of body)
  var body2 = new Cube();
  body2.color = [1.0, 0.96, 0.93, 1];
  var body2Matrix = new Matrix4(bodyMatrixBeforeScale);
  body2Matrix.translate(-0.002, 0.0, -0.04); // Relative to body's coordinate system
  body2Matrix.scale(0.51,0.75,0.22);
  body2.matrix = body2Matrix;
  body2.render();

  //Draw the color body 3 (child of body)
  var body3 = new Cube();
  body3.color = [1.0, 0.96, 0.93, 1];
  var body3Matrix = new Matrix4(bodyMatrixBeforeScale);
  body3Matrix.translate(-0.024, 0.0, -0.07); // Relative to body's coordinate system
  body3Matrix.scale(0.55,0.50,0.35);
  body3.matrix = body3Matrix;
  body3.render();

///////////////////////////////////////////////////////////////////////////////////////
  //Head of Penguin (parent)
  var head = new Cube();
  head.color = [0.15, 0.15, 0.15, 1.0];
  var headMatrixBeforeScale = new Matrix4(bodyMatrixBeforeScale);
  headMatrixBeforeScale.translate(0.01, 0.95, 0.0);  // Position to body
  headMatrixBeforeScale.translate(0.24, 0.0, 0.0);
  //ON or OFF
  if (g_headAnimation) {
    headMatrixBeforeScale.rotate(7*Math.sin(g_seconds), 0, 0, 1); 
  } else {
    headMatrixBeforeScale.rotate(g_headAngle, 0, 0, 1);
  }
  //bodyMatrixBeforeScale.translate(-0.25, -0.5, 0.0);
  headMatrixBeforeScale.translate(-0.24, 0.0, 0.0);
  
  // Head's matrix with scale
  var headMatrix = new Matrix4(headMatrixBeforeScale);
  headMatrix.scale(0.48,0.4,0.35);
  head.matrix = headMatrix;
  head.render();

  // The Top beak (child of head)
  var topBeak = new Cube();
  topBeak.color = [1, 0.7, 0.3, 1.0];
  var topBeakMatrix = new Matrix4(headMatrixBeforeScale);
  topBeakMatrix.translate(0.14, 0.09, -0.08);  // Relative to head coordinate system
  topBeakMatrix.scale(0.2,0.07,0.1);
  topBeak.matrix = topBeakMatrix;
  topBeak.render();

  // The Bottom Beak (child of head)
  var bottBeak = new Cube();
  bottBeak.color = [0.851, 0.639, 0.3, 1.0];
  var bottBeakMatrix = new Matrix4(headMatrixBeforeScale);
  bottBeakMatrix.translate(0.14, 0.06, -0.04);  // Relative to head coordinate system
  bottBeakMatrix.scale(0.2,0.03,0.1);
  bottBeak.matrix = bottBeakMatrix;
  bottBeak.render();

  // The left eye (child of head)
  var leftEye = new Cube();
  leftEye.color = [0,0,0,1];
  var leftEyeMatrix = new Matrix4(headMatrixBeforeScale);
  leftEyeMatrix.translate(0.07, 0.135, 0.0);  // Relative to head coordinate system
  leftEyeMatrix.scale(0.07,0.07,-0.01);
  leftEye.matrix = leftEyeMatrix;
  leftEye.render();

  // The right eye (child of head)
  var rightEye = new Cube();
  rightEye.color = [0,0,0,1];
  var rightEyeMatrix = new Matrix4(headMatrixBeforeScale);
  rightEyeMatrix.translate(0.34, 0.135, 0.0);  // Relative to head coordinate system
  rightEyeMatrix.scale(0.07,0.07,-0.01);
  rightEye.matrix = rightEyeMatrix;
  rightEye.render();

///////////////////////////////////////////////////////////////////////////////////////
  // Right arm (Parent of right hand)
  var rightArm = new Cube();
  rightArm.color = [0.15, 0.15, 0.15, 1.0];

  var armMatrixBeforeScale = new Matrix4(bodyMatrixBeforeScale);
  armMatrixBeforeScale.translate(0.55, 0.95, 0.0);    // Connection right arm on body
  //ON or OFF
  if (g_rightFlapAnimation) {
    armMatrixBeforeScale.rotate(15*Math.sin(g_seconds), 0, 0, 1);
  } else {
    armMatrixBeforeScale.rotate(g_rightArmAngle, 0, 0, 1);
  }
  armMatrixBeforeScale.rotate(185, 0, 0, 1);

  // Right arm matrix with scale
  var armMatrix = new Matrix4(armMatrixBeforeScale);
  armMatrix.scale(0.06, 0.50, 0.25);
  rightArm.matrix = armMatrix;
  rightArm.render();

  // Right hand (child of right arm)
  var rightHand = new Cube();
  rightHand.color = [0.851, 0.639, 0.3, 1.0];
  var handMatrix = new Matrix4(armMatrixBeforeScale);
  handMatrix.translate(0.003, 0.48, 0.005);
  handMatrix.rotate(g_rightFlapAngle, 0, 0, 1);
  handMatrix.scale(0.055, 0.17, 0.24);
  rightHand.matrix = handMatrix;
  rightHand.render();

///////////////////////////////////////////////////////////////////////////////////////
  //Left arm (Parent of left hand)
  var leftArm = new Cube();
  leftArm.color = [0.15, 0.15, 0.15, 1.0];

  var leftArmMatrixBeforeScale = new Matrix4(bodyMatrixBeforeScale);
  leftArmMatrixBeforeScale.translate(0.01, 0.93, 0.0); // Connection to body
  //ON or OFF
  if (g_leftFlapAnimation) {
    leftArmMatrixBeforeScale.rotate(-15*Math.sin(g_seconds), 0, 0, 1);
  } else {
    leftArmMatrixBeforeScale.rotate(g_leftArmAngle, 0, 0, 1);
  }
  leftArmMatrixBeforeScale.rotate(-185, 0, 0, 1);

  // Left arm matrix with scale
  var leftArmMatrix = new Matrix4(leftArmMatrixBeforeScale);
  leftArmMatrix.scale(0.06, 0.50, 0.25);
  leftArm.matrix = leftArmMatrix;
  leftArm.render();

  // Left hand (child of left arm)
  var leftHand = new Cube();
  leftHand.color = [0.851, 0.639, 0.3, 1.0];
  var leftHandMatrix = new Matrix4(leftArmMatrixBeforeScale);
  leftHandMatrix.translate(0.0, 0.48, 0.005);
  leftHandMatrix.rotate(g_leftFlapAngle, 0, 0, 1);
  leftHandMatrix.scale(0.055, 0.17, 0.24);
  leftHand.matrix = leftHandMatrix;
  leftHand.render();

///////////////////////////////////////////////////////////////////////////////////////
  //Right leg (Parent of feet)
  var rightLeg = new Cube();
  rightLeg.color = [0.15, 0.15, 0.15, 1.0];
  var rightLegMatrixBeforeScale = new Matrix4(bodyMatrixBeforeScale);
  rightLegMatrixBeforeScale.translate(0.30, -0.15, 0.05);
  rightLegMatrixBeforeScale.translate(0.0725, 0.0, 0.0);
  rightLegMatrixBeforeScale.rotate(-g_rightLegAngle,0,0,1);
  rightLegMatrixBeforeScale.translate(-0.0725, 0.0, 0.0);

  // Right Leg matrix
  var rightLegMatrix = new Matrix4(rightLegMatrixBeforeScale);
  rightLegMatrix.scale(0.145,0.3,0.20);
  rightLeg.matrix = rightLegMatrix;
  rightLeg.render();

  // Right feet (child of right leg)
  var rightFeet = new Cube();
  rightFeet.color = [1, 0.7, 0.3, 1.0];
  var rightFeetMatrix = new Matrix4(rightLegMatrixBeforeScale);
  rightFeetMatrix.translate(-0.01, 0.0, -0.05);  // Position to Right Leg coordinate system
  rightFeetMatrix.scale(0.16,0.03,0.26);
  rightFeet.matrix = rightFeetMatrix;
  rightFeet.render();

///////////////////////////////////////////////////////////////////////////////////////

  //Left leg (Parent of feet)
  var leftLeg = new Cube();
  leftLeg.color = [0.15, 0.15, 0.15, 1.0];
  var legMatrixBeforeScale = new Matrix4(bodyMatrixBeforeScale);
  legMatrixBeforeScale.translate(0.05, -0.15, 0.05);
  legMatrixBeforeScale.translate(0.0725, 0.0, 0.0);
  legMatrixBeforeScale.rotate(-g_leftLegAngle, 0, 0, 1);
  legMatrixBeforeScale.translate(-0.0725, 0.0, 0.0);

  // Left Leg matrix
  var legMatrix = new Matrix4(legMatrixBeforeScale);
  legMatrix.scale(0.145,0.3,0.20);
  leftLeg.matrix = legMatrix;
  leftLeg.render();

  //Left feet (child of left leg)
  var leftFeet = new Cube();
  leftFeet.color = [1, 0.7, 0.3, 1.0];
  var feetMatrix = new Matrix4(legMatrixBeforeScale);
  feetMatrix.translate(-0.01, 0.0, -0.05);  // Position to Left Leg coordinate system
  feetMatrix.scale(0.16,0.03,0.26);
  leftFeet.matrix = feetMatrix;
  leftFeet.render();

  // Calculate and display FPS
  var duration = performance.now() - startTime;
  sendTextToHTML("ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numd");
  startTime = performance.now(); // Reset the start time for next frame
}

function renderAllShapes(){
  var globalRotMat = new Matrix4().rotate(g_globalAngle,0,1,0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);
  // Clear <canvas>, add depth buffer clearing
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

}

let startTime = performance.now();
function sendTextToHTML(text, htmlID){
  var htmlElm = document.getElementById(htmlID);
  if(!htmlElm){
    console.log("Failed to get" + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

function click(ev) {
  let [x,y] = convertCoordinatesEventToGL(ev);
  //Create and store the new point
  let point;
  if(g_selectedType==POINT) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
  } else {
    point = new Circle();
  }
  point.position = [x,y];
  point.size = g_selectedSize;
  g_shapesList.push(point);
  renderScene();
}


//Extract the event click and return it in WebGL coordinates
function convertCoordinatesEventToGL(ev){
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  return([x,y]);
}
