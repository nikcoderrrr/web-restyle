from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Literal, Optional
import requests
from fastapi.middleware.cors import CORSMiddleware
import io
import base64
from PIL import Image, ImageEnhance, ImageFilter
import requests as img_requests
from urllib.parse import urlparse
import os

from scraper import scrape_text_from_url

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Create processed images directory if it doesn't exist
os.makedirs("static/processed_images", exist_ok=True)

@app.get("/")
def read_index():
    return FileResponse("static/index.html")

class URLRequest(BaseModel):
    url: str

@app.post("/scrape")
def scrape_url(request: URLRequest):
    print(f"📥 Scraping: {request.url}")
    scraped_data = scrape_text_from_url(request.url)
    return scraped_data

class EditRequest(BaseModel):
    text: str
    action: Literal['rephrase', 'simplify', 'lengthen', 'tone_funny', 'tone_formal', 'tone_serious', 'tone_sad']

@app.post("/edit")
async def edit_text(request: EditRequest):
    print(f"Received edit request for action: {request.action}")
    
    prompt_map = {
        "rephrase": f"Rephrase this text while keeping the same meaning:\n{request.text}",
        "simplify": f"Simplify this text for better understanding:\n{request.text}",
        "lengthen": f"Expand on this text with more details:\n{request.text}",
        "tone_funny": f"Rewrite this text in a funny, humorous tone:\n{request.text}",
        "tone_formal": f"Rewrite this text in a formal, professional tone:\n{request.text}",
        "tone_serious": f"Rewrite this text in a serious, earnest tone:\n{request.text}",
        "tone_sad": f"Rewrite this text in a sad, melancholic tone:\n{request.text}",
    }
    
    prompt = prompt_map.get(request.action, request.text)
    
    # First, check if Ollama is running
    try:
        health_response = requests.get("http://localhost:11434/", timeout=5)
        print("✅ Ollama is running")
    except requests.exceptions.RequestException:
        return {"error": "Ollama is not running. Please start Ollama first by running 'ollama serve' in your terminal."}
    
    try:
        print("🤖 Sending request to Ollama...")
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama2",
                "prompt": prompt,
                "stream": False
            },
            timeout=120  # Increased timeout to 2 minutes
        )
        response.raise_for_status()
        result = response.json().get("response", "").strip()
        print("✅ Ollama response received")
        return {"result": result}
    except requests.exceptions.Timeout:
        return {"error": "Request timed out. The model might be taking too long to respond. Try with shorter text or check if Ollama is running properly."}
    except requests.exceptions.ConnectionError:
        return {"error": "Cannot connect to Ollama. Make sure Ollama is running by executing 'ollama serve' in your terminal."}
    except Exception as e:
        return {"error": f"Ollama error: {str(e)}"}

class ImageProcessRequest(BaseModel):
    image_url: str
    action: Literal['resize', 'compress', 'enhance_brightness', 'enhance_contrast', 'blur', 'sharpen', 'grayscale', 'sepia']
    width: Optional[int] = None
    height: Optional[int] = None
    quality: Optional[int] = 85
    factor: Optional[float] = 1.0

@app.post("/process-image")
async def process_image(request: ImageProcessRequest):
    print(f"🖼️ Processing image: {request.action}")
    
    try:
        # Download the image
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        print(f"📥 Downloading image from: {request.image_url}")
        img_response = img_requests.get(request.image_url, headers=headers, timeout=10)
        img_response.raise_for_status()
        
        # Open image with PIL
        image = Image.open(io.BytesIO(img_response.content))
        
        # Convert to RGB if necessary (for JPEG compatibility)
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create a white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        elif image.mode not in ('RGB', 'L'):
            image = image.convert('RGB')
        
        original_size = image.size
        processed_image = image.copy()
        
        # Apply the requested processing
        if request.action == 'resize':
            if request.width and request.height:
                processed_image = processed_image.resize((request.width, request.height), Image.Resampling.LANCZOS)
            elif request.width:
                # Maintain aspect ratio
                aspect_ratio = image.height / image.width
                new_height = int(request.width * aspect_ratio)
                processed_image = processed_image.resize((request.width, new_height), Image.Resampling.LANCZOS)
            elif request.height:
                # Maintain aspect ratio
                aspect_ratio = image.width / image.height
                new_width = int(request.height * aspect_ratio)
                processed_image = processed_image.resize((new_width, request.height), Image.Resampling.LANCZOS)
        
        elif request.action == 'compress':
            # Compression will be handled during save
            pass
        
        elif request.action == 'enhance_brightness':
            enhancer = ImageEnhance.Brightness(processed_image)
            processed_image = enhancer.enhance(request.factor)
        
        elif request.action == 'enhance_contrast':
            enhancer = ImageEnhance.Contrast(processed_image)
            processed_image = enhancer.enhance(request.factor)
        
        elif request.action == 'blur':
            processed_image = processed_image.filter(ImageFilter.GaussianBlur(radius=request.factor))
        
        elif request.action == 'sharpen':
            processed_image = processed_image.filter(ImageFilter.UnsharpMask(radius=2, percent=int(request.factor * 100), threshold=3))
        
        elif request.action == 'grayscale':
            processed_image = processed_image.convert('L')
        
        elif request.action == 'sepia':
            # Convert to grayscale first
            grayscale = processed_image.convert('L')
            # Create sepia effect
            sepia = Image.new('RGB', grayscale.size)
            sepia_pixels = []
            for pixel in grayscale.getdata():
                # Sepia tone calculation
                r = min(255, int(pixel * 1.0))
                g = min(255, int(pixel * 0.8))
                b = min(255, int(pixel * 0.6))
                sepia_pixels.append((r, g, b))
            sepia.putdata(sepia_pixels)
            processed_image = sepia
        
        # Save processed image
        output_buffer = io.BytesIO()
        
        # Determine format and quality
        if request.action == 'compress' or request.quality < 95:
            processed_image.save(output_buffer, format='JPEG', quality=request.quality, optimize=True)
            format_ext = 'jpg'
        else:
            processed_image.save(output_buffer, format='PNG', optimize=True)
            format_ext = 'png'
        
        # Convert to base64 for frontend display
        output_buffer.seek(0)
        image_base64 = base64.b64encode(output_buffer.getvalue()).decode()
        
        # Calculate file size reduction
        original_size_bytes = len(img_response.content)
        processed_size_bytes = len(output_buffer.getvalue())
        size_reduction = ((original_size_bytes - processed_size_bytes) / original_size_bytes) * 100
        
        return {
            "success": True,
            "image_base64": f"data:image/{format_ext};base64,{image_base64}",
            "original_size": original_size,
            "processed_size": processed_image.size,
            "original_file_size": original_size_bytes,
            "processed_file_size": processed_size_bytes,
            "size_reduction_percent": round(size_reduction, 2),
            "format": format_ext.upper()
        }
        
    except Exception as e:
        print(f"❌ Image processing error: {str(e)}")
        return {"error": f"Image processing failed: {str(e)}"}

@app.get("/test-scrape")
async def test_scrape():
    test_url = "https://example.com"
    scraped = scrape_text_from_url(test_url)
    return scraped

# Add a health check endpoint for Ollama
@app.get("/ollama-status")
async def check_ollama_status():
    try:
        response = requests.get("http://localhost:11434/", timeout=5)
        return {"status": "running", "message": "Ollama is accessible"}
    except requests.exceptions.RequestException as e:
        return {"status": "not_running", "message": f"Ollama is not accessible: {str(e)}"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Web Reconstruction Tool is running"}