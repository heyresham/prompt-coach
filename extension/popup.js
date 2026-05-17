const provider = document.getElementById('provider');
const apiKey = document.getElementById('apiKey');
const apiSection = document.getElementById('apiSection');
const save = document.getElementById('save');
const status = document.getElementById('status');

chrome.storage.sync.get(['apiKey', 'apiProvider'], (data) => {
  provider.value = data.apiProvider || 'demo';
  if (data.apiKey) apiKey.value = data.apiKey;
  toggleApiSection();
});

provider.addEventListener('change', toggleApiSection);

function toggleApiSection() {
  apiSection.style.display = provider.value === 'demo' ? 'none' : 'block';
}

save.addEventListener('click', () => {
  if (provider.value !== 'demo' && !apiKey.value.trim()) {
    flash('Enter an API key, or switch to Demo Mode.', true);
    return;
  }
  chrome.storage.sync.set({
    apiKey: provider.value === 'demo' ? '' : apiKey.value.trim(),
    apiProvider: provider.value
  }, () => {
    flash(provider.value === 'demo'
      ? 'Demo mode active — go test it out!'
      : 'Saved! You\'re in the game.');
  });
});

function flash(msg, isError) {
  status.textContent = msg;
  status.className = 'status ' + (isError ? 'err' : 'ok');
  setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 3000);
}
