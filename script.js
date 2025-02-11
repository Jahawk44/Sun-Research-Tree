/* script.js */

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

// Initialize the Konva stage and layers
function initStage() {
  // Set stage width to a larger value (e.g., 3000) for horizontal scrolling.
  stage = new Konva.Stage({
    container: 'container',
    width: 3000,
    height: window.innerHeight,
    draggable: false // no panning via dragging
  });

  // Create a separate layer for grid guidelines.
  guideLayer = new Konva.Layer();

  connectionLayer = new Konva.Layer();
  nodeLayer = new Konva.Layer();
  tempLayer = new Konva.Layer();
  stage.add(guideLayer);
  stage.add(connectionLayer);
  stage.add(nodeLayer);
  stage.add(tempLayer);
}
initStage();

// ---------------------------
// DESELECT PENDING CONNECTION WHEN CLICKING BACKGROUND
// ---------------------------
stage.on('click', function (e) {
  if (mode === 'editor' && connectionStart) {
    if (e.target === stage) {
      connectionStart = null;
      if (tempCurve) {
        tempCurve.destroy();
        tempCurve = null;
        tempLayer.draw();
      }
    }
  }
});

// ---------------------------
// HELPER FUNCTIONS
// ---------------------------
function getCropParameters(img, containerWidth, containerHeight) {
  let imageAspect = img.width / img.height;
  let containerAspect = containerWidth / containerHeight;
  let cropX = 0, cropY = 0, cropWidth = img.width, cropHeight = img.height;
  if (imageAspect > containerAspect) {
    cropWidth = img.height * containerAspect;
    cropX = (img.width - cropWidth) / 2;
  } else if (imageAspect < containerAspect) {
    cropHeight = img.width / containerAspect;
    cropY = (img.height - cropHeight) / 2;
  }
  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
}

function getAbsoluteDotPosition(group, dot) {
  let groupPos = group.getAbsolutePosition();
  return {
    x: groupPos.x + dot.x(),
    y: groupPos.y + dot.y()
  };
}

// Draw grid lines on the guide layer (called when align mode is active)
function drawGrid() {
  guideLayer.destroyChildren();
  let gridLines = [];
  // Vertical lines
  for (let x = 0; x < stage.width(); x += GRID_SIZE) {
    gridLines.push(new Konva.Line({
      points: [x, 0, x, stage.height()],
      stroke: '#444',
      strokeWidth: 1,
      dash: [4, 4]
    }));
  }
  // Horizontal lines
  for (let y = 0; y < stage.height(); y += GRID_SIZE) {
    gridLines.push(new Konva.Line({
      points: [0, y, stage.width(), y],
      stroke: '#444',
      strokeWidth: 1,
      dash: [4, 4]
    }));
  }
  gridLines.forEach(line => guideLayer.add(line));
  guideLayer.draw();
}

// ---------------------------
// MODE SWITCHING & TOOLBAR
// ---------------------------
document.getElementById('modeSwitch').addEventListener('click', function () {
  if (mode === 'view') {
    let pass = prompt("Enter admin password to enter Editor Mode:");
    if (pass === "admin13") {
      mode = "editor";
      this.textContent = "Switch to View Mode";
      document.getElementById('addNode').style.display = "inline-block";
      document.getElementById('alignNodes').style.display = "inline-block";
      document.getElementById('saveTree').style.display = "inline-block";
      document.getElementById('loadTree').style.display = "inline-block";
      nodes.forEach(n => updateNodeAppearance(n));
      alert("Editor Mode activated!");
    } else {
      alert("Incorrect password!");
    }
  } else {
    mode = "view";
    this.textContent = "Switch to Editor Mode";
    document.getElementById('addNode').style.display = "none";
    document.getElementById('alignNodes').style.display = "none";
    document.getElementById('saveTree').style.display = "none";
    document.getElementById('loadTree').style.display = "none";
    // Exit align mode if active.
    if (alignMode) {
      alignMode = false;
      document.getElementById('alignNodes').textContent = "Enter Align Mode";
      guideLayer.destroyChildren();
      guideLayer.draw();
    }
    hideNodeModal();
    nodes.forEach(n => updateNodeAppearance(n));
    alert("Switched to View Mode.");
  }
});

