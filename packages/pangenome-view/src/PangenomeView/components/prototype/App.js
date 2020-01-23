import {render} from 'react-dom';
import {Layer, Stage} from 'react-konva';
import React, {Component} from 'react';

import './App.css';
import PangenomeSchematic from './PangenomeSchematic'
import ComponentRect from './ComponentRect'
import LinkColumn from './LinkColumn'
import LinkArrow from './LinkArrow'
import {calculateLinkCoordinates} from "./LinkRecord";
import  './ViewportInputs';
import {AppView, store} from "./ViewportInputs";

function stringToColor(linkColumn, highlightedLinkColumn) {
    let colorKey = (linkColumn.downstream + 1) * (linkColumn.upstream + 1);
    if (highlightedLinkColumn && colorKey
        === (highlightedLinkColumn.downstream + 1) * (highlightedLinkColumn.upstream + 1)) {
        return 'black';
    } else {
        return stringToColourSave(colorKey);
    }
}

const stringToColourSave = function(colorKey) {
    colorKey = colorKey.toString();
    let hash = 0;
    for (let i = 0; i < colorKey.length; i++) {
        hash = colorKey.charCodeAt(i) + ((hash << 5) - hash);
    }
    let colour = '#';
    for (let j = 0; j < 3; j++) {
        let value = (hash >> (j * 8)) & 0xFF;
        colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
};

class App extends Component {
    layerRef = React.createRef();
    static defaultProps = {beginBin:0,
        endBin:525,
        binsPerPixel:6,
        paddingSize:2,
        leftOffset:10
    };
    constructor(props) {
        Object.assign(App.defaultProps, props);
        super(props);
        let schematic = new PangenomeSchematic(props);
        console.log(schematic.pathNames.length);
        const sum = (accumulator, currentValue) => accumulator + currentValue;
        let actualWidth = this.props.leftOffset + schematic.components.map(component =>
            component.arrivals.length + component.departures.length + (component.lastBin - component.firstBin) + 1 + this.props.paddingSize
        ).reduce(sum) * this.props.binsPerPixel;
        console.log(actualWidth);
        // console.log(schematic.components);

        this.state = {
            schematize: schematic.components,
            pathNames: schematic.pathNames,
            topOffset: 400,
            pathsPerPixel: 1,
            actualWidth: actualWidth,
            highlightedLink: 0 // we will compare linkColumns
        };
        this.updateHighlightedNode = this.updateHighlightedNode.bind(this);

        let [links, top] =
            calculateLinkCoordinates(schematic.components, this.props.binsPerPixel, this.state.topOffset,
                this.leftXStart.bind(this));
        this.distanceSortedLinks = links;
        this.state.topOffset = top;
    };

    componentDidMount = () => {
        this.layerRef.current.getCanvas()._canvas.id = 'cnvs';
    };

    updateHighlightedNode = (linkRect) => {
        this.setState({highlightedLink: linkRect})
    };

    leftXStart(schematizeComponent, i) {
        return (schematizeComponent.firstBin - this.props.beginBin) + (i * this.props.paddingSize) + schematizeComponent.offset;
    }


    renderComponent(schematizeComponent, i) {
        return (
            <React.Fragment>
                <ComponentRect
                    item={schematizeComponent}
                    key={i}
                    x={this.state.schematize[i].x + this.props.leftOffset}
                    y={this.state.topOffset}
                    height={this.state.pathNames.length * this.state.pathsPerPixel}
                    width={(schematizeComponent.leftPadding() + schematizeComponent.departures.length) * this.props.binsPerPixel}
                />

                {schematizeComponent.arrivals.map(
                    (linkColumn, j) => {
                        let leftPad = 0;
                        return this.renderLinkColumn(schematizeComponent, i, leftPad, j, linkColumn);
                    }
                )}
                {schematizeComponent.departures.map(
                    (linkColumn, j) => {
                        let leftPad = schematizeComponent.leftPadding();
                        return this.renderLinkColumn(schematizeComponent, i, leftPad, j, linkColumn);
                    }
                )}
            </React.Fragment>
        )
    }

    renderLinkColumn(schematizeComponent, i, leftPadding, j, linkColumn) {
        let xCoordArrival = this.props.leftOffset + (this.leftXStart(schematizeComponent,i) + leftPadding + j) * this.props.binsPerPixel;
        let localColor = stringToColor(linkColumn, this.state.highlightedLink);
        return <LinkColumn
            key={"departure" + i + j}
            item={linkColumn}
            pathNames={this.state.pathNames}
            x={xCoordArrival}
            pathsPerPixel={this.state.pathsPerPixel}
            y={this.state.topOffset}
            width={this.props.binsPerPixel}
            color={localColor}
            updateHighlightedNode={this.updateHighlightedNode}
        />
    }

    renderLinks(link) {
        /*Translates the LinkRecord coordinates into pixels and defines the curve shape.
        * I've spent way too long fiddling with these numbers at different binsPerPixel
        * I suggest you don't fiddle with them unless you plan on nesting the React
        * Components to ensure that everything is relative coordinates.*/
        let [arrowXCoord, absDepartureX] = [link.xArrival, link.xDepart];
        // put in relative coordinates to arriving LinkColumn
        let departureX = absDepartureX - arrowXCoord + this.props.binsPerPixel/2;
        let arrX = this.props.binsPerPixel/2;
        let bottom = -2;//-this.props.binsPerPixel;
        let turnDirection = (departureX < 0)? -1 : 1;
        const departOrigin = [departureX, this.props.binsPerPixel-2];
        const departCorner = [departureX - turnDirection, -link.elevation + 2];
        let departTop = [departureX - (turnDirection*6), -link.elevation];
        let arriveTop = [arrX + turnDirection*6, -link.elevation];
        let arriveCorner = [arrX + turnDirection, -link.elevation + 2]; // 1.5 in from actual corner
        const arriveCornerEnd = [arrX, -5];
        let points = [
            departOrigin[0], departOrigin[1],
            departCorner[0], departCorner[1],
            departTop[0], departTop[1],
            arriveTop[0], arriveTop[1],
            arriveCorner[0], arriveCorner[1],
            arriveCornerEnd[0], arriveCornerEnd[1],
            arrX, -1];
        if (Math.abs(departureX) <= this.props.binsPerPixel) { //Small distances, usually self loops
            if(link.isArrival){
                points = [
                    arrX, -10,//-link.elevation - 4,
                    arrX, bottom];
            }else{
                points = [
                    departOrigin[0], bottom + this.props.binsPerPixel,
                    departOrigin[0], -5];//-link.elevation-this.props.binsPerPixel*2,];
            }

        }
        if(points.some(isNaN)){
            console.log(points);
        }
        return <LinkArrow
            key={"arrow" + link.linkColumn.key}
            x={arrowXCoord + this.props.leftOffset}
            y={this.state.topOffset - 5}
            points={points}
            width={this.props.binsPerPixel}
            color={stringToColor(link.linkColumn, this.state.highlightedLink)}
            updateHighlightedNode={this.updateHighlightedNode}
            item={link.linkColumn}
        />
    }

    render() {
        console.log("Start render");
        return (
            <React.Fragment>
                <AppView store={store} />
                <Stage
                    width={this.state.actualWidth + 20}
                    height={this.state.topOffset + this.state.pathNames.length * this.state.pathsPerPixel}>
                    <Layer ref={this.layerRef}>
                        {this.state.schematize.map(
                            (schematizeComponent, i)=> {
                                return (
                                    <React.Fragment key={"f" + i}>
                                        {/*These two lines could be in separate for loops if you want control over ordering*/}
                                        {this.renderComponent(schematizeComponent, i)}
                                    </React.Fragment>
                                )
                            }
                        )}
                        {this.distanceSortedLinks.map(
                            (record,i ) => {
                                return (<React.Fragment key={'L'+ i}>
                                    {this.renderLinks(record)}
                                </React.Fragment>)
                            }
                        )}
                    </Layer>
                </Stage>
            </React.Fragment>
        );
    }

}

// render(<App />, document.getElementById('root'));

export default App;
