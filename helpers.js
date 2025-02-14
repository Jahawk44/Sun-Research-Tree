// helpers.js

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
  