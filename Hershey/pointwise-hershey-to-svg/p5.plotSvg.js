/*
//
//       _____        _       _    _____           
//      | ____|      | |     | |  / ____|          
//  _ __| |__   _ __ | | ___ | |_| (_____   ____ _ 
// | '_ \___ \ | '_ \| |/ _ \| __|\___ \ \ / / _` |
// | |_) |__) || |_) | | (_) | |_ ____) \ V / (_| |
// | .__/____(_) .__/|_|\___/ \__|_____/ \_/ \__, |
// | |         | |                            __/ |
// |_|         |_|                           |___/ 
//
//
*/
// p5.plotSvg: a Plotter-Oriented SVG Exporter for p5.js

(function(global) {
  // Create a namespace for the library
  const p5plotSvg = {};

  // Attach constants to the p5plotSvg namespace
  p5plotSvg.SVG_INDENT_NONE = 0;
  p5plotSvg.SVG_INDENT_SPACES = 1;
  p5plotSvg.SVG_INDENT_TABS = 2;

  // Internal properties set using setter functions
  let _bFlattenTransforms = false; // false is default
  let _bTransformsExist = false;
  let _svgFilename = "output.svg"; 
  let _svgCurveTightness = 0.0;
  let _svgCoordPrecision = 4; 
  let _svgTransformPrecision = 6; 
  let _svgIndentType = p5plotSvg.SVG_INDENT_SPACES; 
  let _svgIndentAmount = 2; 
  let _svgPointRadius = 0.25; // Default radius for point representation
  let _svgDPI = 96; // Default DPI value
  let _svgDefaultStrokeColor = 'black';
  let _svgCurrentStrokeColor = _svgDefaultStrokeColor;
  let _svgDefaultStrokeWeight = 1;

  // Internal variables, not to be accessed directly
  let _p5Instance; 
  let _p5PixelDensity = 1; 
  let _commands = [];
  let _svgGroupLevel = 0; 
  let _vertexStack = []; // Temp stack for polyline/polygon vertices 
  let _shapeMode = "simple"; // Track mode: "simple" or "complex"
  let _shapeKind = "poly";
  let _bRecordingSvg = false; 
  let _bRecordingSvgBegun = false;
  let _pointsSetCount = 0; 
  let _linesSetCount = 0; 
  let _trianglesSetCount = 0; 
  let _triangleFanSetCount = 0; 
  let _triangleStripSetCount = 0; 
  let _quadsSetCount = 0;
  let _quadStripSetCount = 0; 

  let _originalArcFunc;
  let _originalBezierFunc;
  let _originalCircleFunc;
  let _originalCurveFunc;
  let _originalEllipseFunc;
  let _originalLineFunc;
  let _originalPointFunc;
  let _originalQuadFunc;
  let _originalRectFunc;
  let _originalSquareFunc;
  let _originalTriangleFunc;
  let _originalBezierDetailFunc;
  let _originalCurveTightnessFunc;
  let _originalBeginShapeFunc;
  let _originalVertexFunc;
  let _originalBezierVertexFunc;
  let _originalQuadraticVertexFunc;
  let _originalCurveVertexFunc; 
  let _originalEndShapeFunc; 
  let _originalDescribeFunc; 
  let _originalPushFunc; 
  let _originalPopFunc; 
  let _originalScaleFunc; 
  let _originalTranslateFunc; 
  let _originalRotateFunc;
  let _originalShearXFunc;
  let _originalShearYFunc;
  let _originalTextFunc;
  let _originalStrokeFunc; 
  let _originalColorModeFunc;


  /**
   * Begins recording SVG output for a p5.js sketch.
   * Initializes recording state, validates and sets the output filename,
   * and overrides p5.js drawing functions to capture drawing commands for SVG export.
   * @param {object} p5Instance - A reference to the current p5.js sketch (e.g. `this`).
   * @param {string} [fn] - Optional filename for the output SVG file.
   * Defaults to "output.svg" if not provided or invalid.
   */
  p5plotSvg.beginRecordSVG = function(p5Instance, fn) {
    // Validate the p5 instance
    if (!p5Instance) {
      throw new Error("Invalid p5 instance provided to beginRecordSVG().");
    }

    // Store a reference to the p5 instance for use in other functions
    _p5Instance = p5Instance;
    _p5PixelDensity = p5Instance.pixelDensity(); 

    // Check if filename is provided and valid
    if (typeof fn === 'string' && fn.length > 0) {
      // Ensure ".svg" is present before stripping invalid characters
      if (!fn.endsWith(".svg")) {
        fn += ".svg";
      }

      // Strip out illegal characters
      // (allow only letters, numbers, dashes, dots, and underscores)
      // Ensure the filename has at least one character after stripping
      fn = fn.replace(/[^a-zA-Z0-9-_\.]/g, '');
      _svgFilename = (fn.length > 0) ? fn : "output.svg";
    } else {
      // Use default filename if `fn` is invalid or not provided
      _svgFilename = "output.svg";
    }

    // Initialize SVG settings and override functions
    _bRecordingSvg = true;
    _bRecordingSvgBegun = true; 
    _bTransformsExist = false;
    _commands = [];
    _svgGroupLevel = 0;
    _pointsSetCount = 0;
    _linesSetCount = 0;
    _trianglesSetCount = 0;
    _triangleFanSetCount = 0;
    _triangleStripSetCount = 0;
    _quadsSetCount = 0;
    _quadStripSetCount = 0;
    _svgCurrentStrokeColor = _svgDefaultStrokeColor;
    overrideP5Functions();
  }


  /**
   * Pauses or unpauses recording of SVG output for a p5.js sketch,
   * depending on whether the bPause argument is true or false. 
   */
  p5plotSvg.pauseRecordSVG = function(bPause) {
    if (!_bRecordingSvgBegun){
      console.warn("You must beginRecordSVG() before you can pauseRecordSVG().");
      return; 
    } else {
      if (bPause === true){
        _bRecordingSvg = false;
      } else if (bPause === false){
        _bRecordingSvg = true;
      }
    }
  }


  /**
   * Ends recording of SVG output for a p5.js sketch.
   * Calls the export function to generate the SVG output 
   * and restores the original p5.js functions.
   */
  p5plotSvg.endRecordSVG = function() {
    exportSVG();
    restoreP5Functions(); 
    _bRecordingSvg = false;
    _bRecordingSvgBegun = false; 
  }


  /**
   * @private
   * Overrides p5.js drawing functions to capture commands for SVG export.
   * Includes support for shapes, vertices, transformations, and text functions.
   */
  function overrideP5Functions() {
    overrideArcFunction(); 
    overrideBezierFunction(); 
    overrideCircleFunction(); 
    overrideCurveFunction(); 
    overrideEllipseFunction(); 
    overrideLineFunction(); 
    overridePointFunction(); 
    overrideQuadFunction(); 
    overrideRectFunction(); 
    overrideSquareFunction(); 
    overrideTriangleFunction(); 
    overrideBezierDetailFunction(); 
    overrideCurveTightnessFunction(); 
    
    overrideBeginShapeFunction(); 
    overrideVertexFunction(); 
    overrideBezierVertexFunction();
    overrideQuadraticVertexFunction(); 
    overrideCurveVertexFunction();
    overrideEndShapeFunction(); 
    
    overrideDescribeFunction(); 
    overridePushFunction(); 
    overridePopFunction();
    overrideScaleFunction(); 
    overrideTranslateFunction(); 
    overrideRotateFunction(); 
    overrideShearXFunction(); 
    overrideShearYFunction(); 
    overrideTextFunction();
    overrideStrokeFunction(); 
    overrideColorModeFunction(); 
  }


  /**
   * @private
   * Restores the original p5.js drawing functions that were overridden for SVG export.
   * Reverts all overrides, returning p5.js functions to their standard behavior.
   */
  function restoreP5Functions(){
    window.arc = _originalArcFunc;
    window.bezier = _originalBezierFunc;
    window.circle = _originalCircleFunc;
    window.curve = _originalCurveFunc;
    window.ellipse = _originalEllipseFunc;
    window.line = _originalLineFunc;
    window.point = _originalPointFunc;
    window.quad = _originalQuadFunc;
    window.rect = _originalRectFunc;
    window.square = _originalSquareFunc;
    window.triangle = _originalTriangleFunc;
    window.bezierDetail = _originalBezierDetailFunc;
    window.curveTightness = _originalCurveTightnessFunc;
    
    window.beginShape = _originalBeginShapeFunc;
    window.vertex = _originalVertexFunc;
    window.bezierVertex = _originalBezierVertexFunc;
    window.quadraticVertex = _originalQuadraticVertexFunc;
    window.curveVertex = _originalCurveVertexFunc; 
    window.endShape = _originalEndShapeFunc; 
    
    window.describe = _originalDescribeFunc; 
    window.push = _originalPushFunc; 
    window.pop = _originalPopFunc; 
    window.scale = _originalScaleFunc; 
    window.translate = _originalTranslateFunc; 
    window.rotate = _originalRotateFunc;
    window.shearX = _originalShearXFunc;
    window.shearY = _originalShearYFunc;
    window.text = _originalTextFunc;
    window.stroke = _originalStrokeFunc; 
    window.colorMode = _originalColorModeFunc; 
  }


  /**
   * @private
   * Overrides the p5.js arc function to capture SVG arc commands for export.
   * Supports different arc modes. Warns about optional detail parameter in WEBGL context. 
   * Stores arc parameters in the `_commands` array when recording SVG output.
   * @see {@link https://p5js.org/reference/p5/arc/}
   */
  function overrideArcFunction() {
    _originalArcFunc = window.arc;
    window.arc = function(x, y, w, h, start, stop, mode = OPEN, detail = 0) {
      if (_bRecordingSvg) {
        if (detail !== undefined && p5.instance._renderer.drawingContext instanceof WebGLRenderingContext) {
          console.warn("arc() detail is currently unsupported in SVG output.");
        }
        let transformMatrix = captureCurrentTransformMatrix();
        _commands.push({ type: 'arc', x, y, w, h, start, stop, mode, transformMatrix });
      }
      _originalArcFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js bezier function to capture SVG bezier curve commands for export.
   * Stores bezier curve control points in the `_commands` array when recording SVG output.
   * @see {@link https://p5js.org/reference/p5/bezier/}
   */
  function overrideBezierFunction(){
    _originalBezierFunc = window.bezier;
    window.bezier = function(x1, y1, x2, y2, x3, y3, x4, y4) {
      if (_bRecordingSvg) {
        let transformMatrix = captureCurrentTransformMatrix();
        _commands.push({ type: 'bezier', x1, y1, x2, y2, x3, y3, x4, y4, transformMatrix });
      }
      _originalBezierFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js circle function to capture SVG circle commands for export.
   * Handles different ellipse modes (center, corner, radius, corners) 
   * to convert circle parameters appropriately.
   * Stores circle or ellipse parameters in the `_commands` array when recording SVG output.
   * @see {@link https://p5js.org/reference/p5/circle/}
   */
  function overrideCircleFunction(){
    _originalCircleFunc = window.circle;
    window.circle = function(x, y, d) {
      if (_bRecordingSvg) { 
        let transformMatrix = captureCurrentTransformMatrix();
        
        if (_p5Instance._renderer._ellipseMode === 'center'){
          _commands.push({ type: 'circle', x, y, d, transformMatrix });
        } else if (_p5Instance._renderer._ellipseMode === 'corner'){
          x += d/2;
          y += d/2;
          _commands.push({ type: 'circle', x, y, d, transformMatrix });
        } else if (_p5Instance._renderer._ellipseMode === 'radius'){
          d *= 2;
          _commands.push({ type: 'circle', x, y, d, transformMatrix });
        } else if (_p5Instance._renderer._ellipseMode === 'corners'){
          let w = d - x; 
          let h = d - y;
          x += w/2;
          y += h/2;
          _commands.push({ type: 'ellipse', x, y, w, h, transformMatrix });
        }
      }
      
      _originalCircleFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js curve function to capture SVG curve commands for export.
   * Adjusts control points based on the current curve tightness setting before storing
   * curve parameters in the `_commands` array when recording SVG output.
   * @see {@link https://p5js.org/reference/#/p5/curve}
   */
  function overrideCurveFunction() {
    _originalCurveFunc = window.curve;
    window.curve = function(x1, y1, x2, y2, x3, y3, x4, y4) {
      if (_bRecordingSvg) {
        
        // Adjust control points based on the current tightness setting
        const [adjX1, adjY1, adjX2, adjY2, adjX3, adjY3, adjX4, adjY4] = 
          adjustControlPointsForTightness(x1, y1, x2, y2, x3, y3, x4, y4, _svgCurveTightness);
        
        x1 = adjX1; y1 = adjY1;
        x2 = adjX2; y2 = adjY2;
        x3 = adjX3; y3 = adjY3;
        x4 = adjX4; y4 = adjY4;
        let transformMatrix = captureCurrentTransformMatrix();
        _commands.push({ type: 'curve', x1, y1, x2, y2, x3, y3, x4, y4, transformMatrix });
      }
      _originalCurveFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js ellipse function to capture SVG ellipse commands for export.
   * Handles different ellipse modes (center, corner, radius, corners) and warns
   * when detail is used in WEBGL context as it is unsupported for SVG output.
   * Stores ellipse parameters in the `_commands` array when recording SVG output.
   * @see {@link https://p5js.org/reference/p5/ellipse/}
  */
  function overrideEllipseFunction(){
    _originalEllipseFunc = window.ellipse;
    window.ellipse = function(x, y, w, h, detail = 0) {
      if (_bRecordingSvg) {
        if (detail !== undefined && _p5Instance._renderer.drawingContext instanceof WebGLRenderingContext) {
          console.warn("ellipse() detail is currently unsupported in SVG output.");
        }
        
        // We can't use _p5Instance.ellipseMode() for reasons :(
        if (_p5Instance._renderer._ellipseMode === 'center'){
          ;
        } else if (_p5Instance._renderer._ellipseMode === 'corner'){
          x += w/2;
          y += h/2;
        } else if (_p5Instance._renderer._ellipseMode === 'radius'){
          w *= 2;
          h *= 2; 
        } else if (_p5Instance._renderer._ellipseMode === 'corners'){
          let px = Math.min(x, w); 
          let qx = Math.max(x, w); 
          let py = Math.min(y, h); 
          let qy = Math.max(y, h); 
          x = px; 
          y = py; 
          w = qx - px; 
          h = qy - py;
          x += w/2;
          y += h/2;
        }
        let transformMatrix = captureCurrentTransformMatrix();
        _commands.push({ type: 'ellipse', x, y, w, h, transformMatrix });
      }
      _originalEllipseFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js line function to capture SVG line commands for export.
   * Stores line parameters in the `_commands` array when recording SVG output.
   * @see {@link https://p5js.org/reference/p5/line/}
   */
  function overrideLineFunction() {
    _originalLineFunc = window.line;
    window.line = function(x1, y1, x2, y2) {
      if (_bRecordingSvg) { 
        let transformMatrix = captureCurrentTransformMatrix();
        _commands.push({ type: 'line', x1, y1, x2, y2, transformMatrix });
      }
      _originalLineFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js point function to capture SVG point commands for export.
   * Stores point parameters as small circles in the `_commands` array when recording SVG output.
   * @see {@link https://p5js.org/reference/p5/point/}
   */
  function overridePointFunction() {
    _originalPointFunc = window.point;
    window.point = function(x, y) {
      if (_bRecordingSvg) {
        let transformMatrix = captureCurrentTransformMatrix();
        _commands.push({ type: 'point', x, y, radius: _svgPointRadius, transformMatrix });
      }
      _originalPointFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js quad function to capture SVG quad commands for export.
   * Stores quad parameters in the `_commands` array when recording SVG output.
   * @see {@link https://p5js.org/reference/p5/quad/}
   */
  function overrideQuadFunction(){
    _originalQuadFunc = window.quad;
    window.quad = function(x1, y1, x2, y2, x3, y3, x4, y4) {
      if (_bRecordingSvg) { 
        let transformMatrix = captureCurrentTransformMatrix();
        _commands.push({ type: 'quad', x1, y1, x2, y2, x3, y3, x4, y4, transformMatrix });
      }
      _originalQuadFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js rect function to capture SVG rect commands for export.
   * Handles different rect modes (corner, center, radius, corners) and supports
   * rectangles with optional uniform or individual corner radii.
   * Stores rect parameters in the `_commands` array when recording SVG output.
   * @see {@link https://p5js.org/reference/p5/rect/}
   */
  function overrideRectFunction() {
    _originalRectFunc = window.rect;
    window.rect = function(x, y, w, h, tl, tr, br, bl) {
      if (_bRecordingSvg) {
        if (arguments.length === 3) { h = w; }
        
        // Handle different rect modes
        if (_p5Instance._renderer._rectMode === 'corner') {
          // No adjustment needed for 'corner'
        } else if (_p5Instance._renderer._rectMode === 'center') {
          x = x - w / 2;
          y = y - h / 2;
        } else if (_p5Instance._renderer._rectMode === 'radius') {
          x = x - w;
          y = y - h;
          w = 2 * w;
          h = 2 * h;
        } else if (_p5Instance._renderer._rectMode === 'corners') {
          let px = Math.min(x, w);
          let qx = Math.max(x, w);
          let py = Math.min(y, h);
          let qy = Math.max(y, h);
          x = px;
          y = py;
          w = qx - px;
          h = qy - py;
        }

        let transformMatrix = captureCurrentTransformMatrix();
        // Check for corner radii
        if (arguments.length === 5) { // Single corner radius
          _commands.push({ type: 'rect', x, y, w, h, tl, transformMatrix });
        } else if (arguments.length === 8) { // Individual corner radii
          _commands.push({ type: 'rect', x, y, w, h, tl,tr,br,bl, transformMatrix });
        } else { // Standard rectangle
          _commands.push({ type: 'rect', x, y, w, h, transformMatrix });
        }
      }
      _originalRectFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js square function to capture SVG square commands for export.
   * Handles different rect modes (corner, center, radius, corners) and supports
   * squares with optional uniform or individual corner radii.
   * Converts square parameters to equivalent rectangle parameters and stores them
   * in the `_commands` array when recording SVG output.
   * @see {@link https://p5js.org/reference/p5/square/}
   */
  function overrideSquareFunction(){
    _originalSquareFunc = window.square;
    window.square = function(x, y, s, tl,tr,br,bl) {
      if (_bRecordingSvg) { 
        let w = s; 
        let h = s; 

        if (_p5Instance._renderer._rectMode === 'corner'){
          ;
        } else if (_p5Instance._renderer._rectMode === 'center'){
          x = x - w/2; 
          y = y - h/2; 
        } else if (_p5Instance._renderer._rectMode === 'radius'){
          x = x - w; 
          y = y - h; 
          w = 2*w; 
          h = 2*h; 
        } else if (_p5Instance._renderer._rectMode === 'corners'){
          let px = Math.min(x, s); 
          let qx = Math.max(x, s); 
          let py = Math.min(y, s); 
          let qy = Math.max(y, s); 
          x = px; 
          y = py; 
          w = qx - px; 
          h = qy - py;
        }
        
        let transformMatrix = captureCurrentTransformMatrix();
        if (arguments.length === 3) { // standard square
          _commands.push({ type: 'rect', x, y, w, h, transformMatrix });
        } else if (arguments.length === 4) { // rounded square
          _commands.push({ type: 'rect', x, y, w, h, tl, transformMatrix });
        } else if (arguments.length === 7) {
          _commands.push({ type: 'rect', x, y, w, h, tl,tr,br,bl, transformMatrix });
        }
      }
      _originalSquareFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js triangle function to capture SVG triangle commands for export.
   * Stores triangle vertex coordinates in the `_commands` array when recording SVG output.
   * @see {@link https://p5js.org/reference/p5/triangle/}
   */
  function overrideTriangleFunction(){
    _originalTriangleFunc = window.triangle;
    window.triangle = function(x1, y1, x2, y2, x3, y3) {
      if (_bRecordingSvg) {
        let transformMatrix = captureCurrentTransformMatrix();
        _commands.push({ type: 'triangle', x1, y1, x2, y2, x3, y3, transformMatrix });
      }
      _originalTriangleFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js bezierDetail function to provide a warning when used in WEBGL context.
   * Warns users that bezierDetail is currently unsupported in SVG output.
   * https://p5js.org/reference/p5/bezierDetail/
   */
  function overrideBezierDetailFunction() {
    _originalBezierDetailFunc = window.bezierDetail;
    window.bezierDetail = function(detailLevel) { // Check if the renderer is WEBGL
      if (p5.instance._renderer.drawingContext instanceof WebGLRenderingContext) {
        console.warn("bezierDetail() is currently unsupported in SVG output.");
      }
      _originalBezierDetailFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js curveTightness function to capture curve tightness settings for SVG export.
   * Updates the `_svgCurveTightness` variable to reflect the specified tightness value.
   * @see {@link https://p5js.org/reference/p5/curveTightness/}
   */
  function overrideCurveTightnessFunction() {
    _originalCurveTightnessFunc = window.curveTightness;
    window.curveTightness = function(tightness) {
      if (_bRecordingSvg) { 
        _svgCurveTightness = tightness;
      }
      _originalCurveTightnessFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js beginShape function to initiate shape recording for SVG export.
   * Initializes the vertex stack and sets the shape kind based on the provided kind parameter.
   * @see {@link https://p5js.org/reference/p5/beginShape/}
   */
  function overrideBeginShapeFunction() {
    _originalBeginShapeFunc = window.beginShape;
    window.beginShape = function(kind) {
      if (_bRecordingSvg) { 
        _vertexStack = []; // Start with an empty vertex stack
        _shapeMode = "simple"; // Assume simple mode initially
        
        if ((kind !== null) && (kind === 0)) {
          _shapeKind = 'points'; 
        } else if (kind === null){
          _shapeKind = 'poly'; // default to "poly" for polyline/polygon
        } else {
          _shapeKind = kind;
        }
      }
      _originalBeginShapeFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js vertex function to capture vertex coordinates for SVG export.
   * Pushes simple vertex data to the `_vertexStack` when recording is active.
   * @see {@link https://p5js.org/reference/p5/vertex/}
   */
  function overrideVertexFunction() {
    _originalVertexFunc = window.vertex;
    window.vertex = function(x, y) {
      if (_bRecordingSvg) {
        _vertexStack.push({ type: 'vertex', x, y });
      }
      _originalVertexFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js bezierVertex function to capture Bézier control points for SVG export.
   * Marks the current shape as complex and stores Bézier vertex data in the `_vertexStack`.
   * @see {@link https://p5js.org/reference/p5/bezierVertex/}
   */
  function overrideBezierVertexFunction() {
    // Override `bezierVertex()` and mark shape as complex
    _originalBezierVertexFunc = window.bezierVertex;
    window.bezierVertex = function(x2, y2, x3, y3, x4, y4) {
      if (_bRecordingSvg) {
        _shapeMode = 'complex'; // Switch to complex mode
        _vertexStack.push({ type: 'bezier', x2, y2, x3, y3, x4, y4 });
      }
      _originalBezierVertexFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js quadraticVertex function to capture quadratic Bézier control points for SVG export.
   * Marks the current shape as complex and stores quadratic vertex data in the `_vertexStack`.
   * @see {@link https://p5js.org/reference/p5/quadraticVertex/}
   */
  function overrideQuadraticVertexFunction() {
    // Override `quadraticVertex()` and mark shape as complex
    _originalQuadraticVertexFunc = window.quadraticVertex;
    window.quadraticVertex = function(cx, cy, x, y) {
      if (_bRecordingSvg) {
        _shapeMode = 'complex'; // Switch to complex mode
        _vertexStack.push({ type: 'quadratic', cx, cy, x, y });
      }
      _originalQuadraticVertexFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js curveVertex function to capture Catmull-Rom curve control points for SVG export.
   * Marks the current shape as complex and handles specific kludge logic for initial vertices.
   * @see {@link https://p5js.org/reference/p5/curveVertex/}
   */
  function overrideCurveVertexFunction() {
    // Override `curveVertex()` and mark shape as complex
    _originalCurveVertexFunc = window.curveVertex;
    window.curveVertex = function(x, y) {
      if (_bRecordingSvg) {
        _shapeMode = 'complex'; // Switch to complex mode
        
        let bDoKludge = true; // TODO: Revisit
        if (bDoKludge){
          if (_vertexStack.length === 1){
            if(_vertexStack[0].type === 'curve'){
              let x0 = _vertexStack[0].x; 
              let y0 = _vertexStack[0].y; 
              let dist01 = Math.hypot(x-x0, y-y0); 
              if (dist01 > 0){
                _vertexStack.shift();
                _vertexStack.push({ type: 'curve', x, y });
              }
            }
          }
        }
        _vertexStack.push({ type: 'curve', x, y });
      }
      _originalCurveVertexFunc.apply(this, arguments);
    };
  }

  /**
   * @private
   * Overrides the p5.js `endShape` function to capture SVG shape data for export.
   * This function modifies the behavior of `endShape()` to record vertex data
   * and transformation matrices when creating SVG output from p5.js shapes.
   * It handles various shape kinds such as points, lines, triangles, quads, etc.,
   * and pushes the recorded data to an internal command stack for later SVG rendering.
   * @see {@link https://p5js.org/reference/p5/endShape/}
   */
  function overrideEndShapeFunction() {
    _originalEndShapeFunc = window.endShape;
    window.endShape = function(mode) {
      if (_bRecordingSvg && _vertexStack.length > 0) {
        let transformMatrix = captureCurrentTransformMatrix();
        
        // Dispatch based on `_shapeKind`
        switch (_shapeKind) {
          case 'points':
            _commands.push({ type: 'points', vertices: [..._vertexStack], transformMatrix });
            break;
          case _p5Instance.LINES:
            _commands.push({ type: 'lines', vertices: [..._vertexStack], transformMatrix });
            break;
          case _p5Instance.TRIANGLES:
            _commands.push({ type: 'triangles', vertices: [..._vertexStack], transformMatrix });
            break;
          case _p5Instance.TRIANGLE_FAN:
            _commands.push({ type: 'triangle_fan', vertices: [..._vertexStack], transformMatrix });
            break;
          case _p5Instance.TRIANGLE_STRIP:
            _commands.push({ type: 'triangle_strip', vertices: [..._vertexStack], transformMatrix });
            break;
          case _p5Instance.QUADS:
            _commands.push({ type: 'quads', vertices: [..._vertexStack], transformMatrix });
            break;
          case _p5Instance.QUAD_STRIP:
            _commands.push({ type: 'quad_strip', vertices: [..._vertexStack], transformMatrix });
            break;
            
          case 'poly': 
          default:
            // Handle the default polyline/polygon behavior
            let isClosed = (mode === _p5Instance.CLOSE);
            if (_shapeMode === "simple") {
              _commands.push({
                type: 'polyline',
                vertices: [..._vertexStack],
                closed: isClosed,
                transformMatrix
              });
            } else {
              _commands.push({
                type: 'path',
                segments: [..._vertexStack],
                closed: isClosed,
                transformMatrix
              });
            }
            break;
        }

        _vertexStack = []; // Clear stack after pushing
        _shapeMode = 'simple'; // Reset _shapeMode
        _shapeKind = 'poly'; // Reset _shapeKind
      }
      _originalEndShapeFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js describe function to produce SVG description elements.
   * Captures the provided description text for embedding in the SVG as a <desc> element.
   * @see {@link https://p5js.org/reference/p5/describe/}
   */
  function overrideDescribeFunction() {
    _originalDescribeFunc = window.describe;
    window.describe = function(description) {
      if (_bRecordingSvg) {
        if (description && description.trim().length > 0){
          // Push a command to the stack for generating an SVG `desc` element
          _commands.push({ type: 'description', text: description });
        }
      }
      _originalDescribeFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js push function to capture transformations for SVG output.
   * Captures transformation state for recording SVG output by storing a 'push' command.
   * @see {@link https://p5js.org/reference/p5/push/}
   */
  function overridePushFunction(){
    _originalPushFunc = window.push;
    _bTransformsExist = true; 
    window.push = function() {
      if (_bRecordingSvg) {
        _commands.push({ type: 'push' });
      }
      _originalPushFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js pop function to capture transformations for SVG output.
   * Captures transformation state for recording SVG output by storing a 'pop' command.
   * @see {@link https://p5js.org/reference/p5/pop/}
   */
  function overridePopFunction(){
    _originalPopFunc = window.pop;
    _bTransformsExist = true; 
    window.pop = function() {
      if (_bRecordingSvg) {
        _commands.push({ type: 'pop' });
      }
      _originalPopFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js scale function to capture scaling transformations for SVG output.
   * Captures scaling parameters for recording SVG output by storing a 'scale' command.
   * @see {@link https://p5js.org/reference/p5/scale/}
   */
  function overrideScaleFunction(){
    _originalScaleFunc = window.scale;
    _bTransformsExist = true; 
    window.scale = function(sx, sy) {
      if (_bRecordingSvg) {
        _commands.push({ type: 'scale', sx, sy: sy || sx });
      }
      _originalScaleFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js translate function to capture translation transformations for SVG output.
   * Captures translation parameters for recording SVG output by storing a 'translate' command.
   * @see {@link https://p5js.org/reference/p5/translate/}
   */
  function overrideTranslateFunction(){
    _originalTranslateFunc = window.translate;
    _bTransformsExist = true; 
    window.translate = function(tx, ty) {
      if (_bRecordingSvg) {
        _commands.push({ type: 'translate', tx, ty });
      }
      _originalTranslateFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js rotate function to capture rotation transformations for SVG output.
   * Captures rotation angle for recording SVG output by storing a 'rotate' command.
   * https://p5js.org/reference/p5/rotate/
   */
  function overrideRotateFunction(){
    _originalRotateFunc = window.rotate;
    _bTransformsExist = true; 
    window.rotate = function(angle) {
      if (_bRecordingSvg) {
        _commands.push({ type: 'rotate', angle });
      }
      _originalRotateFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js shearX function to capture X-axis skew for SVG output.
   * Captures shearing angle for recording SVG output by storing a 'shearx' command.
   * @see {@link https://p5js.org/reference/p5/shearX/}
   */
  function overrideShearXFunction(){
    _originalShearXFunc = window.shearX;
    _bTransformsExist = true; 
    window.shearX = function(angle) {
      if (_bRecordingSvg) {
        _commands.push({ type: 'shearx', angle });
      }
      _originalShearXFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js shearY function to capture Y-axis skew for SVG output.
   * Captures shearing angle for recording SVG output by storing a 'sheary' command.
   * @see {@link https://p5js.org/reference/p5/shearY/}
   */
  function overrideShearYFunction(){
    _originalShearYFunc = window.shearY;
    _bTransformsExist = true; 
    window.shearY = function(angle) {
      if (_bRecordingSvg) {
        _commands.push({ type: 'sheary', angle });
      }
      _originalShearYFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js text function to capture SVG text commands for export.
   * Captures text content, position, font properties, alignment, and style for
   * later rendering in SVG format. Currently, it does not handle optional maxWidth
   * and maxHeight parameters and will issue a warning if these are provided.
   * @see {@link https://p5js.org/reference/p5/text/}
   */
  function overrideTextFunction() {
    _originalTextFunc = window.text;
    window.text = function(content, x, y, maxWidth, maxHeight) {
      if (_bRecordingSvg) {
        // Warn if maxWidth or maxHeight are provided
        if (typeof maxWidth !== 'undefined' || typeof maxHeight !== 'undefined') {
          console.warn('The SVG export function currently does not support maxWidth or maxHeight for text rendering.');
        }

        // Capture font, size, alignment, and style using _p5Instance
        const font = _p5Instance.textFont().font ? 
              _p5Instance.textFont().font.names.fullName : _p5Instance.textFont();
        const fontSize = _p5Instance.textSize();
        const alignX   = _p5Instance.textAlign().horizontal;
        const alignY   = _p5Instance.textAlign().vertical;
        const style    = _p5Instance.textStyle();
        const leading  = _p5Instance.textLeading(); 
        const ascent   = _p5Instance.textAscent(); 
        const descent  = _p5Instance.textDescent(); 
        let transformMatrix = captureCurrentTransformMatrix();

        // Push text command with properties
        _commands.push({ type: 'text', content, x, y, 
                        font, fontSize, alignX, alignY, style, leading, ascent, descent, transformMatrix });
      }
      _originalTextFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Exports the recorded p5.js drawing commands as an SVG file.
   * Generates an SVG string from the recorded drawing commands, 
   * including any applied transforms, styles, and shape data. 
   * Creates an SVG file and triggers a download for the generated 
   * SVG. Resets the internal recording state upon completion.
   */
  function exportSVG() {
    let svgContent = "";
    
    svgContent += `<!-- ${_svgFilename} -->\n`; 
    svgContent += `<!-- Generated using p5.plotSvg: -->\n`;
    svgContent += `<!-- A Plotter-Oriented SVG Exporter for p5.js -->\n`;
    svgContent += `<!-- ${new Date().toString()} -->\n`;
    svgContent += `<!-- DPI: ${_svgDPI} -->\n`;
    
    let widthInches = _p5Instance.width / _svgDPI;
    let heightInches = _p5Instance.height / _svgDPI;
    svgContent += `<svg xmlns="http://www.w3.org/2000/svg" `;
    svgContent += `width="${widthInches}in" height="${heightInches}in" `;
    svgContent += `viewBox="0 0 ${_p5Instance.width} ${_p5Instance.height}"`;
    svgContent += `>\n`;
    
    svgContent += `  <style>
      circle, ellipse, line, path, polygon, polyline, rect, quad, text {
        fill: none;
        stroke: ${_svgDefaultStrokeColor};
        stroke-width: ${_svgDefaultStrokeWeight};
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
      }
    </style>\n`;
    
    // The SVG file wraps everything in a group with a non-scaling stroke effect:
    svgContent += `<g vector-effect="non-scaling-stroke">\n`;
    _svgGroupLevel++;

    let transformGroupStack = []; 
    for (let cmd of _commands) {

      if (cmd.type === 'push' ||
          cmd.type === 'pop' ||
          cmd.type === 'scale' || 
          cmd.type === 'translate' || 
          cmd.type === 'rotate' || 
          cmd.type === 'shearx' || 
          cmd.type === 'sheary') {
      
        if (!_bFlattenTransforms && _bTransformsExist) {
          if (cmd.type === 'push') {
            // Open a new group
            svgContent += getIndentStr();
            svgContent += `<g>\n`;
            transformGroupStack.push(1); 
            _svgGroupLevel++;

          } else if (cmd.type === 'pop') {
            // Close the most recent group
            if (transformGroupStack.length > 0) {
              while (transformGroupStack[transformGroupStack.length - 1] > 0){
                transformGroupStack[transformGroupStack.length - 1]--; 
                _svgGroupLevel = Math.max(0, _svgGroupLevel - 1);
                svgContent += getIndentStr();
                svgContent += `</g>\n`;
              }
              transformGroupStack.pop();
            }

          } else {
            // Handle transformations by creating a group with a transform attribute
            let transformStr = '';
            if (cmd.type === 'scale') {
              transformStr = getSvgStrScale(cmd); 
            } else if (cmd.type === 'translate') {
              transformStr = getSvgStrTranslate(cmd);
            } else if (cmd.type === 'rotate') {
              transformStr = getSvgStrRotate(cmd); 
            } else if (cmd.type === 'shearx') {
              transformStr = getSvgStrShearX(cmd); 
            } else if (cmd.type === 'sheary') {
              transformStr = getSvgStrShearY(cmd);
            }

            svgContent += getIndentStr();
            svgContent += `<g transform="${transformStr}">\n`;
            if (transformGroupStack.length > 0){
              transformGroupStack[transformGroupStack.length - 1]++;
            } else {
              transformGroupStack.push(1);
            }
            _svgGroupLevel++;
          }
        }
        
      } else if (cmd.type === 'stroke') {
        handleSvgStrokeCommand(cmd);
      } else {
        svgContent += getIndentStr();
      }
      
      if (cmd.type === 'description') {
        svgContent += getSvgStrDescription(cmd); 
      } else if (cmd.type === 'beginGroup') {
        svgContent += getSvgStrBeginGroup(cmd);      
      } else if (cmd.type === 'endGroup') {
        svgContent += getSvgStrEndGroup(cmd);
      } else if (cmd.type === 'arc') {
        svgContent += getSvgStrArc(cmd);
      } else if (cmd.type === 'bezier') {
        svgContent += getSvgStrBezier(cmd); 
      } else if (cmd.type === 'circle') {
        svgContent += getSvgStrCircle(cmd);
      } else if (cmd.type === 'curve') {
        svgContent += getSvgStrCurve(cmd); 
      } else if (cmd.type === 'ellipse') {
        svgContent += getSvgStrEllipse(cmd); 
      } else if (cmd.type === 'line') {
        svgContent += getSvgStrLine(cmd);
      } else if (cmd.type === 'point') {
        svgContent += getSvgStrPoint(cmd);
      } else if (cmd.type === 'quad') {
        svgContent += getSvgStrQuad(cmd);
      } else if (cmd.type === 'rect') {
        svgContent += getSvgStrRect(cmd);
      } else if (cmd.type === 'triangle') {
        svgContent += getSvgStrTriangle(cmd);
      } else if (cmd.type === 'text'){
        svgContent += getSvgStrText(cmd);

      } else if (cmd.type === 'polyline'){
        svgContent += getSvgStrPoly(cmd);
      } else if (cmd.type === 'path'){
        svgContent += getSvgStrPoly(cmd);
      } else if (cmd.type === 'points') {
        svgContent += getSvgStrPoints(cmd);
      } else if (cmd.type === 'lines') {
        svgContent += getSvgStrLines(cmd);
      } else if (cmd.type === 'triangles') {
        svgContent += getSvgStrTriangles(cmd);
      } else if (cmd.type === 'triangle_fan') {
        svgContent += getSvgStrTriangleFan(cmd);
      } else if (cmd.type === 'triangle_strip') {
        svgContent += getSvgStrTriangleStrip(cmd);
      } else if (cmd.type === 'quads') {
        svgContent += getSvgStrQuads(cmd);
      } else if (cmd.type === 'quad_strip') {
        svgContent += getSvgStrQuadStrip(cmd);
      } 
    }
    
    // Close any remaining groups
    if (!_bFlattenTransforms) {
      while (transformGroupStack.length > 0) {
        while (transformGroupStack[transformGroupStack.length - 1] > 0){
          transformGroupStack[transformGroupStack.length - 1]--; 
          _svgGroupLevel = Math.max(0, _svgGroupLevel - 1);
          svgContent += getIndentStr();
          svgContent += `</g>\n`;
        }
        transformGroupStack.pop();
      }
    }
    
    svgContent += `</g>\n`; // Close the `non-scaling-stroke` group
    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = _svgFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    svgContent = ""; 
    _commands = [];
    _vertexStack = []; 
    _transformStack = [];
  }


  /**
   * @private
   * Generates an SVG scale transform string based on the given command object.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform}
   * @param {Object} cmd - The command object containing scale values.
   * @param {number} cmd.sx - The scale factor along the x-axis.
   * @param {number} cmd.sy - The scale factor along the y-axis.
   * @returns {string} The SVG scale transform string.
   */
  function getSvgStrScale(cmd){
    let sxStr = formatNumber(cmd.sx, _svgTransformPrecision);
    let syStr = formatNumber(cmd.sy, _svgTransformPrecision);
    let str = `scale(${sxStr}, ${syStr})`;
    return str; 
  }


  /**
   * @private
   * Generates an SVG translate transform string based on the given command object.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform}
   * @param {Object} cmd - The command object containing translation values.
   * @param {number} cmd.tx - The translation distance along the x-axis.
   * @param {number} cmd.ty - The translation distance along the y-axis.
   * @returns {string} The SVG translate transform string.
   */
  function getSvgStrTranslate(cmd){
    let txStr = formatNumber(cmd.tx, _svgTransformPrecision);
    let tyStr = formatNumber(cmd.ty, _svgTransformPrecision);
    let str = `translate(${txStr}, ${tyStr})`;
    return str; 
  }


  /**
   * @private
   * Generates an SVG rotate transform string based on the given command object.
   * Converts angles to degrees if necessary based on the current p5 angle mode.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform}
   * @param {Object} cmd - The command object containing rotation values.
   * @param {number} cmd.angle - The rotation angle.
   * @returns {string} The SVG rotate transform string.
   */
  function getSvgStrRotate(cmd){
    let angle = cmd.angle;
    if (_p5Instance.angleMode() === _p5Instance.RADIANS) {
      angle = (cmd.angle * 180) / Math.PI; // Convert radians to degrees
    }
    let angStr = formatNumber(angle, _svgTransformPrecision);
    let str = `rotate(${angStr})`;
    return str; 
  }


  /**
   * @private
   * Generates an SVG skewX transform string based on the given command object.
   * Converts angles to degrees if necessary based on the current p5 angle mode.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform}
   * @param {Object} cmd - The command object containing the shear angle.
   * @param {number} cmd.angle - The shear angle along the x-axis.
   * @returns {string} The SVG skewX transform string in degrees.
   */
  function getSvgStrShearX(cmd) {
    let angle = cmd.angle;
    if (_p5Instance.angleMode() === _p5Instance.RADIANS) {
      angle = (cmd.angle * 180) / Math.PI; // Convert radians to degrees
    }
    let angStr = formatNumber(angle, _svgTransformPrecision);
    let str = `skewX(${angStr})`;
    return str;
  }


  /**
   * @private
   * Generates an SVG skewY transform string based on the given command object.
   * Converts angles to degrees if necessary based on the current p5 angle mode.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform}
   * @param {Object} cmd - The command object containing the shear angle.
   * @param {number} cmd.angle - The shear angle along the y-axis.
   * @returns {string} The SVG skewY transform string in degrees.
   */
  function getSvgStrShearY(cmd) {
    let angle = cmd.angle;
    if (_p5Instance.angleMode() === _p5Instance.RADIANS) {
      angle = (cmd.angle * 180) / Math.PI; // Convert radians to degrees
    }
    let angStr = formatNumber(angle, _svgTransformPrecision);
    let str = `skewY(${angStr})`;
    return str;
  }


  /**
   * @private
   * Generates an SVG <desc> element string based on the given command object.
   * The <desc> element provides a textual description of the SVG content,
   * typically used for accessibility or metadata purposes.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Element/desc}
   * @param {Object} cmd - The command object containing description text.
   * @param {string} cmd.text - The description text to be included within the <desc> element.
   * @returns {string} The SVG <desc> element string with the provided description text.
   */
  function getSvgStrDescription(cmd){
    let str = `<desc>${cmd.text}</desc>\n`;
    return str; 
  } 


  /**
   * @private
   * Generates an SVG string to start a new user-defined group element.
   * If a group name is provided, adds it as an ID attribute for the group.
   * @param {Object} cmd - The command object containing group properties.
   * @param {string} [cmd.gname] - Optional group name used as the ID for the SVG group.
   * @returns {string} The SVG string to open a new group.
   */
  function getSvgStrBeginGroup(cmd){
    // Start a new group, adding an ID if `gname` is provided
    let str = cmd.gname ? `<g id="${cmd.gname}">\n` : `<g>\n`;
    _svgGroupLevel++;
    return str; 
  }


  /**
   * @private
   * Generates an SVG string to end the current group element.
   * Decreases the SVG group level counter to track nested groups.
   * @param {Object} cmd - The command object (not used but included for consistency).
   * @returns {string} The SVG string to close the group.
   */
  function getSvgStrEndGroup(cmd){
    // Close the current group
    _svgGroupLevel = Math.max(0, _svgGroupLevel-1); 
    let str = `</g>\n`;
    return str; 
  }


  /**
   * @private
   * Generates an SVG <path> element string representing an elliptical arc, 
   * based on the given command object. Supports optional modes for chord and pie-slice shapes.
   * @param {Object} cmd - The command object containing arc parameters and optional mode.
   * @returns {string} The SVG <path> element string with formatted arc data.
   */
  function getSvgStrArc(cmd) {
    // Generate the base arc path using p5ArcToSvgPath()
    let svgArcData = p5ArcToSvgPath(cmd.x, cmd.y, cmd.w, cmd.h, cmd.start, cmd.stop);
    let transformStr = generateTransformString(cmd);
    let styleStr = getSvgStrStroke();
    let str = `<path d="` + svgArcData;

    // Extract the end point of the arc from svgArcData
    let endPoint = svgArcData.split(" ").slice(-2).join(" ");

    if (cmd.mode === _p5Instance.CHORD) {
      // Add a line segment to connect the arc endpoints
      str += ` L ${endPoint}`;
      str += ` Z`; // Close the path

    } else if (cmd.mode === _p5Instance.PIE) {
      // Add lines from the center to the end point to form a "pie" slice
      let ctrX = formatNumber(cmd.x); 
      let ctrY = formatNumber(cmd.y); 
      str += ` L ${endPoint} L ${ctrX} ${ctrY} Z`; // Connect end to center
    }

    str += `"${styleStr}${transformStr}/>\n`;
    return str;
  }


  /**
   * @private
   * Generates an SVG <path> element string representing a cubic Bézier curve, 
   * based on the given command object.
   * @param {Object} cmd - The command object containing Bézier curve control points.
   * @returns {string} The SVG <path> element string with formatted control points.
   */
  function getSvgStrBezier(cmd){
    let x1Str = formatNumber(cmd.x1);
    let y1Str = formatNumber(cmd.y1);
    let x2Str = formatNumber(cmd.x2);
    let y2Str = formatNumber(cmd.y2);
    let x3Str = formatNumber(cmd.x3);
    let y3Str = formatNumber(cmd.y3);
    let x4Str = formatNumber(cmd.x4);
    let y4Str = formatNumber(cmd.y4);
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let str = `<path d="M ${x1Str},${y1Str} C ${x2Str},${y2Str} ${x3Str},${y3Str} ${x4Str},${y4Str}"${styleStr}${transformStr}/>\n`;
    return str; 
  }


  /**
   * @private
   * Generates an SVG <circle> element string based on the given command object.
   * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element/circle
   * @param {Object} cmd - The command object containing circle parameters.
   * @returns {string} The SVG <circle> element string with formatted position and radius.
   */
  function getSvgStrCircle(cmd){
    let xStr = formatNumber(cmd.x);
    let yStr = formatNumber(cmd.y);
    let rStr = formatNumber(cmd.d/2.0);
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let str = `<circle cx="${xStr}" cy="${yStr}" r="${rStr}"${styleStr}${transformStr}/>\n`;
    return str; 
  }


  /**
   * @private
   * Generates an SVG <path> element string representing a Catmull-Rom curve segment.
   * @param {Object} cmd - The command object containing control points for the curve.
   * @returns {string} The SVG <path> element string with the necessary Bézier segment.
   */
  function getSvgStrCurve(cmd){
    // Prepare the control points for the Catmull-Rom to Bézier conversion
    let crp = [cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x3, cmd.y3, cmd.x4, cmd.y4];
    let bClosed = false; // `false` for an open curve

    // Convert to Bézier segments
    let bezierSegments = catmullRom2bezier(crp, bClosed);

    // The segment we need is the one between (x2, y2) and (x3, y3)
    let targetSegment = bezierSegments[1];

    // Format the starting point (x2, y2)
    let x2Str = formatNumber(cmd.x2);
    let y2Str = formatNumber(cmd.y2);

    // Format the control points and endpoint for the Bézier segment
    let cx1Str = formatNumber(targetSegment[0]);
    let cy1Str = formatNumber(targetSegment[1]);
    let cx2Str = formatNumber(targetSegment[2]);
    let cy2Str = formatNumber(targetSegment[3]);
    let x3Str = formatNumber(targetSegment[4]);
    let y3Str = formatNumber(targetSegment[5]);
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);

    // Construct the SVG path string with only the necessary segment
    let str = `<path d="M ${x2Str},${y2Str} C ${cx1Str},${cy1Str} ${cx2Str},${cy2Str} ${x3Str},${y3Str}"${styleStr}${transformStr}/>\n`;
    return str;
  }


  /**
   * @private
   * Generates an SVG <ellipse> element string based on the given command object.
   * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element/ellipse 
   * @param {Object} cmd - The command object containing ellipse parameters.
   * @returns {string} The SVG <ellipse> element string with formatted center and radii.
   */
  function getSvgStrEllipse(cmd){
    let xStr = formatNumber(cmd.x);
    let yStr = formatNumber(cmd.y);
    let rxStr = formatNumber(cmd.w/2);
    let ryStr = formatNumber(cmd.h/2);
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let str = `<ellipse cx="${xStr}" cy="${yStr}" rx="${rxStr}" ry="${ryStr}"${styleStr}${transformStr}/>\n`;
    return str; 
  }


  /**
   * @private
   * Generates an SVG <line> element string based on the given command object.
   * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element/line
   * @param {Object} cmd - The command object containing line endpoints.
   * @returns {string} The SVG <line> element string with formatted endpoints.
   */
  function getSvgStrLine(cmd) {
    let x1Str = formatNumber(cmd.x1);
    let y1Str = formatNumber(cmd.y1);
    let x2Str = formatNumber(cmd.x2);
    let y2Str = formatNumber(cmd.y2);
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let str = `<line x1="${x1Str}" y1="${y1Str}" x2="${x2Str}" y2="${y2Str}"${styleStr}${transformStr}/>\n`;
    return str;
  }


  /**
   * @private
   * Generates an SVG <circle> element string representing a point, based on the given command.
   * @param {Object} cmd - The command object containing point position and radius.
   * @returns {string} The SVG <circle> element string with formatted position and radius.
   */
  function getSvgStrPoint(cmd){
    let xStr = formatNumber(cmd.x);
    let yStr = formatNumber(cmd.y);
    let rStr = formatNumber(cmd.radius);
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let str = `<circle cx="${xStr}" cy="${yStr}" r="${rStr}"${styleStr}${transformStr}/>\n`;
    return str; 
  }


  /**
   * @private
   * Generates an SVG <polygon> element string representing a quadrilateral, 
   * based on the given command object.
   * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element/polygon
   * @param {Object} cmd - The command object containing quad vertices.
   * @returns {string} The SVG <polygon> element string with formatted vertex coordinates.
   */
  function getSvgStrQuad(cmd){
    let x1Str = formatNumber(cmd.x1);
    let y1Str = formatNumber(cmd.y1);
    let x2Str = formatNumber(cmd.x2);
    let y2Str = formatNumber(cmd.y2);
    let x3Str = formatNumber(cmd.x3);
    let y3Str = formatNumber(cmd.y3);
    let x4Str = formatNumber(cmd.x4);
    let y4Str = formatNumber(cmd.y4);
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let str = `<polygon points="${x1Str},${y1Str} ${x2Str},${y2Str} ${x3Str},${y3Str} ${x4Str},${y4Str}"${styleStr}${transformStr}/>\n`;
    return str; 
  }


  /**
   * @private
   * Generates an SVG <rect> or <path> element string for a rectangle, based on the given command object.
   * Supports rectangles with individual or uniform corner radii.
   * @param {Object} cmd - The command object containing rectangle parameters and optional corner radii.
   * @returns {string} The SVG <rect> or <path> element string with formatted position, size, and corners.
   */
  function getSvgStrRect(cmd) {
    let xStr = formatNumber(cmd.x);
    let yStr = formatNumber(cmd.y);
    let wStr = formatNumber(cmd.w);
    let hStr = formatNumber(cmd.h);
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let maxRadius = Math.min(cmd.w, cmd.h) / 2;
    let str = "";
    
    if (cmd.tl !== undefined && cmd.tr !== undefined && 
        cmd.br !== undefined && cmd.bl !== undefined) {

      // If all four are exactly equal, do a simple rounded rectangle
      if (cmd.tl === cmd.tr && cmd.tr === cmd.br && cmd.br === cmd.bl) {
        cmd.tl = Math.min(cmd.tl, maxRadius);
        let rStr = formatNumber(cmd.tl);
        str = `<rect x="${xStr}" y="${yStr}" width="${wStr}" height="${hStr}" rx="${rStr}" ry="${rStr}"${styleStr}${transformStr}/>\n`;

      } else {
        // Constrain corner radii: tl <= min(w, h)/2, tr <= min(w, h)/2, etc.
        cmd.tl = Math.min(cmd.tl, maxRadius);
        cmd.tr = Math.min(cmd.tr, maxRadius);
        cmd.br = Math.min(cmd.br, maxRadius);
        cmd.bl = Math.min(cmd.bl, maxRadius);

        // Individual corner radii specified; use a path
        let xtl = cmd.x + cmd.tl;
        let ytl = cmd.y + cmd.tl;
        let xtr = cmd.x + cmd.w - cmd.tr;
        let ytr = cmd.y + cmd.tr;
        let xbr = cmd.x + cmd.w - cmd.br;
        let ybr = cmd.y + cmd.h - cmd.br;
        let xbl = cmd.x + cmd.bl;
        let ybl = cmd.y + cmd.h - cmd.bl;

        // Calculate control points for each corner, using the multiplier c
        // See: https://spencermortensen.com/articles/bezier-circle/
        const c = 0.55191502449351; // For cubic Bézier arc approximation
        let ctlX = cmd.tl * c;
        let ctlY = cmd.tl * c;
        let ctrX = cmd.tr * c;
        let ctrY = cmd.tr * c;
        let cbrX = cmd.br * c;
        let cbrY = cmd.br * c;
        let cblX = cmd.bl * c;
        let cblY = cmd.bl * c;

        // Construct the path using cubic Bézier curves for each corner
        str = `<path d="M ${formatNumber(xtl)},${formatNumber(cmd.y)} ` +
          `H ${formatNumber(xtr)} ` +
          `C ${formatNumber(xtr + ctrX)},${formatNumber(cmd.y)}` + 
          ` ${formatNumber(cmd.x + cmd.w)},${formatNumber(ytr - ctrY)}`+
          ` ${formatNumber(cmd.x + cmd.w)},${formatNumber(ytr)} ` + // Top-right corner
          `V ${formatNumber(ybr)} ` +
          `C ${formatNumber(cmd.x + cmd.w)},${formatNumber(ybr + cbrY)}`+
          ` ${formatNumber(xbr + cbrX)},${formatNumber(cmd.y + cmd.h)}`+
          ` ${formatNumber(xbr)},${formatNumber(cmd.y + cmd.h)} ` + // Bottom-right corner
          `H ${formatNumber(xbl)} ` +
          `C ${formatNumber(xbl - cblX)},${formatNumber(cmd.y + cmd.h)}`+
          ` ${formatNumber(cmd.x)},${formatNumber(ybl + cblY)}`+
          ` ${formatNumber(cmd.x)},${formatNumber(ybl)} ` + // Bottom-left corner
          `V ${formatNumber(ytl)} ` +
          `C ${formatNumber(cmd.x)},${formatNumber(ytl - ctlY)}`+
          ` ${formatNumber(xtl - ctlX)},${formatNumber(cmd.y)}`+
          ` ${formatNumber(xtl)},${formatNumber(cmd.y)} Z"${styleStr}${transformStr}/>\n`;
      }
      
    } else if (cmd.tl !== undefined) {
      // Use a single rounded radius for all corners
      cmd.tl = Math.min(cmd.tl, maxRadius);
      let rStr = formatNumber(cmd.tl);
      str = `<rect x="${xStr}" y="${yStr}" width="${wStr}" height="${hStr}" rx="${rStr}" ry="${rStr}"${styleStr}${transformStr}/>\n`;
      
    } else {
      // Standard rectangle without rounded corners
      str = `<rect x="${xStr}" y="${yStr}" width="${wStr}" height="${hStr}"${styleStr}${transformStr}/>\n`;
    }
    return str;
  }


  /**
   * @private
   * Generates an SVG <polygon> element string representing a triangle, based on the given command object.
   * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element/polygon
   * @param {Object} cmd - The command object containing triangle vertices.
   * @returns {string} The SVG <polygon> element string with formatted vertex coordinates.
   */
  function getSvgStrTriangle(cmd){
    let x1Str = formatNumber(cmd.x1);
    let y1Str = formatNumber(cmd.y1);
    let x2Str = formatNumber(cmd.x2);
    let y2Str = formatNumber(cmd.y2);
    let x3Str = formatNumber(cmd.x3);
    let y3Str = formatNumber(cmd.y3);
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let str = `<polygon points="${x1Str},${y1Str} ${x2Str},${y2Str} ${x3Str},${y3Str}"${styleStr}${transformStr}/>\n`;
    return str; 
  }


  /**
   * Sets the default stroke weight for SVG elements.
   * @param {number} wei - The stroke weight to set.
   */
  p5plotSvg.setSvgDefaultStrokeWeight = function(wei) {
    if (typeof wei === 'number' && wei >= 0) {
      _svgDefaultStrokeWeight = wei;
    } else {
      console.warn("Invalid stroke weight. Please provide a positive number.");
    }
  }


  /**
   * Sets the default stroke color for SVG elements.
   * @param {string} col - The stroke color to set, in valid CSS color format.
   */
  p5plotSvg.setSvgDefaultStrokeColor = function(col) {
    // Use a temporary element to validate if the provided color is valid
    const isColorValid = (color) => {
      const temp = document.createElement('div');
      temp.style.color = color;
      return temp.style.color !== ''; // If valid, the style will apply
    };

    if (typeof col === 'string' && isColorValid(col)) {
      _svgDefaultStrokeColor = col;
    } else {
      console.warn("Invalid stroke color. Provide a valid CSS color string (e.g., 'red', '#ff0000', 'rgb(255,0,0)').");
    }
  }


  /**
   * @public
   * Sets the resolution for the exported SVG file in dots per inch (DPI).
   * This value is used to determine the scaling of units (pixels to physical dimensions) in the SVG output.
   * @param {number} dpi - The resolution in dots per inch. Must be a positive number.
   */
  p5plotSvg.setSvgResolutionDPI = function(dpi) {
    if (typeof dpi === 'number' && dpi > 0) {
      _svgDPI = dpi;
    } else {
      console.warn("Invalid DPI value. Please provide a positive number.");
    }
  }


  /**
   * Sets the type and amount of indentation used for formatting SVG output.
   * The function allows for spaces, tabs, or no indentation.
   * @param {string} itype - The type of indentation to use. Valid values are 
   * 'SVG_INDENT_SPACES', 'SVG_INDENT_TABS', or 'SVG_INDENT_NONE'.
   * @param {number} [inum] - Optional number of spaces or tabs to use for indentation. 
   * Must be a non-negative integer if provided. Defaults to 2 for spaces and 1 for tabs.
   */
  p5plotSvg.setSvgIndent = function(itype, inum) {
    // Set indent type if it matches one of the predefined constants
    if (itype === p5plotSvg.SVG_INDENT_SPACES || 
        itype === p5plotSvg.SVG_INDENT_TABS || 
        itype === p5plotSvg.SVG_INDENT_NONE) {
      _svgIndentType = itype;
    } else {
      console.warn("Invalid indent type. Use SVG_INDENT_SPACES, SVG_INDENT_TABS, or SVG_INDENT_NONE.");
    }
    
    // Set indent amount if `inum` is provided
    if (inum !== undefined && Number.isInteger(inum) && inum >= 0) {
      if (_svgIndentType === p5plotSvg.SVG_INDENT_NONE){
        _svgIndentAmount = 0; 
      } else {
        _svgIndentAmount = inum;
      }
    } else {
      // Defaults
      if (_svgIndentType === p5plotSvg.SVG_INDENT_SPACES){
        _svgIndentAmount = 2; 
      } else if (_svgIndentType === p5plotSvg.SVG_INDENT_TABS){
        _svgIndentAmount = 1; 
      } else if (_svgIndentType === p5plotSvg.SVG_INDENT_NONE){
        _svgIndentAmount = 0; 
      }
    }
  }


  /**
   * @private
   * Generates a string representing the current level of indentation 
   * based on the set indentation type and amount. This is used to 
   * format SVG output.
   * @returns {string} A string containing the appropriate number of spaces 
   * or tabs for the current indentation level, or an empty string if no 
   * indentation is set.
   */
  function getIndentStr(){
    let out = ''; 
    if ((_svgIndentType != p5plotSvg.SVG_INDENT_NONE) && (_svgIndentAmount > 0)){
      let c = (_svgIndentType === p5plotSvg.SVG_INDENT_SPACES) ? ' ' : '\t'; 
      if (_svgGroupLevel > 0){
        for (let i=0; i<_svgGroupLevel; i++){
          for (let j=0; j<_svgIndentAmount; j++){
            out += c; 
          }
        }
      }
    }
    return out; 
  }


  /**
   * Set whether or not to use a stack to encode matrix transforms. 
   * setSvgFlattenTransforms(true) -- larger SVG files, greater fidelity to original
   * setSvgFlattenTransforms(false) -- smaller SVG files, potentially less fidelity
   */
  p5plotSvg.setSvgFlattenTransforms = function(b) {
    if (b === true){
      _bFlattenTransforms = true; 
    } else {
      _bFlattenTransforms = false; 
    }
  }


  /**
   * Sets the output precision for graphics coordinates in SVGs by adjusting
   * the number of decimal digits used when formatting values.
   * @param {number} p - The desired number of decimal digits for coordinates.
   * Must be a non-negative integer. If an invalid value is provided, a warning is issued.
   */
  p5plotSvg.setSvgCoordinatePrecision = function(p) {
    // Check if p` is a number and an integer
    if (typeof p === 'number' && Number.isInteger(p) && (p >= 0)) {
      _svgCoordPrecision = p;
    } else {
      console.warn('Invalid precision value.');
    }
  }


  /**
   * Sets the output precision for matrix-transform values in SVGs by adjusting
   * the number of decimal digits used when formatting rotations, translations, etc.
   * @param {number} p - The desired number of decimal digits for matrix values.
   * Must be a non-negative integer. If an invalid value is provided, a warning is issued.
   */
  p5plotSvg.setSvgTransformPrecision = function(p) {
    // Check if p` is a number and an integer
    if (typeof p === 'number' && Number.isInteger(p) && (p >= 0)) {
      _svgTransformPrecision = p;
    } else {
      console.warn('Invalid precision value.');
    }
  }


  /**
   * Sets the radius for points (rendered as tiny circles) in the SVG output.
   * @param {number} radius - The desired radius for points, specified as a positive number.
   * If an invalid value (non-positive or non-number) is provided, a warning is issued.
   */
  p5plotSvg.setSvgPointRadius = function(radius) {
    if (typeof radius === 'number' && radius > 0) {
      _svgPointRadius = radius;
    } else {
      console.warn("Invalid radius. Please provide a positive number.");
    }
  }


  /**
   * Begins a new user-defined grouping of SVG elements.
   * Optionally associates a group name to the SVG group.
   * Be sure to call `endSvgGroup()` later or the SVG file will report errors.
   * @param {string} [gname] - Optional group name used as an ID for the SVG group.
   */
  p5plotSvg.beginSvgGroup = function(gname) {
    _commands.push({ type: 'beginGroup', gname });
  }


  /**
   * Ends the current user-defined group of SVG elements.
   */
  p5plotSvg.endSvgGroup = function() {
    // Push an 'endGroup' command to signify closing the group
    _commands.push({ type: 'endGroup' });
  }


  /**
   * @private
   * Converts a p5.js-style arc into an SVG elliptical arc path string.
   * Handles discrepancies between p5.js and SVG elliptical arc conventions,
   * including angle transformations and aspect ratio adjustments.
   * Converts degrees to radians depending on p5's angleMode(). 
   *
   * @param {number} x - The x-coordinate of the arc's center.
   * @param {number} y - The y-coordinate of the arc's center.
   * @param {number} w - The width (diameter) of the arc.
   * @param {number} h - The height (diameter) of the arc.
   * @param {number} start - The starting angle of the arc
   * @param {number} stop - The stopping angle of the arc
   * @returns {string} The SVG path data string for the arc.
   */
  function p5ArcToSvgPath(x, y, w, h, start, stop) {
    let rx = w / 2;
    let ry = h / 2;

    let startRadians = start;
    let stopRadians = stop;
    if (_p5Instance.angleMode() === 'degrees') {
      startRadians = degreesToRadians(start);
      stopRadians = degreesToRadians(stop);
    }
    
    // Cope with discrepancies between how p5 & SVG do elliptical arcs.
    // p5 sets the angle absolutely; SVG stretches the angle by aspect ratio. 
    if ((h > 0) && (w > 0) && (w != h)){
      let dxA = cos(startRadians); 
      let dyA = sin(startRadians); 
      startRadians = atan2(dyA, dxA/(w/h)); 
      
      let dxB = cos(stopRadians); 
      let dyB = sin(stopRadians); 
      stopRadians = atan2(dyB, dxB/(w/h)); 
    }

    // Calculate start and end points
    let startX = x + rx * Math.cos(startRadians);
    let startY = y + ry * Math.sin(startRadians);
    let endX = x + rx * Math.cos(stopRadians);
    let endY = y + ry * Math.sin(stopRadians);

    // Calculate the absolute angle difference, normalize for full circle
    let deltaAngle = (stopRadians - startRadians) % (2 * Math.PI);
    if (deltaAngle < 0) deltaAngle += 2 * Math.PI;

    // Determine if the arc is greater than 180° (large-arc-flag)
    let largeArcFlag = (deltaAngle > Math.PI) ? 1 : 0;

    // Set the sweep flag based on the direction of the angle
    let sweepFlag = deltaAngle > 0 ? 1 : 0;

    // Format numbers for SVG path data
    let rxStr = formatNumber(rx);
    let ryStr = formatNumber(ry);
    let sxStr = formatNumber(startX);
    let syStr = formatNumber(startY);
    let exStr = formatNumber(endX);
    let eyStr = formatNumber(endY);

    // Generate the SVG path data string
    return `M ${sxStr} ${syStr} A ${rxStr} ${ryStr} 0 ${largeArcFlag} ${sweepFlag} ${exStr} ${eyStr}`;
  }


  function adjustControlPointsForTightness(x1, y1, x2, y2, x3, y3, x4, y4, tightness) {
    let adjustedX1 = x1 + (x3 - x1) * tightness;
    let adjustedY1 = y1 + (y3 - y1) * tightness;
    let adjustedX4 = x4 + (x2 - x4) * tightness;
    let adjustedY4 = y4 + (y2 - y4) * tightness;
    return [adjustedX1, adjustedY1, x2, y2, x3, y3, adjustedX4, adjustedY4];
  }


  // https://github.com/processing/p5.js/blob/e32b45367baad694b1f4eeec0586b910bfcf0724/src/typography/p5.Font.js#L1099
  function catmullRom2bezier(crp, z) {
    const d = [];
    for (let i = 0, iLen = crp.length; iLen - 2 * !z > i; i += 2) {
      const p = [
        { x: crp[i - 2], y: crp[i - 1] },
        { x: crp[i + 0], y: crp[i + 1] },
        { x: crp[i + 2], y: crp[i + 3] },
        { x: crp[i + 4], y: crp[i + 5] },
        ];
      if (z) {
        if (!i) {
          p[0] = { x: crp[iLen - 2], y: crp[iLen - 1] };
        } else if (iLen - 4 === i) {
          p[3] = { x: crp[0], y: crp[1] };
        } else if (iLen - 2 === i) {
          p[2] = { x: crp[0], y: crp[1] };
          p[3] = { x: crp[2], y: crp[3] };
        }
      } else {
        if (iLen - 4 === i) {
          p[3] = p[2];
        } else if (!i) {
          p[0] = { x: crp[i], y: crp[i + 1] };
        }
      }
      d.push([
        (-p[0].x + 6.0 * p[1].x + p[2].x) / 6.0,
        (-p[0].y + 6.0 * p[1].y + p[2].y) / 6.0,
        ( p[1].x + 6.0 * p[2].x - p[3].x) / 6.0,
        ( p[1].y + 6.0 * p[2].y - p[3].y) / 6.0,
        ( p[2].x),
        ( p[2].y),
        ]);
    }
    return d;
  }


  /**
   * @private
   * Generates an SVG <polyline>, <polygon>, or <path> element string based on the given command object.
   * Handles both simple polylines/polygons and complex paths with mixed vertex types.
   * @param {Object} cmd - The command object containing vertices, segments, and shape properties.
   * @returns {string} The SVG element string representing the polyline, polygon, or complex path.
   */
  function getSvgStrPoly(cmd) {
    let str = ""; 
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    
    if (cmd.type === 'polyline') {
      // Simple case: use polyline or polygon
      let points = "";
      for (let i = 0; i < cmd.vertices.length; i++) {
        let v = cmd.vertices[i];
        points += formatNumber(v.x) + "," + formatNumber(v.y);
        if (i < cmd.vertices.length - 1) { points += " ";}
      }
      
      if (cmd.closed) {
        str += `<polygon points="${points}"${styleStr}${transformStr}/>\n`;
      } else {
        str += `<polyline points="${points}"${styleStr}${transformStr}/>\n`;
      }
      
    } else if (cmd.type === 'path') {
      // Complex case: construct path data with mixed vertex types
      let d = `M ${formatNumber(cmd.segments[0].x)},${formatNumber(cmd.segments[0].y)}`;
    
      for (let i = 1; i < cmd.segments.length; i++) {
        let seg = cmd.segments[i];
        if (seg.type === 'vertex') {
          d += ` L ${formatNumber(seg.x)},${formatNumber(seg.y)}`;
        } else if (seg.type === 'bezier') {
          d += ` C ${formatNumber(seg.x2)},${formatNumber(seg.y2)}`; 
          d +=   ` ${formatNumber(seg.x3)},${formatNumber(seg.y3)}`;
          d +=   ` ${formatNumber(seg.x4)},${formatNumber(seg.y4)}`;
        } else if (seg.type === 'quadratic') {
          d += ` Q ${formatNumber(seg.cx)},${formatNumber(seg.cy)}`;
          d +=   ` ${formatNumber(seg.x)},${formatNumber(seg.y)}`;
        } else if (seg.type === 'curve') {
          // Convert Catmull-Rom to cubic Bezier and add
          
          if (i > 2){
            let sx1 = cmd.segments[Math.max(0, i - 3)].x; 
            let sy1 = cmd.segments[Math.max(0, i - 3)].y;
            let sx2 = cmd.segments[Math.max(0, i - 2)].x; 
            let sy2 = cmd.segments[Math.max(0, i - 2)].y;
            let sx3 = cmd.segments[            i - 1 ].x; 
            let sy3 = cmd.segments[            i - 1 ].y;
            let sx4 = cmd.segments[            i     ].x; 
            let sy4 = cmd.segments[            i     ].y;
            let crp = [sx1,sy1, sx2,sy2, sx3,sy3, sx4,sy4]; 

            let bClosedCatmull = false;
            let bezierSegments = catmullRom2bezier(crp, bClosedCatmull);
            let targetSegment = bezierSegments[1];

            let x2Str  = formatNumber(sx2);
            let y2Str  = formatNumber(sy2);
            let cx1Str = formatNumber(targetSegment[0]);
            let cy1Str = formatNumber(targetSegment[1]);
            let cx2Str = formatNumber(targetSegment[2]);
            let cy2Str = formatNumber(targetSegment[3]);
            let x3Str  = formatNumber(targetSegment[4]);
            let y3Str  = formatNumber(targetSegment[5]);
            
            d += ` C`;
            d += ` ${cx1Str},${cy1Str}`;
            d += ` ${cx2Str},${cy2Str}`; 
            d += ` ${x3Str },${y3Str }`;
          }
          
        }
      }
      if (cmd.closed) d += ' Z'; // Close path if needed
      str += `<path d="${d}"${styleStr}${transformStr}/>\n`;
    }
    return str;
  }


  /**
   * @private
   * Generates an SVG group element string representing a set of points,
   * based on the given command object. Handles beginShape(POINTS) in p5.js.
   * @param {Object} cmd - The command object containing vertices.
   * @returns {string} The SVG group element string with formatted points.
   */
  function getSvgStrPoints(cmd) {
    // handle beginShape(POINTS)
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let pointsStr = `<g id="POINTS_${_pointsSetCount}"${styleStr}${transformStr}>\n`;

    _svgGroupLevel++; 
    _pointsSetCount++;
    
    let rStr = formatNumber(_svgPointRadius);
    for (let i = 0; i < cmd.vertices.length; i++) {
      const v = cmd.vertices[i];
      let xStr = formatNumber(v.x);
      let yStr = formatNumber(v.y);
      pointsStr += getIndentStr();
      pointsStr += `<circle cx="${xStr}" cy="${yStr}" r="${rStr}"/>\n`;
    }
    
    _svgGroupLevel--; 
    pointsStr += getIndentStr();
    pointsStr += `</g>\n`;
    return pointsStr;
  }


  /**
   * @private
   * Generates an SVG group element string representing a set of lines,
   * based on the given command object. Handles beginShape(LINES) in p5.js.
   * @param {Object} cmd - The command object containing vertices.
   * @returns {string} The SVG group element string with formatted lines.
   */
  function getSvgStrLines(cmd) {
    // handle beginShape(LINES)
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let linesStr = "";
    linesStr += `<g id="LINES_${_linesSetCount}"${styleStr}${transformStr}>\n`;
    _svgGroupLevel++; 
    _linesSetCount++;
    
    if (cmd.vertices.length > 1){
      for (let i = 0; i < cmd.vertices.length-1; i+=2) {
        let x1Str = formatNumber(cmd.vertices[i].x);
        let y1Str = formatNumber(cmd.vertices[i].y);
        let x2Str = formatNumber(cmd.vertices[i+1].x);
        let y2Str = formatNumber(cmd.vertices[i+1].y);
        
        linesStr += getIndentStr();
        linesStr += `<line x1="${x1Str}" y1="${y1Str}" `;
        linesStr += `x2="${x2Str}" y2="${y2Str}"/>\n`;
      }
    }
    
    _svgGroupLevel--; 
    linesStr += getIndentStr();
    linesStr += `</g>\n`;
    return linesStr;
  }


  /**
   * @private
   * Generates an SVG group element string representing a set of triangles, 
   * based on the given command object.Handles beginShape(TRIANGLES) in p5.js.
   * @param {Object} cmd - The command object containing vertices.
   * @returns {string} The SVG group element string with formatted triangles.
   */
  function getSvgStrTriangles(cmd) {
    // handle beginShape(TRIANGLES)
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let trianglesStr = "";
    trianglesStr += `<g id="TRIANGLES_${_trianglesSetCount}"${styleStr}${transformStr}>\n`;
    _svgGroupLevel++; 
    _trianglesSetCount++;
    
    if (cmd.vertices.length >= 3){
      for (let i = 0; i < cmd.vertices.length - 2; i += 3) {
        let x1Str = formatNumber(cmd.vertices[i  ].x);
        let y1Str = formatNumber(cmd.vertices[i  ].y);
        let x2Str = formatNumber(cmd.vertices[i+1].x);
        let y2Str = formatNumber(cmd.vertices[i+1].y);
        let x3Str = formatNumber(cmd.vertices[i+2].x);
        let y3Str = formatNumber(cmd.vertices[i+2].y);
        let triStr = `${x1Str},${y1Str} ${x2Str},${y2Str} ${x3Str},${y3Str}`;
        
        trianglesStr += getIndentStr();
        trianglesStr += `<polygon points="${triStr}"/>\n`;
      }
    }
    
    _svgGroupLevel--; 
    trianglesStr += getIndentStr();
    trianglesStr += `</g>\n`;
    return trianglesStr;
  }


  /**
   * @private
   * Generates an SVG group element string representing a triangle fan, 
   * based on the given command object. Handles beginShape(TRIANGLE_FAN) in p5.js.
   * @param {Object} cmd - The command object containing vertices.
   * @returns {string} The SVG group element string with formatted triangles.
   */
  function getSvgStrTriangleFan(cmd) {
    // handle beginShape(TRIANGLE_FAN)
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let fanStr = "";
    fanStr += `<g id="TRIANGLE_FAN_${_triangleFanSetCount}"${styleStr}${transformStr}>\n`;
    _svgGroupLevel++; 
    _triangleFanSetCount++;
    
    if (cmd.vertices.length >= 3){
      let x0Str = formatNumber(cmd.vertices[0].x);
      let y0Str = formatNumber(cmd.vertices[0].y);
      for (let i = 1; i < cmd.vertices.length - 1; i++) {
        let x1Str = formatNumber(cmd.vertices[i  ].x);
        let y1Str = formatNumber(cmd.vertices[i  ].y);
        let x2Str = formatNumber(cmd.vertices[i+1].x);
        let y2Str = formatNumber(cmd.vertices[i+1].y);
        let pointsStr = `${x0Str},${y0Str} ${x1Str},${y1Str} ${x2Str},${y2Str}`;
        
        fanStr += getIndentStr();
        fanStr += `<polygon points="${pointsStr}"/>\n`;
      }
    }
    
    _svgGroupLevel--; 
    fanStr += getIndentStr();
    fanStr += `</g>\n`;
    return fanStr;
  }


  /**
   * @private
   * Generates an SVG group element string representing a triangle strip,
   * based on the given command object. Handles beginShape(TRIANGLE_STRIP) in p5.js.
   * @param {Object} cmd - The command object containing vertices.
   * @returns {string} The SVG group element string with formatted triangles.
   */
  function getSvgStrTriangleStrip(cmd) {
    // handle beginShape(TRIANGLE_STRIP)
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let triStripStr = "";
    triStripStr += `<g id="TRIANGLE_STRIP_${_triangleStripSetCount}"${styleStr}${transformStr}>\n`;
    _svgGroupLevel++; 
    _triangleStripSetCount++;
    
    if (cmd.vertices.length >= 3){
      for (let i = 0; i < cmd.vertices.length - 2; i++) {
        let x1Str = formatNumber(cmd.vertices[i  ].x);
        let y1Str = formatNumber(cmd.vertices[i  ].y);
        let x2Str = formatNumber(cmd.vertices[i+1].x);
        let y2Str = formatNumber(cmd.vertices[i+1].y);
        let x3Str = formatNumber(cmd.vertices[i+2].x);
        let y3Str = formatNumber(cmd.vertices[i+2].y);
        
        let triStr = ""; 
        if (i%2 == 0){
          triStr = `${x1Str},${y1Str} ${x2Str},${y2Str} ${x3Str},${y3Str}`;
        } else {
          triStr = `${x1Str},${y1Str} ${x3Str},${y3Str} ${x2Str},${y2Str}`;
        }
        triStripStr += getIndentStr();
        triStripStr += `<polygon points="${triStr}"/>\n`;
      }
    }

    _svgGroupLevel--; 
    triStripStr += getIndentStr();
    triStripStr += `</g>\n`;
    return triStripStr;
  }


  /**
   * @private
   * Generates an SVG group element string representing a set of quads, 
   * based on the given command object. Handles beginShape(QUADS) in p5.js.
   * @param {Object} cmd - The command object containing vertices.
   * @returns {string} The SVG group element string with formatted quads.
   */
  function getSvgStrQuads(cmd) {
    // handle beginShape(QUADS)
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let quadsStr = "";
    quadsStr += `<g id="QUADS_${_quadsSetCount}"${styleStr}${transformStr}>\n`;
    _svgGroupLevel++; 
    _quadsSetCount++;
    
    if (cmd.vertices.length >= 4){
      for (let i = 0; i < cmd.vertices.length - 3; i+=4) {
        const v1 = cmd.vertices[i  ];
        const v2 = cmd.vertices[i+1];
        const v3 = cmd.vertices[i+2];
        const v4 = cmd.vertices[i+3];
        const qStr = `${formatNumber(v1.x)},${formatNumber(v1.y)} ` +
                    `${formatNumber(v2.x)},${formatNumber(v2.y)} ` +
                    `${formatNumber(v3.x)},${formatNumber(v3.y)} ` +
                    `${formatNumber(v4.x)},${formatNumber(v4.y)}`;
        quadsStr += getIndentStr();
        quadsStr += `<polygon points="${qStr}"/>\n`;
      }
    }
    
    _svgGroupLevel--; 
    quadsStr += getIndentStr();
    quadsStr += `</g>\n`;
    return quadsStr;
  }


  /**
   * @private
   * Generates an SVG group element string representing a quad strip, 
   * based on the given command object.Handles beginShape(QUAD_STRIP) in p5.js.
   * @param {Object} cmd - The command object containing vertices.
   * @returns {string} The SVG group element string with formatted quads.
   */
  function getSvgStrQuadStrip(cmd) {
    // handle beginShape(QUAD_STRIP)
    let styleStr = getSvgStrStroke();
    let transformStr = generateTransformString(cmd);
    let quadStripStr = "";
    quadStripStr += `<g id="QUAD_STRIP_${_quadStripSetCount}"${styleStr}${transformStr}>\n`;
    _svgGroupLevel++; 
    _quadStripSetCount++;
    
    if (cmd.vertices.length >= 4){
      for (let i = 0; i < cmd.vertices.length-2; i+=2) {
        const v1 = cmd.vertices[i  ];
        const v2 = cmd.vertices[i+1];
        const v3 = cmd.vertices[i+2];
        const v4 = cmd.vertices[i+3];
        const qStr = `${formatNumber(v1.x)},${formatNumber(v1.y)} ` +
                    `${formatNumber(v2.x)},${formatNumber(v2.y)} ` +
                    `${formatNumber(v4.x)},${formatNumber(v4.y)} ` +
                    `${formatNumber(v3.x)},${formatNumber(v3.y)}`;
        quadStripStr += getIndentStr();
        quadStripStr += `<polygon points="${qStr}"/>\n`;
      }
    }
    
    _svgGroupLevel--; 
    quadStripStr += getIndentStr();
    quadStripStr += `</g>\n`;
    return quadStripStr;
  }


  /**
   * @private
   * Generates an SVG <text> element string based on the provided command object.
   * Captures text content, position, font properties, alignment, and style for SVG rendering.
   * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text
   *
   * @param {Object} cmd - The command object containing text properties:
   *   @param {number} cmd.x - The x-coordinate for the text position.
   *   @param {number} cmd.y - The y-coordinate for the text position.
   *   @param {string} cmd.font - The font family for the text.
   *   @param {number} cmd.fontSize - The font size for the text.
   *   @param {string} cmd.alignX - The horizontal alignment ('left', 'center', 'right').
   *   @param {string} cmd.alignY - The vertical alignment ('top', 'center', 'bottom', 'alphabetic').
   *   @param {string} cmd.style - The text style ('normal', 'bold', 'italic', 'bolditalic').
   *   @param {string} cmd.leading - The text leading.
   *   @param {string} cmd.ascent - The text ascent.
   *   @param {string} cmd.descent - The text descent.
   *   @param {string} cmd.content - The text content to display.
   * @returns {string} The formatted SVG <text> element string.
   */
  function getSvgStrText(cmd) {
    let xStr = formatNumber(cmd.x);
    let yStr = formatNumber(cmd.y);
    let fontSizeStr = formatNumber(cmd.fontSize);

    // Adjust y-coordinate for vertical alignment : NOT FINISHED
    // See https://github.com/processing/p5.js/blob/v1.11.1/src/core/p5.Renderer.js#L233
    let adjustedY = cmd.y; // Default to the original y-value
    switch (cmd.alignY) {
      case 'top':
        // no solution yet
        break;
      case 'center':
        // no solution yet
        break;
      case 'bottom':
        adjustedY = adjustedY + cmd.fontSize - cmd.leading; // is this correct??
        break;
      case 'alphabetic': // baseline
        // no solution needed
        break;
    }
    let adjustedYStr = formatNumber(adjustedY);

    // Generate transformation string, if applicable
    let transformStr = generateTransformString(cmd);
    let styleStr = getSvgStrStroke();

    // Construct SVG <text> element
    let str = `<text x="${xStr}" y="${adjustedYStr}" font-family="${cmd.font}" font-size="${fontSizeStr}"${styleStr}${transformStr}`;

    // Handle horizontal alignment
    if (cmd.alignX === 'center') {
      str += ` text-anchor="middle"`;
    } else if (cmd.alignX === 'right') {
      str += ` text-anchor="end"`;
    }

    // Apply font-weight and font-style based on textStyle()
    if (cmd.style === 'bold') {
      str += ` font-weight="bold"`;
    } else if (cmd.style === 'italic') {
      str += ` font-style="italic"`;
    } else if (cmd.style === 'bolditalic') {
      str += ` font-weight="bold" font-style="italic"`;
    } // Normal is default and doesn’t need additional attributes
    
    str += `>${cmd.content}</text>\n`;
    return str;
  }


  /**
   * @private
   * Captures the current transformation matrix from the drawing context
   * if transforms exist and we're not using a transform stack.
   * @returns {Object|null} An object containing the transformation 
   * matrix values or null if no transforms exist.
   */
  function captureCurrentTransformMatrix() {
    if (_bTransformsExist && _bFlattenTransforms) {
      const ctxTransform = _p5Instance.drawingContext.getTransform();
      return {
        a: ctxTransform.a,
        b: ctxTransform.b,
        c: ctxTransform.c,
        d: ctxTransform.d,
        e: ctxTransform.e,
        f: ctxTransform.f
      };
    }
    return null;
  }


  /**
   * @private
   * Generates an SVG transform string from a command object if a transformation matrix is present,
   * accounting for pixel density scaling.
   * @param {Object} cmd - The command object potentially containing a transform matrix.
   * @returns {string} The SVG transform string or an empty string if no transform matrix is present.
   */
  function generateTransformString(cmd) {
    if (cmd.transformMatrix) {
      // Calculate the scaling factor from pixelDensity()
      // and adjust the matrix values by the pixelScale
      const pixelScale = 1.0 / _p5PixelDensity; 
      const { a, b, c, d, e, f } = cmd.transformMatrix;
      const sA = formatNumber(a * pixelScale, _svgTransformPrecision);
      const sB = formatNumber(b * pixelScale, _svgTransformPrecision);
      const sC = formatNumber(c * pixelScale, _svgTransformPrecision);
      const sD = formatNumber(d * pixelScale, _svgTransformPrecision);
      const sE = formatNumber(e * pixelScale, _svgTransformPrecision);
      const sF = formatNumber(f * pixelScale, _svgTransformPrecision);
      return ` transform="matrix(${sA} ${sB} ${sC} ${sD} ${sE} ${sF})"`;
    }
    return '';
  }


  /**
   * @private
   * Formats a number to a specified decimal precision, converting it to a string.
   * If the number is an integer, it is returned as a string without formatting.
   * If no precision is provided, the function defaults to using `_svgCoordPrecision`.
   *
   * @param {number} val - The value to be formatted.
   * @param {number} [precision] - Optional precision specifying the number of decimal places. 
   * If omitted, the global `_svgCoordPrecision` is used.
   * @returns {string} The formatted number as a string.
   */
  function formatNumber(val, precision) {
    const precisionToUse = (typeof precision === 'number') ? precision : _svgCoordPrecision;
    if (Number.isInteger(val)) {
      return val.toString();
    } else {
      return val.toFixed(precisionToUse);
    }
  }


  /**
   * @private
   * Converts an angle from degrees to radians.
   * @param {number} deg - The angle in degrees to be converted.
   * @returns {number} The angle converted to radians.
   */
  function degreesToRadians(deg) {
    return deg * (Math.PI / 180.0);
  }


  /**
   * @private
   * Compares two colors and determines if they are equal.
   * Handles CSS color names, hex strings, and RGB values.
   * Ignores alpha channel and whitespace differences.
   * Assumes RGB values are integers between 0-255.
   * @param {string|number|Array} color1 - The first color (CSS name, hex, RGB string, or RGB array).
   * @param {string|number|Array} color2 - The second color (CSS name, hex, RGB string, or RGB array).
   * @returns {boolean} - True if the colors are equal, otherwise false.
   */
  function areColorsEqual(color1, color2) {
    // Helper function to ensure input is a string
    function toColorString(color) {
      if (Array.isArray(color)) {
        // Convert array [r, g, b] to 'rgb(r, g, b)'
        return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      } else if (typeof color === 'number') {
        // Handle single number input by converting to RGB triplet (e.g., grayscale)
        return `rgb(${color}, ${color}, ${color})`;
      }
      return color.toString().trim(); // Convert to string if not already
    }

    // Convert colors to strings if necessary
    color1 = toColorString(color1);
    color2 = toColorString(color2);

    // Create a temporary element to use for color parsing
    const tempElem = document.createElement('div');

    // Function to parse color and get RGB representation
    function parseColor(color) {
      // Set the color to the temporary element to get computed style
      tempElem.style.color = color;
      document.body.appendChild(tempElem);

      // Get computed color value
      const computedColor = window.getComputedStyle(tempElem).color;
      document.body.removeChild(tempElem);

      // Extract RGB values from computed color string
      const rgbMatch = computedColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      if (rgbMatch) {
        return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
      }
      return null; // Invalid color
    }

    // Parse both colors
    const rgb1 = parseColor(color1);
    const rgb2 = parseColor(color2);

    // Check if both colors are valid and compare RGB values
    if (rgb1 && rgb2) {
      return rgb1[0] === rgb2[0] && rgb1[1] === rgb2[1] && rgb1[2] === rgb2[2];
    }

    // Return false if either color is invalid
    return false;
  }


  /**
   * @private
   * Overrides the p5.js colorMode function to provide a warning about unsupported color modes
   * for SVG export in p5.plotSvg. Only CSS named colors, hex colors, and RGB/gray colors
   * whose values are in the range of 0-255 are supported.
   */
  function overrideColorModeFunction() {
    _originalColorModeFunc = window.colorMode;
    window.colorMode = function() {
      console.warn("p5.plotSvg: Only CSS named colors, hex colors, and RGB/gray colors whose values are in the range of 0-255 are supported for SVG output.");
      _originalColorModeFunc.apply(this, arguments);
    };
  }


  /**
   * @private
   * Overrides the p5.js stroke function to capture stroke color commands for SVG export.
   * Handles both CSS color names and p5.js color conversions for RGB/gray colors.
   * Records a command to change the stroke color when SVG recording is active.
   * @param {...*} args - Arguments passed to the stroke function. Can include CSS named colors,
   * hex colors, or RGB/gray values.
   */
  function overrideStrokeFunction() {
    _originalStrokeFunc = window.stroke;
    window.stroke = function(...args) {
      if (_bRecordingSvg) {
        let scol;

        // If the first argument is a string and a valid CSS color, use it directly
        if (typeof args[0] === 'string' && isValidCssColor(args[0])) {
          scol = args[0].trim();
        } else {
          // Otherwise, convert the arguments using p5.js color functionality
          scol = _p5Instance.color(...args).toString();
        }

        // Add a command to the stack to update the stroke color
        _commands.push({ type: 'stroke', color: scol });
      }
      // Call the original p5.js `stroke` function with all arguments
      _originalStrokeFunc.apply(this, args);
    };
  }

  /**
   * @private
   * Checks if a given string is a valid CSS color name or value.
   * @param {string} color - The input color string.
   * @returns {boolean} - True if the string is a valid CSS color, false otherwise.
   */
  function isValidCssColor(color) {
    // Create a temporary element to test the color
    const tempElem = document.createElement('div');
    tempElem.style.color = color;
    const isValid = tempElem.style.color !== '';
    tempElem.remove();
    return isValid;
  }


  /**
   * @private
   * Generates an SVG stroke style string if the current stroke color differs from the default.
   * Converts colors from rgba or rgb formats to hex format for consistent SVG output.
   * Assumes that non-rgba and non-rgb colors are already in a valid format (hex or CSS named colors).
   * @returns {string} - The SVG stroke style string or an empty string if the stroke matches the default.
   */
  function getSvgStrStroke() {
    // Add stroke style only if it differs from the default
    if (!areColorsEqual(_svgCurrentStrokeColor, _svgDefaultStrokeColor)) {
      let colorStr = _svgCurrentStrokeColor;

      // If the color is in rgba format, strip out the alpha channel and convert to hex
      if (colorStr.startsWith('rgba')) {
        // Extract the RGB values
        const match = colorStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*\d*\.?\d+\)/);
        if (match) {
          const r = parseInt(match[1], 10);
          const g = parseInt(match[2], 10);
          const b = parseInt(match[3], 10);
          colorStr = rgbToHex(r, g, b);
        }
      } 
      // If the color is in rgb format, convert to hex
      else if (colorStr.startsWith('rgb')) {
        // Extract the RGB values
        const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const r = parseInt(match[1], 10);
          const g = parseInt(match[2], 10);
          const b = parseInt(match[3], 10);
          colorStr = rgbToHex(r, g, b);
        }
      }

      // Assume the color is already in hex format or a 
      // named CSS color if it doesn't match previous conditions
      return ` style="stroke:${colorStr};"`;
    }
    return '';
  }


  /**
   * @private
   * Converts RGB values to a hex color string.
   * @param {number} r - The red value (0-255).
   * @param {number} g - The green value (0-255).
   * @param {number} b - The blue value (0-255).
   * @returns {string} The hex color string (e.g., '#ff0000').
   */
  function rgbToHex(r, g, b) {
    const toHex = (val) => val.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }


  /**
   * @private
   * Handles the SVG stroke command by updating the current stroke color.
   * This function is invoked when a stroke color change is recorded, ensuring
   * the stroke color state is updated for subsequent SVG elements.
   * @param {Object} cmd - The command object containing stroke properties.
   * @param {string} cmd.color - The new stroke color to set (in hex, RGB, or named CSS color format).
   */
  function handleSvgStrokeCommand(cmd) {
    // Update the current stroke color
    _svgCurrentStrokeColor = cmd.color;
  }


  /**
   * Retrieves the default stroke color used for SVG rendering.
   * @returns {string} - The default stroke color (in hex, RGB, or named CSS color format).
   */
  p5plotSvg.getDefaultStrokeColor = function() {
    return _svgDefaultStrokeColor;
  }


  // Expose public functions to the namespace
  global.p5plotSvg = p5plotSvg;

  // Attach functions to the global scope for easier access
  global.beginRecordSVG = p5plotSvg.beginRecordSVG;
  global.pauseRecordSVG = p5plotSvg.pauseRecordSVG;
  global.endRecordSVG = p5plotSvg.endRecordSVG;
  global.setSvgDefaultStrokeWeight = p5plotSvg.setSvgDefaultStrokeWeight;
  global.setSvgDefaultStrokeColor = p5plotSvg.setSvgDefaultStrokeColor;
  global.setSvgResolutionDPI = p5plotSvg.setSvgResolutionDPI;
  global.setSvgIndent = p5plotSvg.setSvgIndent;
  global.setSvgFlattenTransforms = p5plotSvg.setSvgFlattenTransforms;
  global.setSvgCoordinatePrecision = p5plotSvg.setSvgCoordinatePrecision;
  global.setSvgTransformPrecision = p5plotSvg.setSvgTransformPrecision;
  global.setSvgPointRadius = p5plotSvg.setSvgPointRadius;
  global.beginSvgGroup = p5plotSvg.beginSvgGroup;
  global.endSvgGroup = p5plotSvg.endSvgGroup;
  global.getDefaultStrokeColor = p5plotSvg.getDefaultStrokeColor;

  global.SVG_INDENT_SPACES = p5plotSvg.SVG_INDENT_SPACES;
  global.SVG_INDENT_NONE = p5plotSvg.SVG_INDENT_NONE;
  global.SVG_INDENT_TABS = p5plotSvg.SVG_INDENT_TABS;


  // Repeat this pattern for any other functions you wish to expose globally

  // Support CommonJS and ES6 modules
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = p5plotSvg;
  } else {
    global.p5plotSvg = p5plotSvg;
  }


})(this);

// Generate documentation with: 
// npx documentation build p5.plotSvg.js -f md -o docs --shallow