// The align button now toggles grid alignment mode.
document.getElementById('alignNodes').addEventListener('click', function () {
  alignMode = !alignMode;
  this.textContent = alignMode ? "Exit Align Mode" : "Enter Align Mode";
  if (alignMode) {
    drawGrid();
  } else {
    guideLayer.destroyChildren();
    guideLayer.draw();
  }
});

document.getElementById('addNode').addEventListener('click', function () {
  addNode(100, 100);
});

// ---------------------------
// NODE CREATION & EDITING
// ---------------------------
function addNode(x, y) {
  let nodeId = nodes.length;
  let group = new Konva.Group({
    x: x,
    y: y,
    draggable: true,
    id: 'node-' + nodeId
  });

  // Background rectangle with a stroke to distinguish it from the background.
  let rect = new Konva.Rect({
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    cornerRadius: 8,
    name: 'nodeRect',
    stroke: '#888',
    strokeWidth: 2
  });
  group.add(rect);

  let titleText = new Konva.Text({
    text: "Title",
    fontSize: 16,
    fill: "rgba(255,255,255,0.9)",
    width: NODE_WIDTH,
    align: 'center',
    y: 5,
    name: 'titleText'
  });
  group.add(titleText);

  let descText = new Konva.Text({
    text: "Description",
    fontSize: 12,
    fill: "rgba(255,255,255,0.9)",
    width: NODE_WIDTH,
    align: 'center',
    y: 30,
    name: 'descText'
  });
  group.add(descText);

  let lockIcon = new Konva.Text({
    text: "🔒",
    fontSize: 30,
    fill: '#fff',
    width: NODE_WIDTH,
    align: 'center',
    y: NODE_HEIGHT / 2 - 20,
    name: 'lockIcon'
  });
  group.add(lockIcon);

  // Delete icon for the block (visible on hover in editor mode)
  let deleteButton = new Konva.Text({
    text: "✖",
    fontSize: 16,
    fill: 'red',
    visible: false,
    name: 'deleteButton'
  });
  deleteButton.position({ x: NODE_WIDTH - 20, y: 5 });
  group.add(deleteButton);
  group.on('mouseenter', function () {
    if (mode === 'editor') {
      deleteButton.visible(true);
      group.draw();
    }
  });
  group.on('mouseleave', function () {
    deleteButton.visible(false);
    group.draw();
  });
  deleteButton.on('click', function (e) {
    e.cancelBubble = true;
    if (window.confirm("Are you sure you want to delete this block?")) {
      deleteNode(group);
    }
  });

  // Input dot (left) for incoming connections.
  let inputDot = new Konva.Circle({
    x: 0,
    y: NODE_HEIGHT / 2,
    radius: 6,
    fill: 'gray',
    stroke: 'black',
    strokeWidth: 1,
    name: 'inputDot'
  });
  inputDot.on('mouseup touchend', function (e) {
    if (mode !== 'editor' || !connectionStart) return;
    e.cancelBubble = true;
    if (this.hasName('inputDot') && connectionStart.node !== group) {
      let fromGroup = connectionStart.node;
      let toGroup = group;
      let fromPos = getAbsoluteDotPosition(fromGroup, fromGroup.findOne('.outputDot'));
      let toPos = getAbsoluteDotPosition(toGroup, inputDot);
      createConnection(fromGroup, toGroup, fromPos, toPos);
    }
    connectionStart = null;
    if (tempCurve) {
      tempCurve.destroy();
      tempCurve = null;
    }
    tempLayer.draw();
  });
  group.add(inputDot);

  // Output dot (right) for releasing connections.
  let outputDot = new Konva.Circle({
    x: NODE_WIDTH,
    y: NODE_HEIGHT / 2,
    radius: 6,
    fill: 'gray',
    stroke: 'black',
    strokeWidth: 1,
    name: 'outputDot'
  });
  outputDot.on('mousedown touchstart', function (e) {
    if (mode !== 'editor') return;
    e.cancelBubble = true;
    connectionStart = {
      node: group,
      dot: outputDot,
      pos: getAbsoluteDotPosition(group, outputDot)
    };
    tempCurve = createBezierCurve(connectionStart.pos, connectionStart.pos);
    tempLayer.add(tempCurve);
  });
  group.add(outputDot);

  // Drag events – with grid snapping if align mode is active.
  group.on('dragmove', function () {
    if (mode === 'editor' && alignMode) {
      // Snap the node's position to the grid.
      let newX = Math.round(group.x() / GRID_SIZE) * GRID_SIZE;
      let newY = Math.round(group.y() / GRID_SIZE) * GRID_SIZE;
      group.x(newX);
      group.y(newY);
    }
    updateConnectionsForNode(group);
  });
  // No need for a guideline removal on dragend now because the grid remains visible in align mode.

  // In view mode, clicking attempts to unlock the block.
  group.on('click', function () {
    if (mode === 'view') {
      let nodeData = nodes.find(n => n.group === group);
      if (!nodeData.unlocked) {
        let prerequisitesMet = true;
        connections.forEach(conn => {
          if (conn.to === group) {
            let fromNodeData = nodes.find(n => n.group === conn.from);
            if (!fromNodeData.unlocked) {
              prerequisitesMet = false;
            }
          }
        });
        if (prerequisitesMet) {
          nodeData.unlocked = true;
          updateNodeAppearance(nodeData);
          let tween = new Konva.Tween({
            node: group,
            duration: 0.5,
            scaleX: 1.1,
            scaleY: 1.1,
            yoyo: true,
            onFinish: function() {
              updateNodeAppearance(nodeData);
            }
          });
          tween.play();
        } else {
          alert("Prerequisites not met!");
        }
      }
    }
  });
  // In view mode, double–clicking an unlocked block locks it again.
  group.on('dblclick', function () {
    if (mode === 'view') {
      let nodeData = nodes.find(n => n.group === group);
      if (nodeData.unlocked) {
        nodeData.unlocked = false;
        updateNodeAppearance(nodeData);
      }
    }
    if (mode === 'editor') {
      let absPos = group.getAbsolutePosition();
      showNodeEdit(absPos, group);
    }
  });

  nodeLayer.add(group);
  let nodeData = {
    id: nodeId,
    group: group,
    title: "Title",
    description: "Description",
    imageData: null,
    unlocked: false
  };
  nodes.push(nodeData);
  updateNodeAppearance(nodeData);

  // Fade–in animation.
  group.opacity(0);
  group.to({ opacity: 1, duration: 0.5 });
  nodeLayer.draw();
}

