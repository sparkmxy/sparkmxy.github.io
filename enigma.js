// JavaScript Document
/*Constants for keyboards*/
var keyboardLine1 = ['Q','W','E','R','T','Y','U','I','O','P'];
var keyboardLine2 = ['A','S','D','F','G','H','J','K','L'];
var keyboardLine3 = ['Z','X','C','V','B','N','M'];
var keyCenterLine1 = new Array();
var keyCenterLine2 = new Array();
var keyCenterLine3 = new Array();
/*Canvas and context*/
var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
var backgroud = '#FFFFFF';
/*Variables for rotors*/

var rotorState = [0,0,0];
var rotorColor = ['#000000','#1d9aa3','#8b8f8b','#3a8017'];

var topX;    //x coordinate of topleft position e.g.[x,y]
var topY = 50;
var rotor;     // y coordinate of each node
var decode;
var rotorXlen = 70;
var rotorWidth = 20;
var rotorHeight = 10;
var ySpace = 5; // interval between two adjcent nodes
var xSpace = 120;  // interval between tow rotors

var left2right = [[19,0,6,1,15,2,18,3,16,4,20,5,21,13,25,7,24,8,23,9,22,11,17,10,14,12],[0,9,15,2,25,22,17,11,5,1,3,10,14,19,24,20,16,6,4,13,7,23,12,8,21,18],[20,22,24,6,0,3,5,15,21,25,1,4,2,10,12,19,7,23,18,11,17,8,13,16,14,9]];
var right2left = [[1,3,5,7,9,11,2,15,17,19,23,21,25,13,24,4,8,22,6,0,10,12,20,18,16,14],[0,9,3,10,18,8,17,20,23,1,11,7,22,19,12,2,16,6,25,13,15,24,5,21,14,4],[4,10,12,5,11,6,3,16,21,25,13,19,14,22,24,7,23,20,18,15,0,8,1,17,2,9]];
/*Variables for the plugborad*/
var plug = new Array();
var plugCenter = new Array();
var chosenPlug = -1;
/*Variables for the reflector*/
var reflectorNo;
var refY;
var refX;
var unit = 12;

var reflector = [
[[8,9,1],[19,21,1],[11,14,1],[12,15,2],[0,4,1],[17,23,2],[18,25,3],[2,10,2],[1,13,3],[3,16,4],[5,20,5],[7,22,6],[6,24,7]],
	
[[11,12,1],[1,3,1],[7,10,1],[20,24,1],[4,9,2],[18,23,2],[15,22,3],[5,13,3],[16,25,4],[2,14,4],[6,19,5],[8,21,6],[0,17,7]]
];

var Reflector = [[4,13,10,16,0,20,24,22,9,8,2,14,15,1,11,12,3,23,25,21,5,19,7,17,6,18],
				 [17,3,14,1,9,13,19,10,21,4,7,12,11,5,2,22,25,0,23,6,24,8,15,18,20,16]];

/*Variables about tags*/
var tagX;
var tagY = 10;
var tagWidth = 30;
var tagHeight = 30;
var leftTag = [0,0];

/*Other variables*/
var leftBound;
var upBound;
var downBound;
var rightBound;
var totalHeieght;
var changedRect = new Array();

var isOnKey = -1;

var cypherText = '';
var plainText = '';
var startingState = [0,0,0];

/*FUNCTIONS*/

window.onload = function(){
	canvas.width = 800;	
	canvas.height = 600;
	drawKeyboard();
	drawRotors();
	reflectorInit();
	plugboardInit();
	tagsInit();
	drawTags();
	drawLeftTag();
	
	prepare();
	
	canvas.addEventListener('click', doMouseClick,false);
	canvas.addEventListener('mousedown',doMouseDown,false);
	canvas.addEventListener('mouseup',  doMouseUp,false);	
};


