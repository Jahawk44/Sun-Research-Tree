// modal.js

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
  