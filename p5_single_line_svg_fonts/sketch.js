// Load, parse, and display SVG 1.1 Fonts, as specified in
// https://www.w3.org/TR/SVG11/fonts.html
// Ideal for single-stroke SVG Fonts, such as those at:
// https://gitlab.com/oskay/svg-fonts
// https://github.com/Shriinivas/inkscapestrokefont
// p5 parser/displayer by Golan Levin, December 2024

let mySvgFont;

function preload() {
  mySvgFont = new SvgFont("HersheySans1.svg");
  // or try others like:
  // mySvgFont = new SvgFont("single_line_svg_fonts/EMS/EMSTech.svg");
}

function setup() {
  createCanvas(800, 400);
}

function draw() {
  background("black");
  stroke("white");
  noFill();

  let sca = 40; 
  mySvgFont.drawString("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 60, 80, sca);
  mySvgFont.drawString("abcdefghijklmnopqrstuvwxyz", 60, 130, sca);
  mySvgFont.drawString("1234567890", 60, 180, sca);
  mySvgFont.drawString("!@#$%^&*,.?/;:'-+_", 60,230, sca); 
  mySvgFont.drawString("()[]{}<>|\u00A9\u00AE\u20AC", 60, 280, sca);
  mySvgFont.drawString("Hello World!", 60, 330, sca);
  noLoop();

}


//=====================================================
// Class to handle SVG font parsing and rendering
class SvgFont {
  constructor(filePath) {
    this.glyphs = {};
    this.unitsPerEm = 1000;
    this.ready = false;

    // Load the SVG font file
    loadStrings(filePath, (strings) => {
      this.loadData(strings.join("\n"));
      this.ready = true;
    });
  }

  isReady() {
    return this.ready;
  }

  // Load and parse the SVG font data
  loadData(svgData) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgData, "text/xml");

    // Parse the glyphs
    const glyphElements = svgDoc.querySelectorAll("glyph");
    glyphElements.forEach((glyph) => {
      const unicode = glyph.getAttribute("unicode");
      if (unicode !== null) { // Ensure glyph has a valid unicode attribute
        const pathData = glyph.getAttribute("d");
        const horizAdvX = parseFloat(glyph.getAttribute("horiz-adv-x") || 0);
        this.glyphs[unicode] = { d: pathData, horizAdvX };
      }
    });

    // Parse font-face for scale metrics
    const fontFace = svgDoc.querySelector("font-face");
    if (fontFace) {
      this.unitsPerEm = parseFloat(fontFace.getAttribute("units-per-em") || 1000);
    }
  }

  // Draw a single glyph at the specified position and scale
  drawGlyph(pathData, x, y, sca) {
    const commands = pathData.match(/[A-Za-z][^A-Za-z]*/g) || [];
    let startNewShape = true; // Flag to indicate a new shape

    for (const command of commands) {
      const type = command[0];
      const args = command
        .slice(1)
        .trim()
        .split(/[ ,]+/)
        .map(parseFloat);

      let px = x + sca * (args[0] / this.unitsPerEm);
      let py = y - sca * (args[1] / this.unitsPerEm);

      switch (type) {
        case "M": // Move to
          if (!startNewShape) {
            endShape();
          }
          beginShape();
          vertex(px, py);
          startNewShape = false;
          break;
        case "L": // Line to
          vertex(px, py);
          break;
        default:
          console.warn(`Unsupported SVG command: ${type}`);
      }
    }
    endShape(); // End the final shape
  }

  // Draw a string of text using the parsed font
  drawString(str, x, y, sca) {
    if (this.isReady()) {
      let cursorX = x;
      const scaleFactor = sca / this.unitsPerEm;

      for (const char of str) {
        const glyph = this.glyphs[char];
        if (glyph) {
          // Only draw if there's path data
          if (glyph.d) {
            this.drawGlyph(glyph.d, cursorX, y, sca);
          }
          // Always advance cursorX using horiz-adv-x
          cursorX += glyph.horizAdvX * scaleFactor;
        } else {
          console.warn(`Missing glyph for character: '${char}' (Unicode: ${char.charCodeAt(0)})`);
          cursorX += 300 * scaleFactor; // Fallback spacing for missing glyphs
        }
      }
    }
  }
}