function drawKeyboard(){
	context.font = 'bold 20px consolas';
	context.textAlign = 'left';
	context.textBaseline = 'top';
	context.strokeStyle = '#DF5326';
	context.fillStyle = '#000000';
	var start = 450,vspace = 40;
	for(var i=0;i<keyboardLine1.length;i++) {
		var x = i * 60 + 120, y = start;
		context.fillText(keyboardLine1[i],x,y);
		drawCircle(x+5,y + 10,15);
		keyCenterLine1[i] = [x+5,y+10];
	}
	for(var i=0;i<keyboardLine2.length;i++) {
		var x = i * 60 + 120 + 30, y = start + vspace;
		context.fillText(keyboardLine2[i],x,y);
		drawCircle(x+5,y + 10,15);
		keyCenterLine2[i] = [x+5,y+10];
	}
	for(var i=0;i<keyboardLine3.length;i++) {
		var x = i * 60 + 120 + 60,y = start + 2*vspace;
		context.fillText(keyboardLine3[i],x,y);
		drawCircle(x+5,y + 10,15);
		keyCenterLine3[i] = [x+5,y+10];
	}
}

function drawRotors(){
	rotorsInit();
	for(var i=0;i<3;i++)
		linkRotors(i,'draw');
}


/*About reflector*/

function reflectorInit(){
	context.fillStyle = '#3a8017';
	context.strokeStyle = '#0000FF';
	
	refX = topX[0] - xSpace  + rotorXlen;
	for(var i=0;i<26;i++){
		context.fillRect(refX,rotor[i],rotorWidth,rotorHeight);
		drawLine(refX+rotorWidth,rotor[i]+rotorHeight/2,topX[0],rotor[i]+rotorHeight/2);
	}
	
	reflectorNo = 0;
	drawReflector(reflectorNo)
}



function drawReflector(no){
	context.strokeStyle = '#000000';
	context.lineWidth = 1;
	for(var i=0;i<13;i++){  // There are 13 pairs.
		var info  = reflector[no][i];
		var x2 = refX - info[2] * unit;
		var y1 = rotor[info[0]] + rotorHeight/2;
		var y2 = rotor[info[1]] + rotorHeight/2;
		drawLine(refX,y1,x2,y1);
		drawLine(refX,y2,x2,y2);
		drawLine(x2,y1,x2,y2);
	}
}

function linkPlugBoard(flag){
	if(flag == 'draw'){
		context.strokeStyle = '#000000';
	}
	else {
		wipeOut(topX[3] + rotorWidth,topY,rotorXlen - rotorWidth,totalHeieght);
		return ;
	}
	var x1 = topX[3] + rotorWidth;
	var x2 = topX[3] + rotorXlen;
	for(var i=0;i<26;i++){
		// link i and plug[i]
		drawLine(x1,rotor[i] + rotorHeight/2,x2,rotor[plug[i]] + rotorHeight/2);
	}
}
/*About Plugbooard*/
function plugboardInit(){
	// initialize the plug board settings.
	for(var i=0;i<26;i++) plug[i] = i;
	
	linkPlugBoard('draw');
	drawplugboard();
}
function drawplugboard(){
	
	context.strokeStyle = '#000000';
	context.lineWidth = 1;
	
	// the plugs
	var x1 = topX[3] + rotorWidth + rotorXlen;
	var R = 10;
	for(var i=0;i<26;i++){
		var l;
		if(i % 2) l = 30;
		else l = 60;
		var y = rotor[i] + rotorHeight/2;
		drawLine(x1,y, x1 + l,y);
	}
	context.font = 'bold 15px consolas';
	context.textAlign = 'left';
	context.textBaseline = 'top';
	context.strokeStyle = '#DF5326';
	context.fillStyle = '#000000';
	for(var i=0;i<26;i++){
		var l;
		if(i % 2) l = 30;
		else l = 60;
		var y = rotor[i] + rotorHeight/2;
		drawCircle(x1+l+R,y,R);
		plugCenter[i] = [x1+l+R,y];
		context.fillText(String.fromCharCode(65 + i),x1+l+5,y-5);
	}
}


