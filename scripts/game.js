//Section 1: initializing game parameters and dimensions-------------------------------------------------------------------------------------------------------------
const FPS = 30;
let showCanvas = false;
let gameRunning = false;
let currentTurn = 0;//1=player 1's turn, 2=player 2's turn, 3=player 3's turn
let alreadyHighlighted = false;// use this flag to avoid overlapping of transparent color
let p1Score, p2Score, p3Score, totalScore;// player scores
p1Score = p2Score = p3Score = totalScore = 0;
let boxes = [];//2d array for boxes displayed in canvas
let GRID_SIZE = parseInt(document.getElementById("gs").value);//The grid size of game boxes
//add event listeners to the buttons
document.getElementById("start").addEventListener("click", start);//remove home page and display game board
document.getElementById("restart").addEventListener("click", restart);//clear game status
document.getElementById("back_to_home").addEventListener("click", back);//remove game board and display home page

//canvas dimensions
window.addEventListener("resize", updateDimensions);//when window size changes, resize and redraw canvas to fit the window.
let HEIGHT = window.innerHeight * 0.7;
let WIDTH = window.innerWidth * 0.7;
if (HEIGHT >= WIDTH) {//make a squre game board that can fit into the window
  HEIGHT = WIDTH;
} else {
  WIDTH = HEIGHT;
}
let BOX_SIZE = WIDTH / (GRID_SIZE + 2);//the standard length of box sides
let STROKE = BOX_SIZE / 12;//the standard line width
let DOT = STROKE;//the standard dot radius
let TOP_MARGIN = HEIGHT - (GRID_SIZE + 1) * BOX_SIZE;
let SHIFT_TO_LEFT = (window.innerWidth - WIDTH) / 2 - STROKE*1.5;

//Player colors
const P1_COLOR = "rgba(255, 0, 0, 1)";
const P1_COLOR_HOVER = "rgba(255, 0, 0, 0.4)";
const P2_COLOR = "rgba(0, 187, 0, 1)";
const P2_COLOR_HOVER = "rgba(0, 187, 0, 0.4)";
const P3_COLOR = "rgba(255, 155, 0, 1)";
const P3_COLOR_HOVER = "rgba(255, 155, 0, 0.4)";
//Section 1 ends-----------------------------------------------------------------------------------------------------------------------------------------------------

//Section 2: Setting up the pages and canvas
//set score board colors
let p1ScoreBoard = document.getElementById("p1score");
let p2ScoreBoard = document.getElementById("p2score");
let p3ScoreBoard = document.getElementById("p3score");
p1ScoreBoard.style.color = P1_COLOR;
p2ScoreBoard.style.color = P2_COLOR;
p3ScoreBoard.style.color = P3_COLOR;

// set up the game canvas
let canvas = document.getElementsByTagName("canvas")[0];
canvas.addEventListener("mousemove", function (e) {
  if (!gameRunning) {
    return;
  }
  let xInCanvas = e.clientX - canvas.getBoundingClientRect().left;
  let yInCanvas = e.clientY - canvas.getBoundingClientRect().top;
  highlightSide(xInCanvas, yInCanvas);
});
canvas.addEventListener("click", occupySide);
canvas.height = HEIGHT;
canvas.width = WIDTH + SHIFT_TO_LEFT;
document.getElementsByTagName("body")[0].appendChild(canvas);

// set up the canvas context
let canvasContext = canvas.getContext("2d");
canvasContext.lineWidth = STROKE;
//the game loop for updating canvas and scores
setInterval(refreshCanvas, 1000 / FPS);
function refreshCanvas() {
  if (gameRunning) {//if the game is running
    //refresh the canvas with the most recent status
    drawBoard();
    drawBoxes();
    drawGrid();
    updateScoreBoard();
  }
}
//Section 2 ends-----------------------------------------------------------------------------------------------------------------------------------------------------

