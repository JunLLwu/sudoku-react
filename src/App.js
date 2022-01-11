import React from 'react';
import Papa from 'papaparse';
import './css/sudoku.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil } from '@fortawesome/free-solid-svg-icons';

import PencilCell from './pencilCell.js';

var timeID;

class Sudoku extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      puzzle: '',                 // Stores the present game board in a string of 81 numerical characters
      prevBoards: [],             // Array of previous boards to use for undo
      solution: '',               // Stores the solution to the game board in a string of 81 numerical characters
      selectedID: '',             // The ID of the current selected cell
      defaultCell: [],            // Stores the ID of the given cells from the puzzle
      highlightedVal: [],         // Stores the ID of all cells that share the same value
      incorrectVal: [],           // Stores the ID of all incorrect values at the instance when called upon
      pencil: 0,                  // Toggle if the input is answer or guess
      hintsUsed: 0,               // Keep track of hints used
      time: 0,                    // Timer
      play: 0,                    // Store state of game (play/pause)
      win: 0                      // If the game is won or not
    };

    this.newGame = this.newGame.bind(this);

    this.cellRefs = [];
    // this.cellRefs = createRef();
  }

  parseData() {
    // Read .csv file and parse it for reading
    let csvPath = require('./data/samplecsv.csv');

    Papa.parse(csvPath, {
      header: false,
      download: true,
      skipEmptyLines: true,
      complete: this.newGame
    });
  }

  newGame(result) {
    // Take in the data from the parsed .csv file and take one random line
    const data = result.data;
    let r = Math.floor(Math.random() * 1000) + 1;
    let tempDefault = [];
    // Identify the ID of all the non-zero givens from the current puzzle and push to an array
    for(let i = 0; i < 81; i++) { if(data[r][0][i] !== '0') { tempDefault.push(i); } }

    // Clear timer and reset all values
    clearInterval(timeID);
    this.setState({puzzle: data[r][0],
                   solution: data[r][1],
                   selectedID: '',
                   defaultCell: tempDefault,
                   prevBoards: [],
                   highlightedVal: [],
                   incorrectVal: [],
                   pencil: 0,
                   hintsUsed: 0,
                   time: 0,
                   play: 0,
                   won: 0
                 });
  }

  keyInput(input) {
    if(input.key === 'p' && !this.state.won) {
      this.toggleMode();
      return;
    }

    if(!this.state.play || this.state.won) { return; }

    // If the input is a number
    if(isFinite(input.key) && input.key !== ' ') {
      this.inputNum(input.key);
    } else {
      // Move the selected cell with arrows
      // Allow use of Delete and Backspace to clear cells
      switch(input.key) {
        case 'ArrowLeft':
          if(this.state.selectedID === '') { this.setState({selectedID: 0}); }
          else if(this.state.selectedID % 9 !== 0) { this.setState({selectedID: this.state.selectedID - 1}); }
          break;
        case 'ArrowRight':
          if(this.state.selectedID === '') { this.setState({selectedID: 0}); }
          else if(this.state.selectedID % 9 !== 8) { this.setState({selectedID: this.state.selectedID + 1}); }
          break;
        case 'ArrowUp':
          if(this.state.selectedID === '') { this.setState({selectedID: 0}); }
          else if(this.state.selectedID > 8) { this.setState({selectedID: this.state.selectedID - 9}); }
          break;
        case 'ArrowDown':
          if(this.state.selectedID === '') { this.setState({selectedID: 0}); }
          else if(this.state.selectedID < 72) { this.setState({selectedID: this.state.selectedID + 9}); }
          break;
        case 'Delete':
        case 'Backspace':
          if(this.state.selectedID === '') { break; }
          else { this.inputNum(0); }
          break;
      }
    }
  }

  inputNum(num) {
    // Check that there is a selected cell and it is not a given cell
    if(this.state.selectedID !== '' && this.state.defaultCell.indexOf(this.state.selectedID) === -1) {
      if(!this.state.pencil) {
        let tempBoard = this.state.puzzle.substring(0, this.state.selectedID) + num + this.state.puzzle.substring(this.state.selectedID + 1);

        let tempMoves = this.state.prevBoards;
        let tempInc = this.state.incorrectVal;

        // Make a copy of the previous board array and push the current board into it before changing the board
        // If the selected ID is in the incorrect ID array, remove it from the array
        tempMoves.push(this.state.puzzle);
        if(tempInc.indexOf(this.state.selectedID) > -1) { tempInc.splice(tempInc.indexOf(this.state.selectedID), 1); }

        this.setState({puzzle: tempBoard, prevBoards: tempMoves, incorrectVal: tempInc},
                      () => {
                        this.setHighlights(this.state.selectedID);
                        this.checkGameState();
                      });
      } else if(this.state.puzzle[this.state.selectedID] === '0') {
        this.cellRefs[this.state.selectedID].toggleDisplay(num);
      }
    }
  }

  clearCell() {
    // Either clear the cell or the pencil cell
    if(this.state.puzzle[this.state.selectedID] === '0') {
      this.cellRefs[this.state.selectedID].clearCell();
    } else {
      let tempBoard = this.state.puzzle.substring(0, this.state.selectedID) + '0' + this.state.puzzle.substring(this.state.selectedID + 1);

      let tempMoves = this.state.prevBoards;
      let tempInc = this.state.incorrectVal;

      // Make a copy of the previous board array and push the current board into it before changing the board
      // If the selected ID is in the incorrect ID array, remove it from the array
      tempMoves.push(this.state.puzzle);
      if(tempInc.indexOf(this.state.selectedID) > -1) { tempInc.splice(tempInc.indexOf(this.state.selectedID), 1); }

      this.setState({puzzle: tempBoard, prevBoards: tempMoves, incorrectVal: tempInc},
                    () => {
                      this.setHighlights(this.state.selectedID);
                      this.checkGameState();
                    });
    }
  }

  toggleMode() {
    // If play is 0 (game is paused/not started yet) then set the game to play and start the timer
    // If play is 1 (game is in play) then we stop the time
    if(!this.state.play) { timeID = setInterval(() => { this.setState({time: this.state.time + 1}) }, 1000);
    } else { clearInterval(timeID); }
    this.setState({play: this.state.play ? 0 : 1});
  }

  checkGameState() {
    // Check if the puzzle matches the solution
    if(this.state.puzzle === this.state.solution) {
      clearInterval(timeID);
      this.setState({selectedID: '', highlightedVal: [], incorrectVal: [], won: 1});
    }
  }

  checkCells() {
    let tempInc = [];
    // Go through the whole puzzle string and compare with the solution
    // If any non-zero values do not match, push the index into an array
    for(let i = 0; i < 81; i++) {
      if((this.state.puzzle[i] !== '0') && (this.state.puzzle[i] !== this.state.solution[i])) { tempInc.push(i); }
    }
    this.setState({incorrectVal: tempInc});
  }

  undoMove() {
    // Set the board to the previous moves and then remove the most recent move from the array
    let moveCopy = this.state.prevBoards;
    let tempInc = this.state.incorrectVal;
    let prevMove = moveCopy[moveCopy.length - 1];
    let undoID;

    for(let i = 0; i < 81; i++) {
      if(prevMove[i] !== this.state.puzzle[i]) {
        undoID = i;
        if(tempInc.indexOf(undoID) > -1) { tempInc.splice(tempInc.indexOf(undoID), 1); }
        break;
      }
    }

    moveCopy.pop();
    this.setState({puzzle: prevMove, prevBoards: moveCopy, selectedID: undoID, incorrectVal: tempInc});
  }

  resetBoard() {

    for(let i = 0; i < 81; i++) {
      if(this.state.puzzle[i] === '0') {
        this.cellRefs[i].clearCell();
      }
    }

    clearInterval(timeID);
    this.setState({puzzle: this.state.prevBoards[0],
                   prevBoards: [],
                   selectedID: '',
                   highlightedVal: [],
                   incorrectVal: [],
                   pencil: 0,
                   hintsUsed:0,
                   time: 0,
                   play: 0,
                   won: 0
                 });
  }

  invertCell() {
    this.setState({pencil: 1}, () => this.cellRefs[this.state.selectedID].invertDisplay());
  }

  giveHint() {
    // Find the first incorrect answer and correct it
    for(let i = 0; i < 81; i++) {
      if((this.state.puzzle[i] !== '0') && (this.state.puzzle[i] !== this.state.solution[i])) {
        this.setState({selectedID: i, hintsUsed: this.state.hintsUsed + 1}, () => this.inputNum(this.state.solution[i]));
        return;
      }
    }

    // If there are no incorrect cells, fill in the selected cell
    if(this.state.selectedID !== '' && this.state.puzzle[this.state.selectedID] === '0') {
      this.setState({hintsUsed: this.state.hintsUsed + 1}, () => this.inputNum(this.state.solution[this.state.selectedID]));
      return;
    }

    // If there are no incorrect cells and no selected cells, set the first empty cell to the correct answer
    let firstZero = this.state.puzzle.indexOf(0);
    this.setState({selectedID: firstZero, hintsUsed: this.state.hintsUsed + 1}, () => this.inputNum(this.state.solution[firstZero]));
  }

  togglePencil() {
    this.setState({pencil: this.state.pencil ? 0 : 1});
  }

  selectCell(id) {
    if(!this.state.play || this.state.won) { return; }

    // If the current cell is already selected, unselect it
    if(this.state.selectedID === id) {
      this.setState({selectedID: '', highlightedVal: []});
    } else {
      // Select the current cell
      this.setState({selectedID: id}, () => this.setHighlights(id));
    }
  }

  setHighlights(id) {
    let tempHighlight = [];

    if(this.state.puzzle[id] === '0') {
      this.setState({highlightedVal: tempHighlight});           // If the selected cell value is 0 (empty), don't highlight anything
    } else {
      // If the value is non-zero, find all cells that share a value with the selected cell and push them to the highlighted array
      for(let i = 0; i < 81; i++) { if(this.state.puzzle[i] === this.state.puzzle[id]) { tempHighlight.push(i); } }
      this.setState({highlightedVal: tempHighlight});
    }
  }

  getClass(id) {
    let defaultClass = "cell";                                                                                              // Default class cell
    if(this.state.selectedID === id) { defaultClass += " selected"; }                                                       // If current cell is selected
    if(this.state.defaultCell.indexOf(id) > -1) { defaultClass += " default"; }                                             // If current cell is a given value
    if((this.state.highlightedVal) && (this.state.highlightedVal.indexOf(id) > -1)) { defaultClass += " highlighted"; }     // If current cell shares a value with the selected cell
    if((id % 9 === 2) || (id % 9 === 5)) { defaultClass += " border-right"; }                                               // If the current cell is on the right edge of a 3x3 square
    if((17 < id && id < 27) || (44 < id && id < 54)) { defaultClass += " border-bottom"}                                    // If the current cell is on the bottom edge of a 3x3 square
    if((this.state.incorrectVal) && (this.state.incorrectVal.indexOf(id) > -1)) { defaultClass += " incorrect"; }           // If the current cell is incorrect
    if(this.state.won === 1) { defaultClass += " completed"; }                                                              // If the current game is won
    return defaultClass;
  }

  componentDidMount() {
    this.parseData();

    const body = document.querySelector('body');
    body.addEventListener('keydown', this.keyInput.bind(this));
  }

  render () {
    let numPadButtons = [];
    for(let i = 0; i < 9; i++) {
      numPadButtons.push(<button onClick={() => this.inputNum(i + 1)} key={i}>{i+1}</button>);
    }

    let playButtons = <div className="ingame-button">
                        <div className="check-hint-wrapper">
                          <button onClick={() => this.checkCells()} disabled={this.state.won}>Check</button>
                          <button onClick={() => this.setState({pencil: 0}, () => this.giveHint())} disabled={this.state.won}>Hint</button>
                        </div>
                        <div className="clear-wrapper">
                          <button onClick={() => this.undoMove()} disabled={this.state.won || this.state.prevBoards.length === 0}>Undo</button>
                          <button onClick={() => this.resetBoard()} disabled={this.state.prevBoards.length === 0}>Reset</button>
                          <button onClick={() => this.clearCell()} disabled={this.state.won}>Clear</button>
                        </div>
                        <div className="num-pad">
                          {numPadButtons}
                        </div>
                        <div className="pencil-wrapper">
                          <button className={this.state.pencil && "clicked"} onClick={() => this.togglePencil()}><FontAwesomeIcon icon={faPencil} /></button>
                          <button onClick={() => this.invertCell()} disabled={this.state.puzzle[this.state.selectedID] !== '0'}>Invert</button>
                        </div>
                      </div>;

    return (
      <div className="app-wrapper disable-select">
        <div className="game-board">
          {this.state.puzzle.split('').map((num, id) => {
            return (num !== '0') ?
              <div className={(this.state.play) ? this.getClass(id) : this.getClass(id) + " hiddenCell"} key={id} onClick={() => this.selectCell(id)} ref={cellRefs => this.cellRefs[id] = cellRefs}>{(this.state.play) ? num : '?'}</div>
              : <PencilCell className={(this.state.play) ? this.getClass(id) : this.getClass(id) + " hiddenCell-pencil"} key={id} onButtonClick={() => this.selectCell(id)} ref={cellRefs => this.cellRefs[id] = cellRefs} />
          })}
        </div>
        <div className="stats-button">
          <div className="timer">{Math.floor(this.state.time / 60) + ":" + (this.state.time % 60).toLocaleString('en-US', {
            minimumIntegerDigits: 2,
            useGrouping: false
          })}</div>
          <div className="pause-message">{(this.state.won) ? "You have won!" : ((!this.state.play) && "Press Play to start")}</div>
          <div className="hints-message">{this.state.won ? ("You used " + this.state.hintsUsed + " hints") : " "}</div>
          <div className="button-wrapper">
            <button className="button" onClick={() => this.parseData()}>New Puzzle</button>
            <button className="button" onClick={() => this.toggleMode()} disabled={this.state.won}>{(!this.state.play || this.state.won) ? 'Play' : 'Pause'}</button>
          </div>
          {(this.state.play && !this.state.won) ? playButtons : ' '}
          <div className="instructions">
            <div>Arrow keys to move around the board</div>
            <div>Number keys to fill in cells</div>
            <div>Backspace/Delete to clear a cell</div>
            <div>C to check answer, H for hint</div>
            <div>R to reset the board, U to undo previous move</div>
            <div>G to toggle pencil, I to invert pencil cell</div>
            <div>P to play/pause</div>
          </div>
        </div>
      </div>
    );
  }
}

export default Sudoku;