/*About rotors*/
function rotorsInit(){
	rotor = new Array();
	topX = new Array();
	topX[0] = 200;
	topX[1] = topX[0] + xSpace;
	topX[2] = topX[0] + 2 * xSpace;
	topX[3] = topX[0] + 3 * xSpace;
	
	context.strokeStyle = '#0000FF';
	
	rotor[0] = topY;
	var x1 = (topX[i]+rotorWidth/2);
	for(var j=1;j<26;j++)
		rotor[j] = rotor[j-1] + ySpace + rotorHeight;
	for(var i=0;i<4;i++){
		context.fillStyle = rotorColor[i];
		var x1 = (topX[i]+rotorWidth);
		for(var j=0;j<26;j++){
			context.fillRect(topX[i], rotor[j], rotorWidth, rotorHeight);
			context.fillRect(topX[i] + rotorXlen, rotor[j], rotorWidth, rotorHeight);
			
			var y1 = rotor[j] + rotorHeight/2;
			if(i>0){
			 drawLine(topX[i],y1,x1+rotorXlen-xSpace,y1);
			}
		}
	}
}

function linkRotors(i,flag){
	if(flag == "draw"){
		context.strokeStyle = '#000000';
		context.lineWidth = 1;
	}
	else {
		// cover with backgroud
		wipeOut(topX[i] + rotorWidth,topY,rotorXlen - rotorWidth,totalHeieght);
		return ;
	}
	
	var x1 = topX[i] + rotorWidth;
	var x2 = topX[i] + rotorXlen;
	for(var j=0;j<26;j++){
		var k =(right2left[i][(j + rotorState[i])%26] - rotorState[i] + 26 )%26;   // k <=> j
		drawLine(x1,rotor[k] + rotorHeight/2,x2,rotor[j] + rotorHeight/2);
	}
}

/*Other elements*/

function tagsInit(){
	tagX = new Array();
	tagX[0] = topX[0] + 30;
	tagX[1] = tagX[0] + xSpace;
	tagX[2] = tagX[1] +xSpace;
	leftTag[0] = topX[0] - 180;
	leftTag[1] = topY + 12 * (rotorHeight + ySpace);
}
function drawTags(){
	// others... 
	context.fillStyle = '#fcedeb';
	for(var i=0;i<3;i++){
		context.fillRect(tagX[i],tagY,tagWidth,tagHeight);
	}
	context.font = 'bold 20px consolas';
	context.textAlign = 'left';
	context.textBaseline = 'top';

	for(var i=0;i<3;i++){
		context.fillStyle = rotorColor[i];
		context.fillText(String.fromCharCode(65 + rotorState[i]),tagX[i]+10,tagY+5);
	}
	
}


function drawLeftTag(){
	context.fillStyle = '#fcedeb';
	context.fillRect(leftTag[0],leftTag[1],tagWidth,tagHeight);
	context.font = 'bold 20px consolas';
	context.textAlign = 'left';
	context.textBaseline = 'top';
	context.fillStyle = rotorColor[3];
	context.fillText(reflectorNo.toString(),leftTag[0]+10,leftTag[1]+5);
}
function drawLine(x1,y1,x2,y2){
	context.beginPath();
	context.moveTo(x1, y1);
	context.lineTo(x2,y2);
	context.stroke();
	context.closePath();
}

function drawCircle(cx,cy,r){
	context.beginPath();
	context.arc(cx,cy,r,0,2*Math.PI);
	context.stroke();
}

/******************************Functions for dynamic drawing************************/
/*
Events：
(1)Click the keyboard.
	(i) mouse down.
	(ii) mouse up.
(2)Change the plugboard settings (click).
(3)Change the state of rotors(click).
(4)Change the reflector(click).
*/


/*Event Handlers*/
var X = new Array();