//Section 3: definations for the neccesary class and functions-------------------------------------------------------------------------------------------------------
//The game logic box structure
class Box {
  constructor(x, y, w, h) {
    this.w = w;
    this.h = h;
    this.top = y;
    this.bot = y + h;
    this.left = x;
    this.right = x + w;
    this.highlight = null;
    this.sideSelected = 0;
    this.occupiedBy = null;
    this.sideBot = { sideOccupiedBy: null, occupied: false };
    this.sideLeft = { sideOccupiedBy: null, occupied: false };
    this.sideRight = { sideOccupiedBy: null, occupied: false };
    this.sideTop = { sideOccupiedBy: null, occupied: false };
    this.resetDimensions = function (newX, newY, newW, newH) {//update box positions dimensions when called
      this.w = newW;
      this.h = newH;
      this.top = newY;
      this.bot = newY + newH;
      this.left = newX;
      this.right = newX + newW;
    }
    this.mouseInBox = function (x, y) {// is the mouse cursor is inside this box
      if (x >= this.right) {
        return false;
      } else if (x < this.left) {
        return false;
      } else if (y < this.top) {
        return false;
      } else if (y >= this.bot) {
        return false;
      }
      return true;
    };
    this.fill = function () {//if this box is occupied by a player, fill box with the player's hover color 
      if (this.occupiedBy == null) {
        return;
      }
      canvasContext.fillStyle = getPlayerColor(this.occupiedBy, 1);
      canvasContext.fillRect(this.left + STROKE / 2, this.top + STROKE / 2, this.w - STROKE / 2, this.h - STROKE / 2);
    };
    this.highlightSide = function (x, y) {//highlight unoccupied side with the current player's hover color
      //find the closest side
      let toTop = y - this.top;
      let toBot = this.bot - y;
      let toLeft = x - this.left;
      let toRight = this.right - x;
      let closest = Math.min(toBot, toTop, toLeft, toRight);

      //Highlight side if not already occupied
      if (closest == toTop && this.sideTop.sideOccupiedBy == null) {
        this.highlight = "t";
      } else if (closest == toBot && this.sideBot.sideOccupiedBy == null) {
        this.highlight = "b";
      } else if (closest == toLeft && this.sideLeft.sideOccupiedBy == null) {
        this.highlight = "l";
      } else if (closest == toRight && this.sideRight.sideOccupiedBy == null) {
        this.highlight = "r";
      } else {
        this.highlight = null;
      }
      return this.highlight;
    };

    this.occupyBoxSide = function () {//let the current player to occupy a highlighted and unoccupied side. Update score and fill the box if scoring. 
      if (this.highlight == null) {
        return;
      } else if (this.highlight == "t") {
        this.sideTop.sideOccupiedBy = currentTurn;
        this.sideTop.occupied = true;
      } else if (this.highlight == "b") {
        this.sideBot.sideOccupiedBy = currentTurn;
        this.sideBot.occupied = true;
      } else if (this.highlight == "l") {
        this.sideLeft.sideOccupiedBy = currentTurn;
        this.sideLeft.occupied = true;
      } else if (this.highlight == "r") {
        this.sideRight.sideOccupiedBy = currentTurn;
        this.sideRight.occupied = true;
      }
      this.highlight = null;

      //check for score condition
      this.sideSelected++;
      if (this.sideSelected == 4) {
        this.occupiedBy = currentTurn;
        if (currentTurn == 1) {
          this.fill();
          p1Score++;
          totalScore++;
        } else if (currentTurn == 2) {
          this.fill();
          p2Score++;
          totalScore++;
        } else if (currentTurn == 3) {
          this.fill();
          p3Score++;
          totalScore++;
        }
        return true;
      }
      return false;
    };
    this.drawSide = function (side, color) {//draw one of the 4 sides of the box
      if (side == "t") {
        drawLine(this.left, this.top, this.right, this.top, color);
      } else if (side == "b") {
        drawLine(this.left, this.bot, this.right, this.bot, color);
      }
      else if (side == "l") {
        drawLine(this.left, this.top, this.left, this.bot, color);
      }
      else if (side == "r") {
        drawLine(this.right, this.top, this.right, this.bot, color);
      }
    };
    this.drawBoxSides = function () {//draw all the occupied or highlighted sides. No need to draw a empty side.
      //draw the highlighten side
      if (this.highlight != null && !alreadyHighlighted) {
        alreadyHighlighted = true; //don't over highlight the same line
        this.drawSide(this.highlight, getPlayerColor(currentTurn, 1));
      }

      //draw the occupied sides
      if (this.sideTop.occupied) {
        this.drawSide("t", getPlayerColor(this.sideTop.sideOccupiedBy, 0));
      }
      if (this.sideBot.occupied) {
        this.drawSide("b", getPlayerColor(this.sideBot.sideOccupiedBy, 0));
      }
      if (this.sideLeft.occupied) {
        this.drawSide("l", getPlayerColor(this.sideLeft.sideOccupiedBy, 0));
      }
      if (this.sideRight.occupied) {
        this.drawSide("r", getPlayerColor(this.sideRight.sideOccupiedBy, 0));
      }

    };
  }
}

//The following function are about the dots and boxes game logic and drawings on canvas

