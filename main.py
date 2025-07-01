from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Literal
import requests

from scraper import scrape_text_from_url


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_index():
    return FileResponse("static/index.html")

class URLRequest(BaseModel):
    url: str

@app.post("/scrape")
def scrape_url(request: URLRequest):
    print(f"📥 Scraping: {request.url}")
    scraped = scrape_text_from_url(request.url)
    return {"scraped_text": scraped}

class EditRequest(BaseModel):
    text: str
    action: Literal['rephrase', 'simplify', 'shorten', 'lengthen', 'change_tone']

@app.post("/edit")
async def edit_text(request: EditRequest):
    print(f"Received edit request for action: {request.action}")
    
    prompt_map = {
        "rephrase": f"Rephrase this text while keeping the same meaning:\n{request.text}",
        "simplify": f"Simplify this text for better understanding:\n{request.text}",
        "shorten": f"Make this text more concise:\n{request.text}",
        "lengthen": f"Expand on this text with more details:\n{request.text}",
        "change_tone": f"Rewrite this text in a formal tone:\n{request.text}",
    }
    
    prompt = prompt_map.get(request.action, request.text)
    
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3",
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )
        response.raise_for_status()
        result = response.json().get("response", "").strip()
        return {"result": result}
    except Exception as e:
        return {"error": str(e)}

# Add this to main.py for testing
@app.get("/test-scrape")
async def test_scrape():
    test_url = "https://example.com"  # Change to a test URL
    scraped = scrape_text_from_url(test_url)
    return {"scraped_text": scraped}