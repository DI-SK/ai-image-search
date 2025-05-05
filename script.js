// Theme management
const themeToggle = document.getElementById('theme-toggle');
const themeSelector = document.querySelector('.theme-selector');
const themeButtons = document.querySelectorAll('.theme-btn');

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  themeSelector.classList.toggle('visible');
});

themeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.getAttribute('data-theme');
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeSelector.classList.remove('visible');
  });
});

// Close theme selector when clicking outside
document.addEventListener('click', (e) => {
  if (!themeSelector.contains(e.target) && e.target !== themeToggle) {
    themeSelector.classList.remove('visible');
  }
});

// Calculator Logic
const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');
const clearBtn = document.getElementById('clear');
const equalsBtn = document.getElementById('equals');
const backspaceBtn = document.getElementById('backspace');

let currentExpression = '';
let lastResult = '';

// Helper: Format number for display
function formatNumber(num) {
  if (typeof num === 'number') {
    return num.toString().length > 10 ? num.toExponential(6) : num.toString();
  }
  return num;
}

// Helper: Safe evaluation using Decimal.js
function safeEval(expr) {
  try {
    // Replace mathematical functions
    expr = expr.replace(/sin\(/g, 'Math.sin(')
              .replace(/cos\(/g, 'Math.cos(')
              .replace(/tan\(/g, 'Math.tan(')
              .replace(/sqrt\(/g, 'Math.sqrt(')
              .replace(/log10\(/g, 'Math.log10(')
              .replace(/log\(/g, 'Math.log(')
              .replace(/\^/g, '**');

    // Evaluate using Function constructor for better safety
    const result = new Function('return ' + expr)();
    return typeof result === 'number' && isFinite(result) ? result : 'Error';
  } catch (error) {
    console.error('Evaluation error:', error);
    return 'Error';
  }
}

// Update display
function updateDisplay() {
  display.value = currentExpression || '0';
}

// Handle number and operator input
buttons.forEach(button => {
  if (!button.id) {  // Skip special buttons (clear, equals, backspace)
    button.addEventListener('click', () => {
      const value = button.getAttribute('data-value');
      if (value) {
        if (lastResult && !isNaN(value[0])) {
          // If starting new number after result, clear previous
          currentExpression = value;
          lastResult = '';
        } else {
          currentExpression += value;
        }
        updateDisplay();
      }
    });
  }
});

// Clear button
clearBtn.addEventListener('click', () => {
  currentExpression = '';
  lastResult = '';
  updateDisplay();
});

// Backspace button
backspaceBtn.addEventListener('click', () => {
  currentExpression = currentExpression.slice(0, -1);
  updateDisplay();
});

// Equals button
equalsBtn.addEventListener('click', () => {
  if (currentExpression) {
    const result = safeEval(currentExpression);
    currentExpression = formatNumber(result);
    lastResult = currentExpression;
    updateDisplay();
  }
});

// Background upload
const bgUpload = document.getElementById('bg-upload');
const bgReset = document.getElementById('bg-reset');

bgUpload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const url = ev.target.result;
    document.body.classList.add('custom-bg');
    document.body.style.backgroundImage = `url('${url}')`;
    localStorage.setItem('customBg', url);
  };
  reader.readAsDataURL(file);
});

document.querySelector('label[for="bg-upload"]').addEventListener('click', () => {
  bgUpload.click();
});

bgReset.addEventListener('click', () => {
  document.body.classList.remove('custom-bg');
  document.body.style.backgroundImage = '';
  localStorage.removeItem('customBg');
}); 