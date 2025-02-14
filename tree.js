// tree.js

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
      // Recreate node similar to addNode but without animation.
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
        y: NODE_WIDTH / 2,
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
  