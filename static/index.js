document.addEventListener('DOMContentLoaded', () => {
  const shapeRadios = document.querySelectorAll('input[name="shape"]');
  const customShapeContainer = document.getElementById('customShapeContainer');
  const densitySlider = document.getElementById('densitySlider');
  const densityValue = document.getElementById('densityValue');
  const generateButton = document.getElementById('generateButton');
  const loading = document.getElementById('loading');

  let selectedShape = 'circle';

  densitySlider.addEventListener('input', () => {
      densityValue.textContent = densitySlider.value;
  });

  shapeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
          selectedShape = radio.value;
          customShapeContainer.classList.toggle('hidden', radio.value !== 'custom');
      });
  });

  generateButton.addEventListener('click', async () => {
      try {
          generateButton.disabled = true;
          loading.classList.remove('hidden');

          let shapeData;
          if (selectedShape === 'custom') {
              try {
                  shapeData = JSON.parse(document.getElementById('customShapeData').value);
              } catch (e) {
                  throw new Error('Invalid JSON in custom shape data');
              }
          } else {
              shapeData = getPredefinedShape(selectedShape);
          }

          shapeData.density = parseInt(densitySlider.value, 10);
          shapeData.category = '77';

          const response = await fetch('/api/decorate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(shapeData)
          });

          if (!response.ok) throw new Error(await response.text());
          
          const data = await response.json();
          displayImage(data.generatedImage);
          await displayFlowerPath(data.flowerPath);
      } catch (err) {
          console.error('Error:', err);
          alert(err.message);
      } finally {
          generateButton.disabled = false;
          loading.classList.add('hidden');
      }
  });

  generateButton.click();
});

function getPredefinedShape(shape) {
  const shapes = {
      circle: {
          type: 'circle',
          center: [400, 300],
          radius: 150
      },
      heart: {
          type: '2d',
          points: generateHeartPoints(400, 300, 150)
      },
      triangle: {
          type: '2d',
          points: [
              [400, 150],
              [650, 450],
              [150, 450]
          ]
      },
      square: {
          type: '2d',
          points: [
              [300, 200],
              [500, 200],
              [500, 400],
              [300, 400]
          ]
      },
      star: {
          type: '2d',
          points: generateStarPoints(400, 300, 150, 60, 5)
      },
      pentagon: {
          type: '2d',
          points: generateRegularPolygonPoints(400, 300, 150, 5)
      },
      hexagon: {
          type: '2d',
          points: generateRegularPolygonPoints(400, 300, 150, 6)
      },
      diamond: {
          type: '2d',
          points: [
              [400, 150],
              [550, 300],
              [400, 450],
              [250, 300]
          ]
      }
  };
  return shapes[shape] || shapes.circle;
}

function generateRegularPolygonPoints(cx, cy, radius, sides) {
  const points = [];
  const angleOffset = -Math.PI/2;
  for (let i = 0; i < sides; i++) {
      const angle = angleOffset + (2 * Math.PI * i) / sides;
      points.push([
          cx + radius * Math.cos(angle),
          cy + radius * Math.sin(angle)
      ]);
  }
  return points;
}

function generateStarPoints(cx, cy, outerRadius, innerRadius, points) {
  const starPoints = [];
  const step = Math.PI / points;
  for (let i = 0; i < 2 * points; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * step - Math.PI/2;
      starPoints.push([
          cx + r * Math.cos(angle),
          cy + r * Math.sin(angle)
      ]);
  }
  return starPoints;
}

function generateHeartPoints(cx, cy, size) {
  const points = [];
  for (let t = 0; t < 2 * Math.PI; t += 0.1) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
      points.push([
          cx + x * size/20,
          cy - y * size/20
      ]);
  }
  return points;
}

function displayImage(imageData) {
  const canvas = document.getElementById('flowerCanvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.src = imageData;
  img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
  };
}

async function displayFlowerPath(flowerPath) {
  const overlay = document.getElementById('overlay');
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  
  const flowerSize = 40;
  const images = await Promise.all(
      flowerPath.map(flower => loadImage(`/images/${flower.image_id}`))
  );
  
  images.forEach((img, index) => {
      const flower = flowerPath[index];
      ctx.save();
      ctx.translate(flower.position.x, flower.position.y);
      ctx.rotate(flower.angle);
      ctx.drawImage(
          img,
          -flowerSize/2,
          -flowerSize/2,
          flowerSize,
          flowerSize
      );
      ctx.restore();
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
          console.error(`Failed to load image: ${src}`);
          resolve(createFallbackImage());
      };
      img.src = src;
  });
}

function createFallbackImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(50, 50, 40, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}