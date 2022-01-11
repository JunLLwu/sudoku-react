import React from 'react';
import './css/sudoku.css';

class PencilCell extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      display: [0, 0, 0, 0, 0, 0, 0, 0, 0]
    };
  }

  toggleDisplay(num) {
    let tempDisplay = this.state.display;
    tempDisplay[num - 1] = !this.state.display[num - 1];
    this.setState({display: tempDisplay});
  }

  invertDisplay() {
    let tempDisplay = this.state.display;
    for(let i = 0; i < 9; i++) {
      tempDisplay[i] = !this.state.display[i];
    }
    this.setState({display: tempDisplay});
  }

  clearCell() {
    this.setState({display: [0, 0, 0, 0, 0, 0, 0, 0, 0]});
  }

  render() {
    return (
      <div className={this.props.className + " pencil-cell"} onClick={this.props.onButtonClick}>
        {this.state.display.map((x, i) => (
          <div className="guess" key={i}>{this.state.display[i] ? (i + 1) : " "}</div>
        ))}
      </div>
    )
  }
}

export default PencilCell;
