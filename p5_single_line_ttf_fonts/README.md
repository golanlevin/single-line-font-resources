## p5.js Parser/Renderer for Single-Line TTF Fonts

This directory contains the following: 

* An [archive](single_stroke_ttf_fonts/) of single-line¹ TTF fonts, with resources suggested by [imajeenyus.com](http://www.imajeenyus.com/computer/20150110_single_line_fonts/index.shtml)
* A p5.js program which is able to load, parse, display, and provide control points for those fonts: in [this repository](sketch.js), and at [editor.p5js.org](https://editor.p5js.org/golan/sketches/7kMYzCpfM)

### Technical Notes: 

1. Some of the TTFs provided here are actually *double-line* fonts. These are similar to outline fonts, but have infinitely thin bodies (i.e. no "fill"). They have twice as much data as necessary (clockwise and counter-clockwise contours), and if you use these fonts as paths for cutting or plotting, you will see them double back on themselves. A demonstration of this can be found [here](https://editor.p5js.org/golan/sketches/WULnyBSQ5).
2. Unlike Hershey fonts, many of these TTFs are constructed in part from quadratic Bézier segments, and thus have actual, proper curves instead of polylines. 
3. Unfortunately, inconsistencies in certain single-line TTF fonts require special case handling for certain closed characters (e.g., `B`,`D`,`O`,`Q`,`a`,`o`,`8`,`0`). You can find the case handling code [here](sketch.js#L146).
4. Certain fonts (MACHTGDR.TTF, MACHTHSC.TTF, MACHTSCR.TTF) do not use standard ASCII/unicode codepoints (e.g. `A`=65), but instead use unicode codepoints in the [PUA](https://en.wikipedia.org/wiki/Private_Use_Areas) (Private Use Area) range. These have been corrected for in the code [here](sketch.js#L84).



![all_ttf_single_stroke_fonts.png](img/all_ttf_single_stroke_fonts.png)

---

## Individual Single-Line TTF Fonts

**1CamBam_Stick_1.ttf** - by George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php). Double-line font.
![1CamBam_Stick_1](img/1CamBam_Stick_1.ttf_demo.png)

**1CamBam_Stick_2.ttf** - by George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php). Double-line font.

**1CamBam_Stick_3.ttf** - by George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php). Double-line font.

**1CamBam_Stick_4.ttf** - by George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php). Double-line font.

**1CamBam_Stick_5.ttf** - by George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php). Double-line font.

**1CamBam_Stick_6.ttf** - by George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php). Double-line font.

**1CamBam_Stick_7.ttf** - by George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php). Double-line font.

**1CamBam_Stick_8.ttf** - by George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php). Double-line font.

**1CamBam_Stick_9.ttf** - by George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php). Double-line font.

**cnc_v_philippe_blondel.ttf** - (CNC Vector) by Philippe Blondel, from [here](https://web.archive.org/web/20190326082508/http://philing.net/fonts.html). Double-line font.

**MACHTGDR.TTF** - by Engineering Geometry Systems, from [here](http://www.imajeenyus.com/computer/20150110_single_line_fonts/machine_tool_font.zip). True single-stroke font.

**machtgth.ttf** - by Engineering Geometry Systems, from [here](http://www.imajeenyus.com/computer/20150110_single_line_fonts/machine_tool_font.zip). True single-stroke font. 

**MACHTHSC.TTF** - by Engineering Geometry Systems, from [here](http://www.imajeenyus.com/computer/20150110_single_line_fonts/machine_tool_font.zip). True single-stroke font.

**MACHTSCR.TTF** - by Engineering Geometry Systems, from [here](http://www.imajeenyus.com/computer/20150110_single_line_fonts/machine_tool_font.zip). True single-stroke font.

**MACHTSCR.TTF** - by Engineering Geometry Systems, from [here](http://www.imajeenyus.com/computer/20150110_single_line_fonts/machine_tool_font.zip). True single-stroke font.

**MecSoft_Font.ttf** - by Robert McNeel & Associates, from [here](https://wiki.mcneel.com/rhino/engravingfonts). True single-stroke font. 

**ORTE1LTT.TTF** - (Orach Technic) by Unknown, from [here](https://graviranje.rs/Engraving_PORTAL/fonts/One_Line_Fonts.htm). True single-stroke font. 

**RhSS.ttf** - by Robert McNeel & Associates, from [here](https://discourse.mcneel.com/t/wish-list-item-single-stroke-font/10467/9). True single-stroke font. 


