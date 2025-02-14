// connections.js

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
  
    // Create a delete icon for the connection.
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
  