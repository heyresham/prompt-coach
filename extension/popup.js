const provider = document.getElementById('provider');
const apiKey = document.getElementById('apiKey');
const save = document.getElementById('save');
const status = document.getElementById('status');

chrome.storage.sync.get(['apiKey', 'apiProvider'], (data) => {
  if (data.apiProvider) provider.value = data.apiProvider;
  if (data.apiKey) apiKey.value = data.apiKey;
});

save.addEventListener('click', () => {
  const key = apiKey.value.trim();
  if (!key) {
    flash('Enter an API key first.', true);
    return;
  }
  chrome.storage.sync.set({ apiKey: key, apiProvider: provider.value }, () => {
    flash('Saved! You\'re in the game.');
  });
});

function flash(msg, isError) {
  status.textContent = msg;
  status.className = 'status ' + (isError ? 'err' : 'ok');
  setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 3000);
}
