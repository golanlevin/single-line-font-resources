JaredShiffmanFont JSF; 

void setup(){
  size (1000,200); 
  JSF = new JaredShiffmanFont(); 
  
  println("numPoints = " + JSF.F.letters[44].numPoints); 
}

void draw(){
  background(255); 
  stroke(0); 
  noFill(); 
  
  String myString = "1234567890abcdefghijklmnopqrstuvwxyz"; //Jared's Monospace Monoline";
  JSF.F.drawString(myString, 10,100, 0.15);
}