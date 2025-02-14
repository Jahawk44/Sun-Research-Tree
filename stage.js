// stage.js

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
  
  // Deselect pending connection when clicking the background.
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
  
  // Update temporary connection curve on pointer movement.
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
  