from flask import Flask, request, jsonify, send_from_directory
import base64
from io import BytesIO
from PIL import Image, ImageDraw
import math
import random
import csv
import os

app = Flask(__name__)

def load_categories():
    categories = {}
    try:
        with open('DataSets/labels.csv', newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                category = row['category']
                image_id = row['image_id']
                if category not in categories:
                    categories[category] = []
                # Store with .jpg extension for direct use
                categories[category].append(f"{image_id}.jpg")
    except FileNotFoundError:
        print("Warning: labels.csv not found. Using default categories.")
        categories = {'77': ['2.jpg', '3.jpg']}  # Example fallback
    return categories

plant_categories = load_categories()

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

@app.route('/api/decorate', methods=['POST'])
def decorate():
    shape_data = request.get_json()
    density = shape_data.get('density', 20)
    shape_type = shape_data.get('type')
    plant_category = shape_data.get('category', '77')

    if plant_category not in plant_categories:
        return jsonify({"error": f"Category {plant_category} not found"}), 400

    if shape_type == 'circle':
        center = shape_data.get('center')
        radius = shape_data.get('radius')
        points = generate_circle_points(center, radius)
    elif shape_type == '2d':
        points = shape_data.get('points')
    else:
        return jsonify({"error": "Invalid shape type"}), 400

    flower_positions = generate_flower_positions(points, density)
    available_plants = plant_categories[plant_category]

    img = Image.new('RGB', (800, 600), 'white')
    draw = ImageDraw.Draw(img)
    draw.polygon([(p[0], p[1]) for p in points], outline='black', fill=None)

    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode('utf-8')

    flower_path = [
        {
            "position": {"x": pos[0], "y": pos[1]},
            "angle": random.uniform(0, 2 * math.pi),
            "image_id": os.path.splitext(random.choice(available_plants))[0],  # Remove extension for client
            "category": plant_category
        }
        for pos in flower_positions
    ]

    return jsonify({
        "generatedImage": img_str,
        "flowerPath": flower_path
    })

@app.route('/images/<image_id>')
def serve_image(image_id):
    # Add .jpg extension to requested image ID
    return send_from_directory('DataSets/files', f"{image_id}.jpg")

@app.route('/')
def index():
    return app.send_static_file('index.html')

def generate_circle_points(center, radius, num_points=100):
    return [
        [
            center[0] + radius * math.cos(2 * math.pi * i / num_points),
            center[1] + radius * math.sin(2 * math.pi * i / num_points)
        ]
        for i in range(num_points)
    ]

def generate_flower_positions(points, interval):
    flower_positions = []
    total_length = 0
    edges = []

    # Create edges including closing edge
    for i in range(len(points)):
        start = points[i]
        end = points[(i + 1) % len(points)]
        edges.append((start, end))
        total_length += math.sqrt((end[0]-start[0])**2 + (end[1]-start[1])**2)

    current_distance = 0
    for (x1, y1), (x2, y2) in edges:
        segment_length = math.sqrt((x2-x1)**2 + (y2-y1)**2)
        while current_distance < segment_length:
            t = current_distance / segment_length
            x = x1 + t * (x2 - x1)
            y = y1 + t * (y2 - y1)
            flower_positions.append([x, y])
            current_distance += interval
        current_distance -= segment_length

    return flower_positions

if __name__ == '__main__':
    app.run(debug=True)