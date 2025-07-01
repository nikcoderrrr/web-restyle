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

      if (data.scraped_text) {
        // Format the text with line breaks
        const formattedText = data.scraped_text.replace(/\n/g, '<br>');
        resultDiv.innerHTML = formattedText;
        
        // Initialize text selection functionality
        initializeTextSelection();
      } else {
        resultDiv.innerHTML = "<em>No content found or scraping failed</em>";
      }
    } catch (error) {
      console.error("❌ Error:", error);
      resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
  });
});

// Add text selection and editing functionality
function initializeTextSelection() {
  const resultDiv = document.getElementById("result");
  
  resultDiv.addEventListener('mouseup', function() {
    const selection = window.getSelection();
    if (!selection.toString().trim()) return;
    
    // Show floating menu near selection
    showFloatingMenu(selection);
  });
}

function showFloatingMenu(selection) {
  // Remove any existing menu
  const existingMenu = document.querySelector('.floating-menu');
  if (existingMenu) existingMenu.remove();

  // Create new menu
  const menu = document.createElement('div');
  menu.className = 'floating-menu';
  
  // Add edit options
  const actions = [
    {name: 'Rephrase', action: 'rephrase'},
    {name: 'Simplify', action: 'simplify'},
    {name: 'Shorten', action: 'shorten'},
    {name: 'Expand', action: 'lengthen'},
    {name: 'Formal', action: 'change_tone'}
  ];

  actions.forEach(item => {
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
}

async function handleEdit(selection, action) {
  const selectedText = selection.toString().trim();
  if (!selectedText) return;

  const editedResult = document.getElementById("edited-result");
  editedResult.textContent = "Editing...";

  try {
    const response = await fetch('/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: selectedText,
        action: action
      }),
    });

    const data = await response.json();
    editedResult.textContent = data.result || "No changes made";
  } catch (error) {
    console.error("Edit error:", error);
    editedResult.textContent = `Error: ${error.message}`;
  }

  // Remove floating menu
  const menu = document.querySelector('.floating-menu');
  if (menu) menu.remove();
}


// Add this after your existing code in scripts.js

// Initialize text selection when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeTextSelection();
});

function initializeTextSelection() {
    const resultDiv = document.getElementById("result");
    
    // Handle text selection
    resultDiv.addEventListener('mouseup', function() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0) {
            // Get position of selection
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Remove any existing menu
            removeExistingMenu();
            
            // Create and position new menu
            createFloatingMenu(rect, selectedText);
        }
    });
    
    // Close menu when clicking elsewhere
    document.addEventListener('mousedown', function(e) {
        if (!e.target.closest('.floating-menu')) {
            removeExistingMenu();
        }
    });
}

function removeExistingMenu() {
    const existingMenu = document.querySelector('.floating-menu');
    if (existingMenu) existingMenu.remove();
}

function createFloatingMenu(rect, selectedText) {
    const menu = document.createElement('div');
    menu.className = 'floating-menu';
    
    // Position menu near selection
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;
    
    // Add edit options
    const actions = [
        {name: 'Rephrase', action: 'rephrase'},
        {name: 'Simplify', action: 'simplify'},
        {name: 'Shorten', action: 'shorten'},
        {name: 'Expand', action: 'lengthen'},
        {name: 'Formal', action: 'change_tone'}
    ];

    actions.forEach(item => {
        const button = document.createElement('button');
        button.textContent = item.name;
        button.addEventListener('click', () => handleEditAction(selectedText, item.action));
        menu.appendChild(button);
    });

    document.body.appendChild(menu);
}

async function handleEditAction(text, action) {
    const editedResult = document.getElementById("edited-result");
    editedResult.textContent = "Processing...";
    
    try {
        const response = await fetch('/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                action: action
            }),
        });

        const data = await response.json();
        editedResult.textContent = data.result || "No changes made";
    } catch (error) {
        console.error("Edit error:", error);
        editedResult.textContent = `Error: ${error.message}`;
    }
    
    removeExistingMenu();
}