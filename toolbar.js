document.getElementById('modeSwitch').addEventListener('click', function () {
    if (mode === 'view') {
      let pass = prompt("Enter admin password to enter Editor Mode:");
      if (pass === "admin13") {
        mode = "editor";
        this.textContent = "Switch to View Mode";
        document.getElementById('addNode').style.display = "inline-block";
        document.getElementById('alignNodes').style.display = "inline-block";
        document.getElementById('saveTree').style.display = "inline-block";
        // loadTree remains visible in editor mode as well.
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
      // Do NOT hide loadTree so users can load a tree in view mode.
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

  document.getElementById('addNode').addEventListener('click', function () {
    // Make sure addNode is exposed to the global scope in nodes.js
    addNode(100, 100);
  });
  
  document.getElementById('alignNodes').addEventListener('click', function () {
    // Toggle align mode and call drawGrid (make sure drawGrid is globally accessible from helpers.js)
    alignMode = !alignMode;
    this.textContent = alignMode ? "Exit Align Mode" : "Enter Align Mode";
    if (alignMode) {
      drawGrid();
    } else {
      guideLayer.destroyChildren();
      guideLayer.draw();
    }
  });
  