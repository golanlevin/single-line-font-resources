// This program renders Hershey fonts in 3 ways: 
// 1. "Simply", using Lingdong's library API;
// 2. "Custom", allowing for pointwise manipulations;
// 3. "Single Line", in which all text is an unbroken polyline. 
// Press 's' to export SVG, using p5.plotSvg.

// See:
// https://github.com/LingDong-/p5-hershey-js
// https://lingdong-.github.io/p5-hershey-js/
// https://github.com/golanlevin/p5.plotSvg/

let bDoExportSvg = false;
function setup() {
  createCanvas(800, 400);
}

function keyPressed() {
  if (key == "s") {
    bDoExportSvg = true;
  }
}

function draw() {
  background(0);
  stroke(255); 
  noFill();
  
  if (bDoExportSvg){
    beginRecordSVG(this, "pointwise_hershey_to_svg.svg");
  }
  
  //---------------
  // EASY WAY
  // Have Lingdong's library render Hershey text for us.
  // For fun, try FONT_HERSHEY.SCRIPT_SIMPLEX
  let hershFont = FONT_HERSHEY.SIMPLEX;
  renderHersheyEasy("Simple;", hershFont, 50, 80, 2.0); 
  
  //---------------
  // CUSTOM WAY
  renderHersheyCustom ("Custom;", hershFont, 50, 160, 2.0);
  
  //---------------
  // SINGLE LINE 
  // Generate vertices for a chunk of Hershey text -- with NO pen-up's. 
  // It's your job to call beginShape() beforehand, and endShape() after.
  // All text between beginShape() and endShape() will be rendered
  // as a single continuous line, even in different fonts,.
  beginShape(); 
  renderHersheyVertices("Single", hershFont, 50, 240, 2.0); 
  renderHersheyVertices("Line.", FONT_HERSHEY.SCRIPT_SIMPLEX, 50, 320, 3.0); 
  endShape(); 

  //---------------
  // Export SVG file if requested
  if (bDoExportSvg) {
    endRecordSVG();
    bDoExportSvg = false;
  }
}

//==========================================================
function renderHersheyEasy(myText, hFont, textX, textY, textScale){
  push();
  translate(textX, textY);
  scale(textScale, textScale);
  P5.hershey.putText(myText, {
    cmap: hFont,
    align: "left",
  });
  pop();
}

//==========================================================
function renderHersheyVertices(myText, hFont, textX, textY, textScale){
  // Generate vertices for a chunk of Hershey text with NO pen-up's. 
  // It's your job to call beginShape() beforehand, & endShape() after. 
  //
  const argsCmap = hFont; // SIMPLEX, or SCRIPT_SIMPLEX, etc. 
  const argsData = FONT_HERSHEY.DATA; // don't touch this
  const ordR = "R".charCodeAt(0);
  
  let xOffset = textX; 
  let yOffset = textY;
  for (let j=0; j<myText.length; j++){
    let jthChar = myText[j];
    let entry = argsData[argsCmap(jthChar.charCodeAt(0))];
    let [xmin,xmax] = P5.hershey.parseBound(entry);
    let content = entry.slice(5);
    xOffset -= xmin * textScale;
    for (let i=0; i<content.length; i+=2) {
      let digit = content.slice(i, i+2);
      if (digit == " R") {
      } else {
        let x = digit[0].charCodeAt(0) - ordR;
        let y = digit[1].charCodeAt(0) - ordR;
        vertex(xOffset + x*textScale, yOffset + y*textScale);
      }
    }
    xOffset += xmax * textScale;
  }
}



//==========================================================
function renderHersheyCustom (myText, hFont, textX, textY, textScale){
  // Render the points in the Hershey fonts — ourselves.
  // This code is extracted/adapted from p5.hershey.js
  // 
  push();
  translate(textX, textY);
  scale(textScale, textScale);
  
  const argsCmap = hFont;
  const argsData = FONT_HERSHEY.DATA; // don't touch this
  const ordR = "R".charCodeAt(0);
  
  let xOffset = 0; 
  for (let j=0; j<myText.length; j++){
    let jthChar = myText[j];
    let entry = argsData[argsCmap(jthChar.charCodeAt(0))];
    let [xmin,xmax] = P5.hershey.parseBound(entry);
    let content = entry.slice(5);
    xOffset -= xmin;

    beginShape();
    for (let i=0; i<content.length; i+=2) {
      let digit = content.slice(i, i+2);
      if (digit == " R") {
        endShape();
        beginShape();
      } else {
        let x = digit[0].charCodeAt(0) - ordR;
        let y = digit[1].charCodeAt(0) - ordR;
        x += random(-2,2); 
        y += random(-2,2); 
        vertex(xOffset + x, y);
      }
    }
    endShape();
    xOffset += xmax;
  }
  pop();
}
