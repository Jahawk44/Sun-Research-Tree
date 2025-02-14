// globals.js

// Global state variables
let mode = "view"; // default mode is view
let nodes = [];    // holds node data objects
let connections = []; // holds connection data objects

// Global constants for node dimensions and grid size
const NODE_WIDTH = 150;
const NODE_HEIGHT = 100;
const GRID_SIZE = 50;  // grid spacing for align mode

// Global variables for align mode (grid snapping)
let alignMode = false;  // toggled via the align button in editor mode
let guideLayer;         // layer for grid lines

// Konva stage and layers
let stage, nodeLayer, connectionLayer, tempLayer;
let tempCurve = null;       // temporary connection curve
let connectionStart = null; // stores info when starting a connection
