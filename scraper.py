import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import json

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

        # === Clean Body Content ===
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()

        # === Extract Content Blocks (Granular) ===
        content_blocks = []
        block_counter = 1
        
        # Get all images first for reference
        all_images = []
        img_tags = soup.find_all('img')
        for img in img_tags:
            src = img.get('src')
            if src:
                full_url = urljoin(url, src)
                alt_text = img.get('alt', 'No alt text')
                all_images.append({
                    'url': full_url,
                    'alt': alt_text
                })

        if soup.body:
            # Process each element in the body in document order (excluding div elements)
            for element in soup.body.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'article', 'section', 'img']):
                
                # Handle images as separate blocks
                if element.name == 'img':
                    src = element.get('src')
                    if src:
                        full_url = urljoin(url, src)
                        alt_text = element.get('alt', 'No alt text')
                        content_blocks.append({
                            'id': f'block_{block_counter}',
                            'type': 'image',
                            'text': f'[Image: {alt_text}]',
                            'images': [{
                                'url': full_url,
                                'alt': alt_text
                            }]
                        })
                        block_counter += 1
                
                # Handle text elements
                else:
                    # For articles and sections, check if they contain direct text or only child elements
                    if element.name in ['article', 'section']:
                        # Get direct text content (not from child elements)
                        direct_text = element.get_text(strip=True)
                        child_text = ''.join([child.get_text(strip=True) for child in element.find_all()])
                        
                        # Only process if this element has substantial direct text content
                        # or if it's a container with minimal nesting
                        if direct_text and len(direct_text) > 20:
                            # Check if this is mostly direct text vs child element text
                            if len(direct_text) > len(child_text) * 0.7:
                                content_blocks.append({
                                    'id': f'block_{block_counter}',
                                    'type': element.name,
                                    'text': direct_text,
                                    'images': []
                                })
                                block_counter += 1
                    
                    # Handle headings and paragraphs directly
                    elif element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p']:
                        text = element.get_text(strip=True)
                        if text and len(text) > 5:  # Minimum length for meaningful content
                            
                            # Check for images within this element and create separate blocks
                            element_images = element.find_all('img')
                            
                            # Add the text block
                            content_blocks.append({
                                'id': f'block_{block_counter}',
                                'type': element.name,
                                'text': text,
                                'images': []
                            })
                            block_counter += 1
                            
                            # Add separate image blocks for any images found within this element
                            for img in element_images:
                                src = img.get('src')
                                if src:
                                    full_url = urljoin(url, src)
                                    alt_text = img.get('alt', 'No alt text')
                                    content_blocks.append({
                                        'id': f'block_{block_counter}',
                                        'type': 'image',
                                        'text': f'[Image: {alt_text}]',
                                        'images': [{
                                            'url': full_url,
                                            'alt': alt_text
                                        }]
                                    })
                                    block_counter += 1

        # === Additional Processing for Better Paragraph Separation ===
        # Sometimes paragraphs are within divs, so let's also look for text nodes
        additional_blocks = []
        
        # Find all text-containing elements that might have been missed (excluding div elements)
        for element in soup.body.find_all(text=True):
            if element.parent.name not in ['script', 'style', 'nav', 'footer', 'header', 'aside', 'div']:
                text = element.strip()
                if text and len(text) > 30:  # Substantial text content
                    # Check if this text is already captured in existing blocks
                    already_captured = any(text in block['text'] for block in content_blocks)
                    
                    if not already_captured:
                        # Determine parent element type
                        parent_tag = element.parent.name if element.parent else 'text'
                        
                        additional_blocks.append({
                            'id': f'block_{block_counter}',
                            'type': parent_tag,
                            'text': text,
                            'images': []
                        })
                        block_counter += 1

        # Merge additional blocks with main content blocks
        content_blocks.extend(additional_blocks)

        # === Remove duplicates and sort by document order ===
        # Remove blocks with very similar text content
        unique_blocks = []
        seen_texts = set()
        
        for block in content_blocks:
            # Create a simplified version of the text for comparison
            simplified_text = block['text'][:100].lower().strip()
            
            if simplified_text not in seen_texts and len(block['text']) > 5:
                unique_blocks.append(block)
                seen_texts.add(simplified_text)

        # === Return Structured Data ===
        return {
            'title': title_tag,
            'meta_description': meta_description,
            'images': all_images[:20],  # Limit to first 20 images for the general images section
            'content_blocks': unique_blocks[:50],  # Limit to first 50 blocks
            'url': url
        }

    except Exception as e:
        return {
            'error': f"Error scraping: {str(e)}",
            'title': 'Error',
            'meta_description': 'Failed to scrape',
            'images': [],
            'content_blocks': [],
            'url': url
        }