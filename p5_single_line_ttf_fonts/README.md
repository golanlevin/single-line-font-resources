## p5.js Parser/Renderer for Single-Line TTF Fonts

This directory contains the following: 

* An [archive](single_stroke_ttf_fonts/) of single-line TTF fonts, with resources suggested by [imajeenyus.com](http://www.imajeenyus.com/computer/20150110_single_line_fonts/index.shtml)
* A p5.js program which is able to load, parse, display, and provide control points for those fonts: in [this repository](sketch.js), and at [editor.p5js.org](https://editor.p5js.org/golan/sketches/7kMYzCpfM)

### Technical Notes: 

1. Unlike Hershey fonts, many of these TTFs are constructed in part from quadratic Bézier segments, and thus have real curves instead of polylines. 
2. A few (but not all!) of the TTFs provided here are actually *double-line* fonts. These are similar to outline fonts, but with infinitely thin bodies. They have twice as much data as necessary (clockwise and counter-clockwise), and if you use these fonts as paths for cutting or plotting, you will see them double back on themselves. 
3. Inconsistencies in some of the original TTF fonts require special cases for certain characters. 

![all_ttf_single_stroke_fonts.png](img/all_ttf_single_stroke_fonts.png)


---

### Single-line TTF font credits: 

* 1CamBam_Stick_1.ttf - George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php)
* 1CamBam_Stick_2.ttf - George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php)
* 1CamBam_Stick_3.ttf - George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php)
* 1CamBam_Stick_4.ttf - George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php)
* 1CamBam_Stick_5.ttf - George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php)
* 1CamBam_Stick_6.ttf - George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php)
* 1CamBam_Stick_7.ttf - George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php)
* 1CamBam_Stick_8.ttf - George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php)
* 1CamBam_Stick_9.ttf - George Race, from [here](https://www.ofitselfso.com/MiscNotes/CAMBamStickFonts.php)
* ORTE1LTT.TTF - (Orach Technic) Unknown, from [here](https://graviranje.rs/Engraving_PORTAL/fonts/One_Line_Fonts.htm)
* RhSS.ttf - Robert McNeel & Associates, from [here](https://discourse.mcneel.com/t/wish-list-item-single-stroke-font/10467/9)
* MecSoft_Font.ttf - Robert McNeel & Associates, from [here](https://wiki.mcneel.com/rhino/engravingfonts)
* cnc_v_philippe_blondel.ttf - (CNC Vector) Philippe Blondel, from [here](https://web.archive.org/web/20190326082508/http://philing.net/fonts.html)
* MACHTGDR.TTF - Engineering Geometry Systems, from [here](http://www.imajeenyus.com/computer/20150110_single_line_fonts/machine_tool_font.zip)
* MACHTHSC.TTF - Engineering Geometry Systems, from [here](http://www.imajeenyus.com/computer/20150110_single_line_fonts/machine_tool_font.zip)
* MACHTSCR.TTF - Engineering Geometry Systems, from [here](http://www.imajeenyus.com/computer/20150110_single_line_fonts/machine_tool_font.zip)
* machtgth.ttf - Engineering Geometry Systems, from [here](http://www.imajeenyus.com/computer/20150110_single_line_fonts/machine_tool_font.zip)
* machtssr-gm.ttf - Engineering Geometry Systems, from [here](http://www.imajeenyus.com/computer/20150110_single_line_fonts/machine_tool_font.zip)