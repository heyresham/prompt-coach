const provider = document.getElementById('provider');
const apiKey = document.getElementById('apiKey');
const apiSection = document.getElementById('apiSection');
const save = document.getElementById('save');
const status = document.getElementById('status');

chrome.storage.sync.get(['apiKey', 'apiProvider', 'conciseMode', 'intentCheck'], (data) => {
  provider.value = data.apiProvider || 'demo';
  if (data.apiKey) apiKey.value = data.apiKey;
  toggleApiSection();

  // Load toggle states
  document.getElementById('conciseMode').checked = !!data.conciseMode;
  document.getElementById('intentCheck').checked = data.intentCheck !== false; // default true
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

// Concise mode toggle
document.getElementById('conciseMode').addEventListener('change', (e) => {
  chrome.storage.sync.set({ conciseMode: e.target.checked });
});

// Intent check toggle
document.getElementById('intentCheck').addEventListener('change', (e) => {
  chrome.storage.sync.set({ intentCheck: e.target.checked });
});

document.getElementById('resetOnboarding').addEventListener('click', () => {
  chrome.storage.sync.remove('onboardingDone', () => {
    flash('Onboarding reset! Refresh any AI page to see the tour again.');
  });
});

// Journal count
chrome.runtime.sendMessage({ type: 'GET_JOURNAL_COUNT' }, (resp) => {
  document.getElementById('journalCount').textContent = resp?.count || 0;
});

// Journal status
chrome.runtime.sendMessage({ type: 'GET_JOURNAL_STATUS' }, (resp) => {
  if (resp?.encrypted) {
    document.getElementById('encStatus').textContent = resp.unlocked
      ? 'Encrypted & unlocked for this session'
      : 'Encrypted — enter passphrase to unlock';
    document.getElementById('setPassphrase').textContent = 'Unlock';
  }
});

// View journal
document.getElementById('viewJournal').addEventListener('click', () => {
  chrome.tabs.create({ url: 'journal-view.html' });
});

// Clear journal
document.getElementById('clearJournal').addEventListener('click', () => {
  if (confirm('Delete all journal data? This cannot be undone.')) {
    chrome.runtime.sendMessage({ type: 'CLEAR_JOURNAL' }, () => {
      document.getElementById('journalCount').textContent = '0';
      flash('Journal cleared.');
    });
  }
});

// Set passphrase
document.getElementById('setPassphrase').addEventListener('click', () => {
  const pp = document.getElementById('passphrase').value.trim();
  if (!pp) { flash('Enter a passphrase.', true); return; }

  chrome.runtime.sendMessage({ type: 'GET_JOURNAL_STATUS' }, (resp) => {
    const msgType = resp?.encrypted ? 'UNLOCK_JOURNAL' : 'SET_PASSPHRASE';
    chrome.runtime.sendMessage({ type: msgType, passphrase: pp }, (r) => {
      if (r?.ok || r?.ok === true) {
        document.getElementById('encStatus').textContent = 'Encrypted & unlocked';
        document.getElementById('passphrase').value = '';
        flash('Secured!');
      } else {
        flash('Wrong passphrase or error.', true);
      }
    });
  });
});

function flash(msg, isError) {
  status.textContent = msg;
  status.className = 'status ' + (isError ? 'err' : 'ok');
  setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 3000);
}