function drawBoard() {//draw the canvas board
  canvasContext.fillStyle = "white";
  canvasContext.strokeStyle = "purple";
  canvasContext.fillRect(SHIFT_TO_LEFT, 0, WIDTH, HEIGHT);
  canvasContext.strokeRect(SHIFT_TO_LEFT + (STROKE / 2), STROKE / 2, WIDTH - STROKE, HEIGHT - STROKE);
}

function drawDot(x, y) {//draw a dot in canvas
  canvasContext.fillStyle = "purple";
  canvasContext.beginPath();
  canvasContext.arc(x, y, DOT, 0, Math.PI * 2)
  canvasContext.fill();
}

function drawGrid() {//draw the dot grid on canvas
  for (let i = 0; i <= GRID_SIZE; i++) {
    for (let j = 0; j <= GRID_SIZE; j++) {
      drawDot(SHIFT_TO_LEFT + BOX_SIZE * (j + 1), TOP_MARGIN + BOX_SIZE * (i))
    }
  }
}

function drawLine(xStart, yStart, xEnd, yEnd, color) {//draw a line in canvas
  canvasContext.beginPath();
  canvasContext.moveTo(xStart, yStart);
  canvasContext.lineTo(xEnd, yEnd);
  canvasContext.strokeStyle = color;
  canvasContext.stroke();
}

function drawBoxes() {//draw all the box sides and fill box with the owner's color
  for (let row of boxes) {
    for (let box of row) {
      box.fill();
      box.drawBoxSides();
    }
  }
  //2 overlapping line with the same color and low opacity will make a line with higher opacity.
  //We need this flag to avoid drawing a line twice.
  alreadyHighlighted = false;
}

function highlightSide(x, y) {//highlight the closest empty side.
  for (let row of boxes) {// we only highlight 1 side at once, so we need to removetotalScore previous highlight.
    for (let box of row) {
      box.highlight = null;
    }
  }

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (boxes[i][j].mouseInBox(x, y)) {
        let highlightedSide = boxes[i][j].highlightSide(x, y);//highlight the side that's closest to the mouse. 
        //there may be a adjacent box who shares the same side with the current box, we also need to highlight the adjacent box's side.
        if (highlightedSide == "t" && i > 0) {//for top adjacent box, we highlight bot
          boxes[i - 1][j].highlight = "b";
        } else if (highlightedSide == "b" && i < GRID_SIZE - 1) {//for bot adjacent box, we highlight top
          boxes[i + 1][j].highlight = "t";
        } else if (highlightedSide == "l" && j > 0) {//for left adjacent box, we highlight right
          boxes[i][j - 1].highlight = "r";
        } else if (highlightedSide == "r" && j < GRID_SIZE - 1) {//for right adjacent box, we highlight left
          boxes[i][j + 1].highlight = "l";
        }
        return;
      }
    }
  }
}

function occupySide() {// allow the current player to occupy an unoccupied and highlighted side.
  /**if(!gameRunning){ //allowing showing the result pop up multiple times when click on the game board after the game ends
    return
  }**/
  let scoreFlag = false;
  let highlightedFlag = false;
  for (let row of boxes) {
    for (let box of row) {
      if (box.highlight != null) {// if a box's side is highlighted
        highlightedFlag = true;
        if (box.occupyBoxSide()) {//if not scoring, go to next player's turn
          scoreFlag = true;
        }
      }
    }
  }
  if (!scoreFlag && highlightedFlag) {//if not scoring and occupy success, go to next player's turn
    if (currentTurn == 1 || currentTurn == 2) {
      currentTurn++;
    } else if (currentTurn == 3) {
      currentTurn = 1;
    }
  }
  //check for game ending condition
  if (totalScore == GRID_SIZE * GRID_SIZE) {//if the game ends
    refreshCanvas();//draw the final game canvas
    updateScoreBoard();//update the final score
    gameRunning = false;//set game running flag to false
    setTimeout(function () {//display the result with an alert. Use a time out to avoid conflict with the above lines
      showWinner();
    }, 100)
  }
}

function showWinner() {//check the scores and display winner or tie
  if (p1Score == p2Score && p1Score == p3Score) {
    alert("Tie!");
  } else if (p1Score > p2Score && p1Score > p3Score) {
    alert("Player 1 wins!");
  } else if (p2Score > p1Score && p2Score > p3Score) {
    alert("Player 2 wins!");
  } else if (p3Score > p2Score && p3Score > p1Score) {
    alert("Player 3 wins!");
  } else if (p1Score == p2Score && p1Score > p3Score) {
    alert("Player 1 and Player 2 ties!");
  } else if (p2Score == p3Score && p2Score > p1Score) {
    alert("Player 2 and Player 3 ties!");
  } else if (p1Score == p3Score && p1Score > p2Score) {
    alert("Player 1 and Player 3 ties!");
  }
}