// Update the appearance of a node based on its state.
function updateNodeAppearance(nodeData) {
  let group = nodeData.group;
  let rect = group.findOne('.nodeRect');
  let titleText = group.findOne('.titleText');
  let descText = group.findOne('.descText');
  let lockIcon = group.findOne('.lockIcon');
  let imageElem = group.findOne('.nodeImage');
  let inputDot = group.findOne('.inputDot');
  let outputDot = group.findOne('.outputDot');

  if (mode === "view") {
    inputDot.visible(false);
    outputDot.visible(false);
    if (nodeData.unlocked) {
      titleText.visible(true);
      descText.visible(true);
      if (imageElem) imageElem.visible(true);
      lockIcon.visible(false);
      // Unlocked nodes: use a dark green to lighter dark green gradient.
      rect.fillLinearGradientStartPoint({ x: 0, y: 0 });
      rect.fillLinearGradientEndPoint({ x: NODE_WIDTH, y: NODE_HEIGHT });
      rect.fillLinearGradientColorStops([0, '#013220', 1, '#026d46']);
    } else {
      titleText.visible(false);
      descText.visible(false);
      if (imageElem) imageElem.visible(false);
      lockIcon.visible(true);
      // Locked nodes: use a medium–gray gradient.
      rect.fillLinearGradientStartPoint({ x: 0, y: 0 });
      rect.fillLinearGradientEndPoint({ x: NODE_WIDTH, y: NODE_HEIGHT });
      rect.fillLinearGradientColorStops([0, '#444444', 1, '#666666']);
    }
  } else if (mode === "editor") {
    titleText.visible(true);
    descText.visible(true);
    if (imageElem) imageElem.visible(true);
    lockIcon.visible(false);
    inputDot.visible(true);
    outputDot.visible(true);
    // In editor mode, use the unlocked gradient.
    rect.fillLinearGradientStartPoint({ x: 0, y: 0 });
    rect.fillLinearGradientEndPoint({ x: NODE_WIDTH, y: NODE_HEIGHT });
    rect.fillLinearGradientColorStops([0, '#013220', 1, '#026d46']);
  }
  titleText.fill("rgba(255,255,255,0.9)");
  descText.fill("rgba(255,255,255,0.9)");
  titleText.text(nodeData.title);
  descText.text(nodeData.description);

  if (nodeData.imageData && (mode === "editor" || nodeData.unlocked)) {
    if (!imageElem) {
      let imgObj = new Image();
      imgObj.onload = function() {
        let cropParams = getCropParameters(imgObj, NODE_WIDTH, NODE_HEIGHT);
        let konvaImage = new Konva.Image({
          image: imgObj,
          x: 0,
          y: 0,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          crop: cropParams,
          opacity: 0.2,
          name: 'nodeImage'
        });
        group.add(konvaImage);
        group.moveToBottom(konvaImage);
        nodeLayer.draw();
      };
      imgObj.src = nodeData.imageData;
    }
  } else {
    if (imageElem) {
      imageElem.destroy();
    }
  }
  nodeLayer.draw();
}