function prepare(){
	leftBound = 120;
	rightBound = topX[3] + rotorWidth + rotorXlen;
	downBound = rotor[25] + 5;
	upBound	=	rotor[0]  - 5;
	totalHeieght = rotor[25] - rotor[0] + rotorHeight;
	X[0] = topX[0] - xSpace + rotorXlen;
	X[1] = topX[0];
	X[2] = topX[0] + rotorXlen;
	X[3] = topX[1];
	X[4] = topX[1] + rotorXlen;
	X[5] = topX[2];
	X[6] = topX[2] + rotorXlen;
	X[7] = topX[3];
	X[8] = topX[3] + rotorXlen;
}

function getPointOnCanvas(x,y) {
	var bbox = canvas.getBoundingClientRect();
	return [x- bbox.left,y - bbox.top];
}

function doMouseClick(){
	var pos = getPointOnCanvas(event.clientX,event.clientY);
	//window.alert(pos);
	if(pos[0] < leftBound){
		reflectorTagClick(pos);
		resetPlugBoard();
	}
	else if(pos[0] > rightBound){  // may be a click on plugs
		var num = whichPlug(pos);
		if(num != -1){
			plugboardClick(num);	
		}
		else {
			resetPlugBoard();
		}
	}
	else if(pos[1] < upBound){
		for(var i =0 ; i < 3 ; i++){
			if (isInRect(pos,[tagX[i],tagY],tagWidth,tagHeight)){
				rotorTagClick(i);
				break;
			}
		}
		resetPlugBoard();
	}
}

function doMouseDown(){
	
	var pos = getPointOnCanvas(event.clientX,event.clientY);
	if(pos[1] > downBound){
		var num = whichKey(pos);
	//	window.alert(num);
		if(num != -1){
			resetPlugBoard();
			keyboardMouseDown(num);
		}
	}
}

function doMouseUp(){
	var pos = getPointOnCanvas(event.clientX,event.clientY);
	if(pos[1] > downBound){
			var num = whichKey(pos);
		if(num != -1){
			keyboardMouseUp(num);
		}
	}
}

var OnControl = false;

window.onkeydown = function(e){
	if(OnControl) return;
	resetPlugBoard();
	var i = e.keyCode;
	if(i >= 65 && i <= 65 + 25) 
		keyboardMouseDown(i-65);
	else if(i == 8){  //backspace
	  	onBackspace();
	}
	else if(i==32){
		addSpace();
	}
	else if(i == 17){
		OnControl = true;
	}
}

window.onkeyup = function(e){
	var i = e.keyCode;
	if(i>=65 && i<=65 + 25)
		keyboardMouseUp(i-65);
	else if(i == 17){
		OnControl = false;
	}
}

/*The following functions deal with the above events.*/