function getPlayerColor(player, hover) {//get the current player's color. hover =1 if want to get player's hover color
  switch (player) {
    case 1:
      if (hover == 1) {
        return P1_COLOR_HOVER;
      } else {
        return P1_COLOR;
      }
    case 2:
      if (hover == 1) {
        return P2_COLOR_HOVER;
      } else {
        return P2_COLOR;
      }
    case 3:
      if (hover == 1) {
        return P3_COLOR_HOVER;
      } else {
        return P3_COLOR;
      }
  }
}

//The following functions are about the page logic and game status

function updateScoreBoard() {//update the score board with most recent scores
  p1ScoreBoard.innerText = "Player 1 Score: "+p1Score;
  p2ScoreBoard.innerText = "Player 2 Score: "+p2Score;
  p3ScoreBoard.innerText = "Player 3 Score: "+p3Score;
}

function updateDimensions() {//update canvas dimensions to fit the cuurent window
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);//clear previous canvas with old dimensions
  //update dimensions
  HEIGHT = window.innerHeight * 0.7;
  WIDTH = window.innerWidth * 0.7;
  if (HEIGHT >= WIDTH) {
    HEIGHT = WIDTH;
  } else {
    WIDTH = HEIGHT;
  }
  BOX_SIZE = WIDTH / (GRID_SIZE + 2);
  STROKE = BOX_SIZE / 12;
  DOT = STROKE;
  TOP_MARGIN = HEIGHT - (GRID_SIZE + 1) * BOX_SIZE;
  SHIFT_TO_LEFT = (window.innerWidth - WIDTH) / 2;
  if(boxes.length==GRID_SIZE){//if boxes is initialized
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        boxes[i][j].resetDimensions(SHIFT_TO_LEFT + BOX_SIZE * (j + 1), TOP_MARGIN + BOX_SIZE * i, BOX_SIZE, BOX_SIZE);//update dimensions for boxes
      }
    }
  }
  canvas.height = HEIGHT;
  canvas.width = WIDTH + SHIFT_TO_LEFT;
  canvasContext.lineWidth = STROKE;

  //redraw canvas with new dimensions
  let starting_page_status = document.getElementById("starting_page").style.display;
  if (starting_page_status == "none") {//only need to redraw when game board page is showing
    drawBoard();
    drawBoxes();
    drawGrid();
  }
}

function restart() {//restart the game
  //set up necessary variables and create boxes based on grid size
  gameRunning = true;//set game running flag to true
  canvas.style.display = "block";//show canvas game board
  clear();//reset game status
}

function start() {//start the game from home page. 
  //Remove home page and display game board
  let home = document.getElementById("starting_page");
  home.style.display = "none";
  let gamePage = document.getElementById("game_page");
  gamePage.style.display = "flex";
  gamePage.style.flexDirection = "column"
  gamePage.style.alignItems = "center"
  gamePage.style.flexWrap = "wrap";
  restart();//start game
}

function back() {//go back to the home page from game board. Remove game board and display home page
  clear();//clear game status
  gameRunning = false;//set game running flag to false
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);//clear canvas
  //Remove game board and display home page
  let home = document.getElementById("starting_page");
  home.style.display = "flex";
  home.style.flexDirection = "column"
  home.style.alignItems = "center"
  let gamePage = document.getElementById("game_page");
  gamePage.style.display = "none";
}

function clear() {//reset the game status
  p1Score = p2Score = p3Score = totalScore = 0;
  GRID_SIZE = parseInt(document.getElementById("gs").value);//The grid size of game boxes
  BOX_SIZE = WIDTH / (GRID_SIZE + 2);//the standard length of box sides
  STROKE = BOX_SIZE / 12;//the standard line width
  DOT = STROKE;//the standard dot radius
  TOP_MARGIN = HEIGHT - (GRID_SIZE + 1) * BOX_SIZE;
  canvasContext.lineWidth = STROKE;

  currentTurn = 1;
  for (let i = 0; i < GRID_SIZE; i++) {
    boxes[i] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      boxes[i][j] = new Box(SHIFT_TO_LEFT + BOX_SIZE * (j + 1), TOP_MARGIN + BOX_SIZE * i, BOX_SIZE, BOX_SIZE);
    }
  }
}

//Section 3 ends-----------------------------------------------------------------------------------------------------------------------------------------------------