// ---------------------------
// BEZIER CONNECTIONS & DELETE OPTION ON CONNECTION
// ---------------------------
function createBezierCurve(startPos, endPos) {
  let offset = 50;
  let control1 = { x: startPos.x + offset, y: startPos.y };
  let control2 = { x: endPos.x - offset, y: endPos.y };
  let pathData = `M ${startPos.x} ${startPos.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${endPos.x} ${endPos.y}`;
  return new Konva.Path({
    data: pathData,
    stroke: 'white',
    strokeWidth: 2,
    opacity: 0.7,
  });
}

function createConnection(fromGroup, toGroup, fromPos, toPos) {
  let offset = 50;
  let control1 = { x: fromPos.x + offset, y: fromPos.y };
  let control2 = { x: toPos.x - offset, y: toPos.y };
  let pathData = `M ${fromPos.x} ${fromPos.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${toPos.x} ${toPos.y}`;
  let bezierPath = new Konva.Path({
    data: pathData,
    stroke: 'white',
    strokeWidth: 2,
    opacity: 0.8,
  });
  connectionLayer.add(bezierPath);

  // Create a delete icon for the connection line.
  let midX = (fromPos.x + toPos.x) / 2;
  let midY = (fromPos.y + toPos.y) / 2;
  let deleteIcon = new Konva.Text({
    text: "✖",
    fontSize: 14,
    fill: "red",
    x: midX - 10,
    y: midY - 10,
    visible: false,
    name: 'lineDeleteButton'
  });
  connectionLayer.add(deleteIcon);

  bezierPath.on('mouseenter', function () {
    if (mode === 'editor') {
      deleteIcon.visible(true);
      connectionLayer.draw();
    }
  });
  bezierPath.on('mouseleave', function () {
    deleteIcon.visible(false);
    connectionLayer.draw();
  });
  deleteIcon.on('click', function (e) {
    e.cancelBubble = true;
    if (window.confirm("Delete this connection?")) {
      deleteIcon.destroy();
      bezierPath.destroy();
      connections = connections.filter(conn => conn.path !== bezierPath);
      connectionLayer.draw();
    }
  });

  connections.push({
    from: fromGroup,
    to: toGroup,
    path: bezierPath,
    deleteIcon: deleteIcon
  });
  connectionLayer.draw();
}

