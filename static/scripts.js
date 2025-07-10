document.addEventListener('DOMContentLoaded', () => {
  console.log("📦 DOM fully loaded");

  const form = document.getElementById("styleForm");
  const resultDiv = document.getElementById("result");

  if (!form) console.error("❌ Form not found!");
  if (!resultDiv) console.error("❌ Result box not found!");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    console.log("📨 Form submitted");

    const url = document.getElementById("url").value.trim();
    console.log("🌐 URL entered:", url);

    if (!url) {
      alert("Please enter a valid URL");
      return;
    }

    // Show loading state
    resultDiv.innerHTML = "<div class='loading'>Scraping website...<div class='spinner'></div></div>";

    try {
      console.log("⏳ Sending request to backend...");
      const response = await fetch('/scrape', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Backend response:", data);

      if (data.error) {
        resultDiv.innerHTML = `<div class="error">Error: ${data.error}</div>`;
        return;
      }

      // Display structured content
      displayStructuredContent(data, url);
      
      // Initialize text selection functionality
      initializeTextSelection();
      
      // Initialize image processing functionality
      initializeImageProcessing();
      
    } catch (error) {
      console.error("❌ Error:", error);
      resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
  });
});

function displayStructuredContent(data, url) {
  const resultDiv = document.getElementById("result");
  
  let html = `
    <div class="url-header">
      <strong>Source:</strong> 
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="source-url">${url}</a>
    </div>
    
    <div class="page-info">
      <h2 class="page-title">${data.title}</h2>
      <p class="meta-description">${data.meta_description}</p>
    </div>
  `;

  // Display images if any
  if (data.images && data.images.length > 0) {
    html += `
      <div class="images-section">
        <h3>Images Found (${data.images.length})</h3>
        <div class="images-grid">
    `;
    
    data.images.forEach((img, index) => {
      html += `
        <div class="image-block" data-image-index="${index}">
          <img src="${img.url}" alt="${img.alt}" class="scraped-image" data-image-url="${img.url}" onerror="this.style.display='none'">
          <p class="image-caption">${img.alt}</p>
          <div class="image-controls">
            <div class="image-controls-grid">
              <button class="image-control-btn" onclick="showImageProcessMenu('${img.url}', ${index})">Process Image</button>
            </div>
          </div>
        </div>
      `;
    });
    
    html += `</div></div>`;
  }

  // Display content blocks
  if (data.content_blocks && data.content_blocks.length > 0) {
    html += `<div class="content-blocks">`;
    
    data.content_blocks.forEach((block, index) => {
      html += `
        <div class="content-block" data-block-id="${block.id}">
          <div class="block-header">
            <span class="block-number">Block ${index + 1}</span>
            <span class="block-type">${block.type.toUpperCase()}</span>
          </div>
          <div class="block-content selectable-content">
            ${block.text}
          </div>
      `;
      
      // Add images within this block if any
      if (block.images && block.images.length > 0) {
        html += `<div class="block-images">`;
        block.images.forEach((img, imgIndex) => {
          const uniqueId = `block_${index}_img_${imgIndex}`;
          html += `
            <div class="block-image" data-image-id="${uniqueId}">
              <img src="${img.url}" alt="${img.alt}" class="block-img" data-image-url="${img.url}" onerror="this.style.display='none'">
              <p class="block-img-caption">${img.alt}</p>
              <button class="image-control-btn" onclick="showImageProcessMenu('${img.url}', '${uniqueId}')">Process Image</button>
            </div>
          `;
        });
        html += `</div>`;
      }
      
      html += `</div>`;
    });
    
    html += `</div>`;
  } else {
    html += `<div class="no-content">No content blocks found</div>`;
  }

  resultDiv.innerHTML = html;
}

function initializeTextSelection() {
  console.log("🔧 Initializing text selection");
  const resultDiv = document.getElementById("result");
  
  if (!resultDiv) {
    console.error("❌ Result div not found");
    return;
  }
  
  // Add event listeners to all selectable content
  const selectableElements = resultDiv.querySelectorAll('.selectable-content');
  
  selectableElements.forEach(element => {
    element.addEventListener('mouseup', function() {
      const selection = window.getSelection();
      if (!selection.toString().trim()) return;
      
      console.log("📝 Text selected:", selection.toString().trim());
      showFloatingMenu(selection);
    });
  });
  
  console.log(`✅ Added selection listeners to ${selectableElements.length} elements`);
}

