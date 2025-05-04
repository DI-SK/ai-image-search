// Calculator logic and theme/background handling
const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn[data-value]');
const equals = document.getElementById('equals');
const clear = document.getElementById('clear');
const backspace = document.getElementById('backspace');
const themeToggle = document.getElementById('theme-toggle');
const themeSelector = document.querySelector('.theme-selector');
const themeBtns = document.querySelectorAll('.theme-btn[data-theme]');
const bgUpload = document.getElementById('bg-upload');
const bgReset = document.getElementById('bg-reset');

let expression = '';
let lastResult = '';

function updateDisplay(val) {
  display.value = val;
}

function insertValue(val) {
  expression += val;
  updateDisplay(expression);
}

function clearDisplay() {
  expression = '';
  updateDisplay('');
}

function backspaceDisplay() {
  expression = expression.slice(0, -1);
  updateDisplay(expression);
}

function safeEval(expr) {
  // Replace math functions and constants
  let safe = expr
    .replace(/π/g, 'Math.PI')
    .replace(/e/g, 'Math.E')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/log10\(/g, 'Math.log10(')
    .replace(/log\(/g, 'Math.log(')
    .replace(/\^/g, '**');
  // Use Decimal.js for numbers
  try {
    // eslint-disable-next-line no-new-func
    let result = Function('Decimal', `return Decimal(${safe})`)(Decimal);
    return result.toString();
  } catch (e) {
    try {
      // fallback to eval for scientific functions
      // eslint-disable-next-line no-eval
      let result = eval(safe);
      return result;
    } catch {
      return 'Error';
    }
  }
}

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    insertValue(btn.getAttribute('data-value'));
  });
});

equals.addEventListener('click', () => {
  if (!expression) return;
  let result = safeEval(expression);
  updateDisplay(result);
  lastResult = result;
  expression = '';
});

clear.addEventListener('click', clearDisplay);
backspace.addEventListener('click', backspaceDisplay);

display.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    equals.click();
  }
});

// Theme selector toggle
let themeSelectorVisible = false;
themeToggle.addEventListener('click', () => {
  themeSelectorVisible = !themeSelectorVisible;
  themeSelector.classList.toggle('active', themeSelectorVisible);
});

themeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.getAttribute('data-theme');
    document.body.className = `theme-${theme}`;
    localStorage.setItem('theme', theme);
    document.body.classList.remove('custom-bg');
    document.body.style.backgroundImage = '';
    localStorage.removeItem('customBg');
  });
});

// Theme persistence
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'spaceship';
  document.body.className = `theme-${savedTheme}`;
  // Restore custom background if set
  const customBg = localStorage.getItem('customBg');
  if (customBg) {
    document.body.classList.add('custom-bg');
    document.body.style.backgroundImage = `url('${customBg}')`;
  }
});

// Background upload
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