var Code;
function keyboardMouseDown(i){
	if(isOnKey != -1) return;
	isOnKey = i;
	var dh = rotorHeight/2;
	var pl = i;
	lightUpPlug(i,'#FF0000');
	lightUpKeyboard(i,'#FF0000');
	context.strokeStyle = '#FF0000';
	context.fillStyle = '#FF0000';
	context.lineWidth = 3;
	drawLine(topX[3] + rotorXlen + rotorWidth,plugCenter[i][1],plugCenter[i][0]- 10,plugCenter[i][1]);
	context.fillRect(X[8],rotor[i],rotorWidth,rotorHeight);
	drawLine(X[8],rotor[i]+dh,X[7] + rotorWidth,rotor[plug[i]]+dh);
	i = plug[i];
	
	var xNo = 7;
	for(var j = 2 ;j >= 0; j--){
		context.fillRect(X[xNo],rotor[i],rotorWidth,rotorHeight);
		drawLine(X[xNo],rotor[i]+dh,X[xNo-1]+rotorWidth,rotor[i]+dh);
		context.fillRect(X[xNo-1],rotor[i],rotorWidth,rotorHeight);
		var k = right2left[j][(i + rotorState[j])%26];
		drawLine(X[xNo-1],rotor[i]+dh,X[xNo-2] + rotorWidth,rotor[k]+dh);
		i = k;
		xNo -= 2;
	}
	context.fillRect(X[1],rotor[i],rotorWidth,rotorHeight);
	context.fillRect(X[0],rotor[i],rotorWidth,rotorHeight);
	drawLine(X[1],rotor[i]+dh,X[0],rotor[i]+dh);
	drawReflectorLink(i);
	i = Reflector[reflectorNo][i];
	xNo = 0;
	for(var j =0 ;j< 3;j++){
		context.fillRect(X[xNo],rotor[i],rotorWidth,rotorHeight);
		drawLine(X[xNo]+rotorWidth,rotor[i]+dh,X[xNo+1],rotor[i]+dh);
		context.fillRect(X[xNo+1],rotor[i],rotorWidth,rotorHeight);
		var k =  (left2right[j][i] - rotorState[j] + 26)%26;
		drawLine(X[xNo+1]+rotorWidth,rotor[i]+dh,X[xNo+2],rotor[k]+dh);
		i = k;
		xNo += 2;
	}
	context.fillRect(X[6],rotor[i],rotorWidth,rotorHeight);
	context.fillRect(X[7],rotor[i],rotorWidth,rotorHeight);
	drawLine(X[6]+rotorWidth,rotor[i]+dh,X[7],rotor[i]+dh);
	drawLine(X[8],rotor[i]+dh,X[7]+rotorWidth,rotor[plug[i]]+dh);
	i = plug[i];
	context.fillRect(X[8],rotor[i],rotorWidth,rotorHeight);
	drawLine(topX[3] + rotorXlen + rotorWidth,plugCenter[i][1],plugCenter[i][0]- 10,plugCenter[i][1]);
	lightUpPlug(i,'#FF0000');
	Code = i;
	addLetter(pl,Code);
}

function keyboardMouseUp(num){
	if(isOnKey  == -1 || isOnKey != num) return;
	context.strokeStyle = '#000000';
	context.lineWidth = '10px';
	
	rotorStateChange(1);
	// reset reflector
	wipeOut(0,topY,refX,totalHeieght); 
	drawReflector(reflectorNo);
	drawLeftTag();
	//reset tags
	
	// reset all links
	for(var i=0;i<3;i++){
		linkRotors(i,'wipe');
		linkRotors(i,'draw');
	}
	// reset rects
	for(var i=0;i<9;i++){
		if(i == 0)
			context.fillStyle = rotorColor[3];
		else 
			context.fillStyle = rotorColor[(i-1)/2];
		for(var j=0;j<26;j++){
			context.fillRect(X[i],rotor[j],rotorWidth,rotorHeight);
		}
	}
	
	context.strokeStyle = '#0000FF';
	var dh = rotorHeight/2;
	for(var i=0;i<7;i+=2){
		wipeOut(X[i]+rotorWidth,rotor[0],xSpace-rotorXlen-rotorWidth,totalHeieght);
		for(var j=0;j<26;j++){
			drawLine(X[i] + rotorWidth, rotor[j]+dh, X[i+1],rotor[j]+dh);
		}
	}
	// reset plugboard
	linkPlugBoard('wipe');
	linkPlugBoard('draw');
	
	wipeOut(X[8]+rotorWidth,rotor[0] - 5,xSpace,totalHeieght + 10);
	drawplugboard();
	// reset keyboard
	lightUpKeyboard(num,backgroud);
	
	Code = -1;
	isOnKey = -1;
}

function plugboardClick(num){
	if(chosenPlug == -1){
		chosenPlug = num;
		plug[plug[num]] = plug[num];
		plug[num] = num;
		linkPlugBoard('wipe');
		linkPlugBoard('draw');
		lightUpPlug(num,'#d9eb13');
	}
	else {
		plug[plug[num]] = plug[num];
		plug[chosenPlug] = num;
		plug[num] = chosenPlug;
		linkPlugBoard('wipe');
		linkPlugBoard('draw');
		resetPlugBoard();
	}
	clearText();
}