function initializeImageProcessing() {
  console.log("🔧 Initializing image processing");
  const resultDiv = document.getElementById("result");
  
  if (!resultDiv) {
    console.error("❌ Result div not found");
    return;
  }
  
  // Add click listeners to all images
  const images = resultDiv.querySelectorAll('.scraped-image, .block-img');
  
  images.forEach(img => {
    img.addEventListener('click', function() {
      const imageUrl = this.getAttribute('data-image-url');
      const imageId = this.closest('.image-block, .block-image').getAttribute('data-image-index') || 
                     this.closest('.image-block, .block-image').getAttribute('data-image-id');
      
      showImageProcessMenu(imageUrl, imageId);
    });
  });
  
  console.log(`✅ Added image click listeners to ${images.length} images`);
}

function showFloatingMenu(selection) {
  console.log("🎯 Creating floating menu");
  
  // Remove any existing menu
  const existingMenu = document.querySelector('.floating-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  // Create new menu
  const menu = document.createElement('div');
  menu.className = 'floating-menu';
  
  // Define edit actions - FIXED TO MATCH BACKEND
  const editActions = [
    {name: 'Rephrase', action: 'rephrase'},
    {name: 'Simplify', action: 'simplify'},
    {name: 'Expand', action: 'lengthen'},
    {name: 'Formal', action: 'tone_formal'},
    {name: 'Funny', action: 'tone_funny'},
    {name: 'Serious', action: 'tone_serious'},
    {name: 'Sad', action: 'tone_sad'}
  ];

  // Create buttons for each action
  editActions.forEach(item => {
    const button = document.createElement('button');
    button.textContent = item.name;
    button.dataset.action = item.action;
    button.addEventListener('click', () => handleEdit(selection, item.action));
    menu.appendChild(button);
  });

  // Position menu near selection
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  menu.style.position = 'absolute';
  menu.style.top = `${rect.bottom + window.scrollY}px`;
  menu.style.left = `${rect.left + window.scrollX}px`;
  
  document.body.appendChild(menu);
  console.log("✅ Menu added to DOM");
}

function showImageProcessMenu(imageUrl, imageId) {
  console.log("🖼️ Creating image process menu for:", imageUrl);
  
  // Remove any existing menu
  const existingMenu = document.querySelector('.image-floating-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  // Create new menu
  const menu = document.createElement('div');
  menu.className = 'image-floating-menu';
  
  menu.innerHTML = `
    <h4>Process Image</h4>
    <div class="image-process-options">
      <button onclick="processImage('${imageUrl}', '${imageId}', 'resize')">Resize</button>
      <button onclick="processImage('${imageUrl}', '${imageId}', 'compress')">Compress</button>
      <button onclick="processImage('${imageUrl}', '${imageId}', 'enhance_brightness')">Brightness</button>
      <button onclick="processImage('${imageUrl}', '${imageId}', 'enhance_contrast')">Contrast</button>
      <button onclick="processImage('${imageUrl}', '${imageId}', 'blur')">Blur</button>
      <button onclick="processImage('${imageUrl}', '${imageId}', 'sharpen')">Sharpen</button>
      <button onclick="processImage('${imageUrl}', '${imageId}', 'grayscale')">Grayscale</button>
      <button onclick="processImage('${imageUrl}', '${imageId}', 'sepia')">Sepia</button>
    </div>
    <button onclick="closeImageMenu()" style="margin-top: 10px; background: #ccc; color: #333;">Close</button>
  `;
  
  // Position menu in center of viewport
  menu.style.position = 'fixed';
  menu.style.top = '50%';
  menu.style.left = '50%';
  menu.style.transform = 'translate(-50%, -50%)';
  menu.style.zIndex = '2000';
  
  document.body.appendChild(menu);
  console.log("✅ Image menu added to DOM");
}

function closeImageMenu() {
  const menu = document.querySelector('.image-floating-menu');
  if (menu) {
    menu.remove();
  }
}

async function processImage(imageUrl, imageId, action) {
  console.log("🔄 Processing image:", action, "for", imageUrl);
  
  const editedResult = document.getElementById("edited-result");
  if (!editedResult) {
    console.error("❌ edited-result element not found");
    return;
  }
  
  // Show loading state in edited output
  editedResult.innerHTML = `<div class="loading">Processing image with ${action}...<div class="spinner"></div></div>`;
  
  try {
    // Default parameters for different actions
    const params = {
      image_url: imageUrl,
      action: action,
      width: action === 'resize' ? 400 : null,
      height: action === 'resize' ? 300 : null,
      quality: action === 'compress' ? 70 : 85,
      factor: getFactorForAction(action)
    };
    
    console.log("📤 Sending image process request", params);
    const response = await fetch('/process-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📥 Image process response:", data);
    
    if (data.error) {
      editedResult.innerHTML = `<div class="error">Error: ${data.error}</div>`;
    } else if (data.success) {
      // Display the processed image in the edited output panel
      displayProcessedImage(data, action);
    } else {
      editedResult.innerHTML = `<div class="error">Unknown error occurred</div>`;
    }
  } catch (error) {
    console.error("❌ Image process error:", error);
    editedResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
  }

  // Close the floating menu
  closeImageMenu();
}

function getFactorForAction(action) {
  switch (action) {
    case 'enhance_brightness':
      return 1.3;
    case 'enhance_contrast':
      return 1.2;
    case 'blur':
      return 2.0;
    case 'sharpen':
      return 1.5;
    default:
      return 1.0;
  }
}

function displayProcessedImage(data, action) {
  const editedResult = document.getElementById("edited-result");
  
  const html = `
    <div class="processed-image-display">
      <h3>Processed Image - ${action.replace('_', ' ').toUpperCase()}</h3>
      
      <div class="processed-image-container active">
        <img src="${data.image_base64}" alt="Processed Image" class="processed-image" />
        
        <div class="image-stats">
          <strong>Processing Results:</strong><br>
          <strong>Action:</strong> ${action.replace('_', ' ')}<br>
          <strong>Original Size:</strong> ${data.original_size[0]} × ${data.original_size[1]}px<br>
          <strong>Processed Size:</strong> ${data.processed_size[0]} × ${data.processed_size[1]}px<br>
          <strong>Original File Size:</strong> ${(data.original_file_size / 1024).toFixed(1)} KB<br>
          <strong>Processed File Size:</strong> ${(data.processed_file_size / 1024).toFixed(1)} KB<br>
          <strong>Size Change:</strong> ${data.size_reduction_percent > 0 ? '-' : '+'}${Math.abs(data.size_reduction_percent).toFixed(1)}%<br>
          <strong>Format:</strong> ${data.format}
        </div>
        
        <div class="processed-image-actions">
          <button onclick="downloadProcessedImage('${data.image_base64}', '${action}')" class="download-btn">
            Download Processed Image
          </button>
          <button onclick="clearEditedOutput()" class="clear-btn">
            Clear
          </button>
        </div>
      </div>
    </div>
  `;
  
  editedResult.innerHTML = html;
}

function downloadProcessedImage(imageBase64, action) {
  // Create a download link
  const link = document.createElement('a');
  link.href = imageBase64;
  link.download = `processed_image_${action}_${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function clearEditedOutput() {
  const editedResult = document.getElementById("edited-result");
  if (editedResult) {
    editedResult.innerHTML = "Select text from the left panel to edit";
  }
}

async function handleEdit(selection, action) {
  console.log("✏️ Handling edit:", action);
  
  const selectedText = selection.toString().trim();
  if (!selectedText) {
    console.log("❌ No text selected");
    return;
  }

  const editedResult = document.getElementById("edited-result");
  if (!editedResult) {
    console.error("❌ edited-result element not found");
    return;
  }
  
  editedResult.innerHTML = `<div class="loading">Editing text with ${action}...<div class="spinner"></div></div>`;

  try {
    console.log("📤 Sending edit request");
    const response = await fetch('/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: selectedText,
        action: action
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📥 Edit response:", data);
    
    if (data.error) {
      editedResult.innerHTML = `<div class="error">Error: ${data.error}</div>`;
    } else {
      // Display the edited text with some formatting
      const html = `
        <div class="edited-text-display">
          <h3>Edited Text - ${action.replace('_', ' ').toUpperCase()}</h3>
          <div class="edited-text-content">
            ${data.result || "No changes made"}
          </div>
          <div class="edited-text-actions">
            <button onclick="copyEditedText()" class="copy-btn">Copy Text</button>
            <button onclick="clearEditedOutput()" class="clear-btn">Clear</button>
          </div>
        </div>
      `;
      editedResult.innerHTML = html;
    }
  } catch (error) {
    console.error("❌ Edit error:", error);
    editedResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
  }

  // Remove floating menu
  const menu = document.querySelector('.floating-menu');
  if (menu) {
    menu.remove();
  }
}

function copyEditedText() {
  const editedTextContent = document.querySelector('.edited-text-content');
  if (editedTextContent) {
    navigator.clipboard.writeText(editedTextContent.textContent).then(() => {
      // Show brief success message
      const originalText = editedTextContent.innerHTML;
      editedTextContent.innerHTML = '<em>Text copied to clipboard!</em>';
      setTimeout(() => {
        editedTextContent.innerHTML = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }
}

// Close menus when clicking elsewhere
document.addEventListener('mousedown', function(e) {
  if (!e.target.closest('.floating-menu') && !e.target.closest('.image-floating-menu')) {
    const textMenu = document.querySelector('.floating-menu');
    const imageMenu = document.querySelector('.image-floating-menu');
    
    if (textMenu) {
      textMenu.remove();
    }
    if (imageMenu) {
      imageMenu.remove();
    }
  }
});