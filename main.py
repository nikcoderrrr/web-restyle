from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Literal
import requests  # Used to call Ollama

app = FastAPI()

# Mount static folder to serve index.html, css, js, images
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_index():
    return FileResponse("static/index.html")

# Scraper function from your module
from scraper import scrape_text_from_url

class URLRequest(BaseModel):
    url: str

@app.post("/scrape")
def scrape_url(request: URLRequest):
    scraped = scrape_text_from_url(request.url)
    return {"scraped_text": scraped}

class EditRequest(BaseModel):
    text: str
    action: Literal['rephrase', 'simplify', 'shorten', 'lengthen', 'change_tone']

@app.post("/edit")
def edit_text(request: EditRequest):
    prompt_map = {
        "rephrase": f"Rephrase this: {request.text}",
        "simplify": f"Simplify this text: {request.text}",
        "shorten": f"Make this shorter: {request.text}",
        "lengthen": f"Expand on this: {request.text}",
        "change_tone": f"Change the tone of this to formal: {request.text}",
    }

    prompt = prompt_map.get(request.action, request.text)

    try:
        # Send request to local Ollama server
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3",  # or another model like "mistral", "phi", etc.
                "prompt": prompt,
                "stream": False
            }
        )
        response.raise_for_status()
        result = response.json().get("response", "").strip()
        return {"result": result}
    except Exception as e:
        return {"result": f"Ollama error: {str(e)}"}
