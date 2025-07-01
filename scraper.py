import requests
from bs4 import BeautifulSoup

def scrape_text_from_url(url):
    try:
        headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/114.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "en-US,en;q=0.9"
}

        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # === Title ===
        title_tag = soup.title.string.strip() if soup.title else "No title found"

        # === Meta Description ===
        meta_desc = soup.find("meta", attrs={"name": "description"})
        meta_description = meta_desc['content'].strip() if meta_desc and 'content' in meta_desc.attrs else "No meta description found"

        # === OG Tags ===
        og_tags = soup.find_all("meta", property=lambda x: x and x.startswith("og:"))
        og_data = []
        for tag in og_tags:
            property_name = tag.get("property", "").replace("og:", "").strip()
            content_value = tag.get("content", "").strip()
            if property_name and content_value:
                og_data.append(f"{property_name.capitalize()}: {content_value}")

        # === Clean Body Content ===
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()

        content_blocks = []
        current_heading = None
        block = []

        for element in soup.body.descendants:
            if element.name in ['h1', 'h2', 'h3']:
                if block:
                    content_blocks.append((current_heading, block))
                    block = []
                current_heading = element.get_text(strip=True)
            elif element.name == 'p' and element.get_text(strip=True):
                block.append(element.get_text(strip=True))

        if block:
            content_blocks.append((current_heading, block))

        # === Final Output Formatting ===
        output = f"""
Title
{title_tag}

Meta Description
{meta_description}

Og Tags
"""
        output += "\n".join(og_data) + "\n\nBody Content"

        for idx, (heading, blocks) in enumerate(content_blocks, 1):
            output += f"\n\n{heading or 'Untitled Section'}"
            for i, paragraph in enumerate(blocks, 1):
                output += f"\nBlock {i}: {paragraph}"

        return output.strip()

    except Exception as e:
        return f"Error scraping: {str(e)}"