function updateConnectionsForNode(nodeGroup) {
  connections.forEach(conn => {
    if (conn.from === nodeGroup || conn.to === nodeGroup) {
      let fromPos = getAbsoluteDotPosition(conn.from, conn.from.findOne('.outputDot'));
      let toPos = getAbsoluteDotPosition(conn.to, conn.to.findOne('.inputDot'));
      let offset = 50;
      let control1 = { x: fromPos.x + offset, y: fromPos.y };
      let control2 = { x: toPos.x - offset, y: toPos.y };
      let newPathData = `M ${fromPos.x} ${fromPos.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${toPos.x} ${toPos.y}`;
      conn.path.data(newPathData);
      let midX = (fromPos.x + toPos.x) / 2;
      let midY = (fromPos.y + toPos.y) / 2;
      conn.deleteIcon.position({ x: midX - 10, y: midY - 10 });
    }
  });
  connectionLayer.batchDraw();
}

// Since zoom & pan are removed, use pointer position directly for the temporary curve.
stage.on('mousemove touchmove', function () {
  if (tempCurve && connectionStart) {
    let pointerPos = stage.getPointerPosition();
    let offset = 50;
    let control1 = { x: connectionStart.pos.x + offset, y: connectionStart.pos.y };
    let control2 = { x: pointerPos.x - offset, y: pointerPos.y };
    let newPathData = `M ${connectionStart.pos.x} ${connectionStart.pos.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${pointerPos.x} ${pointerPos.y}`;
    tempCurve.data(newPathData);
    tempLayer.batchDraw();
  }
});

// ---------------------------
// DELETE NODE FUNCTIONALITY
// ---------------------------
function deleteNode(group) {
  connections = connections.filter(conn => {
    if (conn.from === group || conn.to === group) {
      conn.path.destroy();
      conn.deleteIcon.destroy();
      return false;
    }
    return true;
  });
  nodes = nodes.filter(n => n.group !== group);
  group.destroy();
  nodeLayer.draw();
  connectionLayer.draw();
}

// ---------------------------
// SAVING & LOADING THE TREE
// ---------------------------
document.getElementById('saveTree').addEventListener('click', function () {
  let treeData = {
    nodes: nodes.map(n => ({
      id: n.id,
      x: n.group.x(),
      y: n.group.y(),
      title: n.title,
      description: n.description,
      imageData: n.imageData,
      unlocked: n.unlocked
    })),
    connections: connections.map(c => ({
      fromId: nodes.find(n => n.group === c.from).id,
      toId: nodes.find(n => n.group === c.to).id
    }))
  };
  let dataStr = JSON.stringify(treeData);
  let blob = new Blob([dataStr], { type: "application/json" });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = 'research_tree.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('loadTree').addEventListener('click', function () {
  let inputFile = document.createElement('input');
  inputFile.type = 'file';
  inputFile.accept = 'application/json';
  inputFile.onchange = (e) => {
    let file = e.target.files[0];
    let reader = new FileReader();
    reader.onload = (event) => {
      let treeData = JSON.parse(event.target.result);
      loadTree(treeData);
    };
    reader.readAsText(file);
  };
  inputFile.click();
});

