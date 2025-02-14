// nodes.js

function addNode(x, y) {
    let nodeId = nodes.length;
    let group = new Konva.Group({
      x: x,
      y: y,
      draggable: true,
      id: 'node-' + nodeId
    });
  
    // Background rectangle with a stroke.
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
  
    // Delete icon (visible on hover in editor mode).
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
  
    // Input dot for incoming connections.
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
  
    // Output dot for creating connections.
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
  
    // Drag events with grid snapping in editor mode.
    group.on('dragmove', function () {
      if (mode === 'editor' && alignMode) {
        let newX = Math.round(group.x() / GRID_SIZE) * GRID_SIZE;
        let newY = Math.round(group.y() / GRID_SIZE) * GRID_SIZE;
        group.x(newX);
        group.y(newY);
      }
      updateConnectionsForNode(group);
    });
  
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
    // Double–clicking in view mode locks the node, or in editor mode opens the edit modal.
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
        // Unlocked node gradient.
        rect.fillLinearGradientStartPoint({ x: 0, y: 0 });
        rect.fillLinearGradientEndPoint({ x: NODE_WIDTH, y: NODE_HEIGHT });
        rect.fillLinearGradientColorStops([0, '#013220', 1, '#026d46']);
      } else {
        titleText.visible(false);
        descText.visible(false);
        if (imageElem) imageElem.visible(false);
        lockIcon.visible(true);
        // Locked node gradient.
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
      // Use unlocked gradient in editor mode.
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
  
  // Expose addNode so toolbar.js can call it
window.addNode = addNode;

// Expose drawGrid so toolbar.js can call it
window.drawGrid = drawGrid;