function reflectorTagClick(pos){
	if(isInRect(pos,leftTag,tagWidth,tagHeight)){
	//	window.alert('this is it!');
		wipeOut(0,topY,refX,totalHeieght);
		reflectorNo ^= 1;
		drawReflector(reflectorNo);
		drawLeftTag();
		clearText();
	}
}


function rotorTagClick(no){
	rotorState[no] = (rotorState[no] + 1)%26;
	linkRotors(no,'wipe');
	linkRotors(no,'draw');
	wipeOut(tagX[0],0,tagX[2] - tagX[0] + tagWidth,tagY + tagHeight);
	drawTags();
	clearText();
}
function rotorStateChange(delta){
	if(delta == 1)
		rotorStateInc();
	else 
		rotorStateDec();
	wipeOut(tagX[0],0,tagX[2] - tagX[0] + tagWidth,tagY + tagHeight);
	drawTags();
	for(var i =0 ; i < 3 ;i++){
		linkRotors(i,'wipe');
		linkRotors(i,'draw');
	}
}
/*The following funcitons deal with drawing when an event occurs.*/

function isInRect(point,topleft,width,height){
	if(point[0]< topleft[0] || point[0] > topleft[0] + width) return false;
	if(point[1] < topleft[1] || point[1] > topleft[1] + height) return false;
	return true;
}

function isInCircle(point,center,radius){
	return (point[0] - center[0]) * (point[0] - center[0]) +
		(point[1] - center[1]) * (point[1] - center[1]) < radius * radius;
}

function wipeOut(topleftX,topleftY,width,height){
	context.fillStyle = backgroud;
	context.fillRect(topleftX,topleftY,width,height);
}

function whichKey(pos){  // return -1 if not match anyone.
	for(var i=0; i<keyboardLine1.length;i++){
		if(isInCircle(pos,keyCenterLine1[i],15)){  //15 is the radius of key
			return keyboardLine1[i].charCodeAt(0) - 65;	
		}
	}
	for(var i=0; i<keyboardLine2.length;i++){
		if(isInCircle(pos,keyCenterLine2[i],15)){  //15 is the radius of key
			return keyboardLine2[i].charCodeAt(0) - 65;		
		}
	}
	for(var i=0; i<keyboardLine3.length;i++){
		if(isInCircle(pos,keyCenterLine3[i],15)){  //15 is the radius of key
			return keyboardLine3[i].charCodeAt(0) - 65;	
		}
	}
	return -1;
}

function whichPlug(pos){  // return -1 if not match anyone.
	for(var i =0 ;i<26;i++){
		if(isInCircle(pos,plugCenter[i],10))  // 10 is the radius of the key. 
			return i;
	}
	return -1;
}

function lightUpCircle(center,radius,color){
	context.beginPath();
	context.arc(center[0],center[1],radius,0,Math.PI*2,true);
	context.fillStyle = color;
	context.fill();
}

function wipeOutCircle(center,radius){
	context.beginPath();
	context.arc(center[0],center[1],radius,0,Math.PI*2,true);
	context.fillStyle = backgroud;
	context.fill();
	context.closePath();
}

function lightUpPlug(num,color){
	lightUpCircle(plugCenter[num],10,color);
	context.font = 'bold 15px consolas';
	context.textAlign = 'left';
	context.textBaseline = 'top';
	context.fillStyle = '#000000';
	context.fillText(String.fromCharCode(65 + num),plugCenter[num][0]-5,plugCenter[num][1]-5);
}

function findKeyboardPos(num){
	for(var i=0;i<keyboardLine1.length;i++)
		if(keyboardLine1[i].charCodeAt(0) == 65 + num){
			return keyCenterLine1[i];
		}
	for(var i=0;i<keyboardLine2.length;i++)
		if(keyboardLine2[i].charCodeAt(0) == 65 + num){
			return keyCenterLine2[i];
		}
	for(var i=0;i<keyboardLine3.length;i++)
		if(keyboardLine3[i].charCodeAt(0) == 65 + num){
			return keyCenterLine3[i];
		}
}