function loadTree(treeData) {
  nodes.forEach(n => n.group.destroy());
  connections.forEach(c => c.path.destroy());
  nodes = [];
  connections = [];
  nodeLayer.draw();
  connectionLayer.draw();

  treeData.nodes.forEach(nData => {
    let group = new Konva.Group({
      x: nData.x,
      y: nData.y,
      draggable: true,
      id: 'node-' + nData.id
    });
    let rect = new Konva.Rect({
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      cornerRadius: 8,
      name: 'nodeRect',
      stroke: '#888',
      strokeWidth: 2
    });
    group.add(rect);
    let titleText = new Konva.Text({
      text: nData.title,
      fontSize: 16,
      fill: "rgba(255,255,255,0.9)",
      width: NODE_WIDTH,
      align: 'center',
      y: 5,
      name: 'titleText'
    });
    group.add(titleText);
    let descText = new Konva.Text({
      text: nData.description,
      fontSize: 12,
      fill: "rgba(255,255,255,0.9)",
      width: NODE_WIDTH,
      align: 'center',
      y: 30,
      name: 'descText'
    });
    group.add(descText);
    let lockIcon = new Konva.Text({
      text: "🔒",
      fontSize: 30,
      fill: '#fff',
      width: NODE_WIDTH,
      align: 'center',
      y: NODE_HEIGHT / 2 - 20,
      name: 'lockIcon'
    });
    group.add(lockIcon);
    let deleteButton = new Konva.Text({
      text: "✖",
      fontSize: 16,
      fill: 'red',
      visible: false,
      name: 'deleteButton'
    });
    deleteButton.position({ x: NODE_WIDTH - 20, y: 5 });
    group.add(deleteButton);
    deleteButton.on('click', function (e) {
      e.cancelBubble = true;
      if (window.confirm("Are you sure you want to delete this block?")) {
        deleteNode(group);
      }
    });
    let inputDot = new Konva.Circle({
      x: 0,
      y: NODE_HEIGHT / 2,
      radius: 6,
      fill: 'gray',
      stroke: 'black',
      strokeWidth: 1,
      name: 'inputDot'
    });
    inputDot.on('mouseup touchend', function (e) {
      if (mode !== 'editor' || !connectionStart) return;
      e.cancelBubble = true;
      if (this.hasName('inputDot') && connectionStart.node !== group) {
        let fromGroup = connectionStart.node;
        let toGroup = group;
        let fromPos = getAbsoluteDotPosition(fromGroup, fromGroup.findOne('.outputDot'));
        let toPos = getAbsoluteDotPosition(toGroup, inputDot);
        createConnection(fromGroup, toGroup, fromPos, toPos);
      }
      connectionStart = null;
      if (tempCurve) {
        tempCurve.destroy();
        tempCurve = null;
      }
      tempLayer.draw();
    });
    group.add(inputDot);
    let outputDot = new Konva.Circle({
      x: NODE_WIDTH,
      y: NODE_HEIGHT / 2,
      radius: 6,
      fill: 'gray',
      stroke: 'black',
      strokeWidth: 1,
      name: 'outputDot'
    });
    outputDot.on('mousedown touchstart', function (e) {
      if (mode !== 'editor') return;
      e.cancelBubble = true;
      connectionStart = {
        node: group,
        dot: outputDot,
        pos: getAbsoluteDotPosition(group, outputDot)
      };
      tempCurve = createBezierCurve(connectionStart.pos, connectionStart.pos);
      tempLayer.add(tempCurve);
    });
    group.add(outputDot);
    group.on('dragmove', function () {
      updateConnectionsForNode(group);
    });
    group.on('click', function () {
      if (mode === 'view') {
        let nodeData = nodes.find(n => n.group === group);
        if (!nodeData.unlocked) {
          let prerequisitesMet = true;
          connections.forEach(conn => {
            if (conn.to === group) {
              let fromNodeData = nodes.find(n => n.group === conn.from);
              if (!fromNodeData.unlocked) {
                prerequisitesMet = false;
              }
            }
          });
          if (prerequisitesMet) {
            nodeData.unlocked = true;
            updateNodeAppearance(nodeData);
            let tween = new Konva.Tween({
              node: group,
              duration: 0.5,
              scaleX: 1.1,
              scaleY: 1.1,
              yoyo: true,
              onFinish: function() {
                updateNodeAppearance(nodeData);
              }
            });
            tween.play();
          } else {
            alert("Prerequisites not met!");
          }
        }
      }
    });
    group.on('dblclick', function () {
      if (mode === 'view') {
        let nodeData = nodes.find(n => n.group === group);
        if (nodeData.unlocked) {
          nodeData.unlocked = false;
          updateNodeAppearance(nodeData);
        }
      }
      if (mode === 'editor') {
        let absPos = group.getAbsolutePosition();
        showNodeEdit(absPos, group);
      }
    });
    nodeLayer.add(group);
    let nodeObj = {
      id: nData.id,
      group: group,
      title: nData.title,
      description: nData.description,
      imageData: nData.imageData,
      unlocked: nData.unlocked
    };
    nodes.push(nodeObj);
    if (nData.imageData) {
      let imgObj = new Image();
      imgObj.onload = function() {
        let cropParams = getCropParameters(imgObj, NODE_WIDTH, NODE_HEIGHT);
        let konvaImage = new Konva.Image({
          image: imgObj,
          x: 0,
          y: 0,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          crop: cropParams,
          opacity: 0.2,
          name: 'nodeImage'
        });
        group.add(konvaImage);
        group.moveToBottom(konvaImage);
        nodeLayer.draw();
      };
      imgObj.src = nData.imageData;
    }
    updateNodeAppearance(nodeObj);
  });
  nodeLayer.draw();
  treeData.connections.forEach(cData => {
    let fromNode = nodes.find(n => n.id === cData.fromId);
    let toNode = nodes.find(n => n.id === cData.toId);
    if (fromNode && toNode) {
      let fromPos = getAbsoluteDotPosition(fromNode.group, fromNode.group.findOne('.outputDot'));
      let toPos = getAbsoluteDotPosition(toNode.group, toNode.group.findOne('.inputDot'));
      createConnection(fromNode.group, toNode.group, fromPos, toPos);
    }
  });
  connectionLayer.draw();
}

// ---------------------------
// NODE EDIT MODAL (EDITOR MODE)
// ---------------------------
function showNodeEdit(position, group) {
  let modal = document.getElementById('nodeModal');
  modal.style.display = 'block';
  let nodeData = nodes.find(n => n.group === group);
  document.getElementById('nodeTitle').value = nodeData.title;
  document.getElementById('nodeDescription').value = nodeData.description;
  document.getElementById('nodeImage').value = "";
  let saveBtn = document.getElementById('saveNode');
  let newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
  newSaveBtn.addEventListener('click', function () {
    nodeData.title = document.getElementById('nodeTitle').value;
    nodeData.description = document.getElementById('nodeDescription').value;
    group.findOne('.titleText').text(nodeData.title);
    group.findOne('.descText').text(nodeData.description);
    let fileInput = document.getElementById('nodeImage');
    if (fileInput.files && fileInput.files[0]) {
      let reader = new FileReader();
      reader.onload = function(e) {
        nodeData.imageData = e.target.result;
        let existingImage = group.findOne('.nodeImage');
        if (existingImage) {
          existingImage.destroy();
        }
        let imgObj = new Image();
        imgObj.onload = function() {
          let cropParams = getCropParameters(imgObj, NODE_WIDTH, NODE_HEIGHT);
          let konvaImage = new Konva.Image({
            image: imgObj,
            x: 0,
            y: 0,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            crop: cropParams,
            opacity: 0.2,
            name: 'nodeImage'
          });
          group.add(konvaImage);
          group.moveToBottom(konvaImage);
          nodeLayer.draw();
        };
        imgObj.src = nodeData.imageData;
      };
      reader.readAsDataURL(fileInput.files[0]);
    }
    updateNodeAppearance(nodeData);
    hideNodeModal();
  });
  let cancelBtn = document.getElementById('cancelNode');
  let newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  newCancelBtn.addEventListener('click', hideNodeModal);
}

function hideNodeModal() {
  let modal = document.getElementById('nodeModal');
  modal.style.display = 'none';
}