function lightUpKeyboard(num,color){
	var center = findKeyboardPos(num);
	lightUpCircle(center,15,color);
	context.font = 'bold 20px consolas';
	context.textAlign = 'left';
	context.textBaseline = 'top';
	context.fillStyle = '#000000';
	context.fillText(String.fromCharCode(65 + num),center[0]-5,center[1]-10);
}

function resetPlugBoard(){
	var i = chosenPlug;
	if(i != -1){
	//	window.alert('reset!');
		wipeOutCircle(plugCenter[i],10);
		var x1 = topX[3] + rotorWidth + rotorXlen;
		
		context.font = 'bold 15px consolas';
		context.textAlign = 'left';
		context.textBaseline = 'top';
		context.strokeStyle = '#DF5326';
		context.fillStyle = '#000000';
		
		var l;
		if(i % 2) l = 30;
		else l = 60;
		var y = rotor[i] + rotorHeight/2;
		drawCircle(x1+l+10,y,10);
		context.fillText(String.fromCharCode(65 + i),x1+l+5,y-5);

		chosenPlug = -1;
	}
}

function drawReflectorLink(num){
	for(var i=0;i<reflector[reflectorNo].length;i++)
		if(reflector[reflectorNo][i][0] == num || reflector[reflectorNo][i][1] == num){
			var info  = reflector[reflectorNo][i];
			var x2 = refX - info[2] * unit;
			var y1 = rotor[info[0]] + rotorHeight/2;
			var y2 = rotor[info[1]] + rotorHeight/2;
			drawLine(refX,y1,x2,y1);
			drawLine(refX,y2,x2,y2);
			drawLine(x2,y1,x2,y2);
		}
}

function rotorStateInc(){
	rotorState[2]++;
	if(rotorState[2] == 26){
		rotorState[2] = 0;
		rotorState[1]++;
		if(rotorState[1] == 26){
			rotorState[0] = (rotorState[0]+1)%26;
			rotorState[1] = 0;
		}
	}
}

function rotorStateDec(){
	rotorState[2]--;
	if(rotorState[2] < 0){
		rotorState[2] = 25;
		rotorState[1]--;
		if(rotorState[1] < 0){
			rotorState[0] = (rotorState[0]-1+26)%26;
			rotorState[1] = 25;
		}
	}
}

function onBackspace(){
	rotorStateChange(-1);
	cypherText = cypherText.substr(0,cypherText.length-1);
	plainText = plainText.substr(0,plainText.length-1);
	updateText();
}
/**********************************************************************/

function display(){
	var rotorsReport = 'State of rotors(from left to right): ' 
	for(var i=0;i<3;i++){
		rotorsReport = rotorsReport + String.fromCharCode(65+rotorState[i]) 
			+ '(' + rotorState[i] + ') ';
	}
	var plugboardReport = 'Plugboard: ';
	for(var i=0;i<26;i++)
		if(i < plug[i]){
			var thisOne =  String.fromCharCode(i + 65) + '-' + String.fromCharCode(plug[i] + 65);
			plugboardReport = plugboardReport + thisOne + ' ';
		}
	var reflectorReport = 'Reflector: ' + reflectorNo.toString();
	var report = rotorsReport + '\n' + plugboardReport + '\n' + reflectorReport +  '\n' + 'Plain text: ' + plainText +  '\n' + 'Cypher text: ' + cypherText;
	prompt(report, report)
}
function updateText(){
	$("input[name='cypher']").val(cypherText);
	 $("input[name='plain']").val(plainText);
}
function clearText(){
	cypherText = '';
	plainText = '';
	updateText();
	startingState = rotorState;
}

function addLetter(pl,cy)
{
	cypherText += String.fromCharCode(65 + cy);
	plainText += String.fromCharCode(65 + pl);
	 updateText();
}

function addSpace(){
	cypherText += ' ';
	plainText += ' ';
	updateText();
}

$(document).ready(function ()
{
    $("#export").click(function ()
    {
        display();
    });
});

