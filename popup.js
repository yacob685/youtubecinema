// Redirect to external site
function redirect() {
    const externalUrl = "https://aboflah.store/AutoSub.html";
    chrome.tabs.create({ url: externalUrl });
}

// Settings Manager
const settingsManager = {
    defaults: {
        cinemaAutoEnabled: true,
        opacity: 95,
        videoSize: 'large',
        theme: 'classic',
        glowIntensity: 'medium',
        ambientMode: false,
        keyboardShortcuts: true,
        fadeAnimation: true,
        autoPauseOnExit: false
    },

    async get(key) {
        const result = await chrome.storage.sync.get([key]);
        return result[key] !== undefined ? result[key] : this.defaults[key];
    },

    async getAll() {
        const result = await chrome.storage.sync.get(Object.keys(this.defaults));
        return { ...this.defaults, ...result };
    },

    async set(key, value) {
        await chrome.storage.sync.set({ [key]: value });
    },

    async setMultiple(settings) {
        await chrome.storage.sync.set(settings);
    },

    async reset() {
        await chrome.storage.sync.set(this.defaults);
    }
};

// Load all settings
async function loadAllSettings() {
    const settings = await settingsManager.getAll();
    
    // Main tab
    setToggleState('cinemaToggle', settings.cinemaAutoEnabled);
    
    // Settings tab
    setToggleState('ambientToggle', settings.ambientMode);
    setToggleState('keyboardToggle', settings.keyboardShortcuts);
    setToggleState('fadeToggle', settings.fadeAnimation);
    setToggleState('autoPauseToggle', settings.autoPauseOnExit);
    
    document.getElementById('opacitySlider').value = settings.opacity;
    document.getElementById('opacityValue').textContent = settings.opacity + '%';
    document.getElementById('videoSizeSelect').value = settings.videoSize;
    document.getElementById('glowSelect').value = settings.glowIntensity;
    
    // Set active theme
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.theme === settings.theme) {
            opt.classList.add('active');
        }
    });
}

// Set toggle state
function setToggleState(toggleId, isActive) {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
        if (isActive) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
}
}
}
// Toggle cinema mode setting
async function toggleCinemaMode() {
const toggle = document.getElementById('cinemaToggle');
const isActive = toggle.classList.contains('active');
const newState = !isActive;
setToggleState('cinemaToggle', newState);
await settingsManager.set('cinemaAutoEnabled', newState);

showMessage(newState ? 'Auto cinema mode enabled' : 'Auto cinema mode disabled', 
            newState ? 'success' : 'info');

// Notify content script
notifyContentScript('updateCinemaPreference', { enabled: newState });
}
// Setup toggle listeners
function setupToggles() {
const toggles = [
{ id: 'cinemaToggle', key: 'cinemaAutoEnabled', action: toggleCinemaMode },
{ id: 'ambientToggle', key: 'ambientMode' },
{ id: 'keyboardToggle', key: 'keyboardShortcuts' },
{ id: 'fadeToggle', key: 'fadeAnimation' },
{ id: 'autoPauseToggle', key: 'autoPauseOnExit' }
];
toggles.forEach(({ id, key, action }) => {
    const toggle = document.getElementById(id);
    if (toggle) {
        toggle.addEventListener('click', action || (async () => {
            const isActive = toggle.classList.contains('active');
            const newState = !isActive;
            setToggleState(id, newState);
            await settingsManager.set(key, newState);
            showMessage(`${key} ${newState ? 'enabled' : 'disabled'}`, 'info');
            notifyContentScript('updateSettings', { [key]: newState });
        }));
    }
});
}
// Opacity slider
document.addEventListener('DOMContentLoaded', () => {
const opacitySlider = document.getElementById('opacitySlider');
const opacityValue = document.getElementById('opacityValue');
opacitySlider.addEventListener('input', async (e) => {
    const value = e.target.value;
    opacityValue.textContent = value + '%';
    await settingsManager.set('opacity', parseInt(value));
    notifyContentScript('updateSettings', { opacity: parseInt(value) });
});
});
// Video size selector
document.addEventListener('DOMContentLoaded', () => {
const videoSizeSelect = document.getElementById('videoSizeSelect');
videoSizeSelect.addEventListener('change', async (e) => {
    const value = e.target.value;
    await settingsManager.set('videoSize', value);
    showMessage(`Video size: ${value}`, 'info');
    notifyContentScript('updateSettings', { videoSize: value });
});
});
// Glow selector
document.addEventListener('DOMContentLoaded', () => {
const glowSelect = document.getElementById('glowSelect');
glowSelect.addEventListener('change', async (e) => {
    const value = e.target.value;
    await settingsManager.set('glowIntensity', value);
    showMessage(`Glow effect: ${value}`, 'info');
    notifyContentScript('updateSettings', { glowIntensity: value });
});
});
// Theme selector
document.addEventListener('DOMContentLoaded', () => {
const themeOptions = document.querySelectorAll('.theme-option');
themeOptions.forEach(option => {
    option.addEventListener('click', async () => {
        const theme = option.dataset.theme;
        
        // Update UI
        themeOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        
        // Save setting
        await settingsManager.set('theme', theme);
        showMessage(`Theme: ${theme}`, 'info');
        notifyContentScript('updateSettings', { theme });
    });
});
});
// Trigger Cinema Mode manually
async function triggerCinemaMode() {
try {
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        showMessage('No active tab found', 'error');
        return;
    }

    if (!tab.url || !tab.url.includes('youtube.com')) {
        showMessage('Please open a YouTube video first!', 'error');
        return;
    }

    if (!tab.url.includes('/watch?v=') && !tab.url.includes('/shorts/')) {
        showMessage('Please navigate to a video or short!', 'error');
        return;
    }

    showMessage('Activating cinema mode...', 'info');

    chrome.tabs.sendMessage(tab.id, { action: 'triggerCinema' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError.message);
            
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }).then(() => {
                setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, { action: 'triggerCinema' }, (retryResponse) => {
                        if (retryResponse && retryResponse.success) {
                            showMessage('Cinema mode activated!', 'success');
                        } else {
                            showMessage('Failed to activate cinema mode', 'error');
                        }
                    });
                }, 500);
            }).catch(err => {
                console.error('Script injection error:', err);
                showMessage('Failed to inject script', 'error');
            });
        } else if (response && response.success) {
            showMessage('Cinema mode activated!', 'success');
        } else {
            showMessage(response?.message || 'Cinema mode failed', 'error');
        }
    });
} catch (error) {
    console.error('Error triggering cinema:', error);
    showMessage('Error occurred', 'error');
}
}
// Show temporary message
function showMessage(text, type) {
const messageEl = document.getElementById('statusMessage');
messageEl.textContent = text;
messageEl.className = status-message ${type};
messageEl.style.display = 'block';
setTimeout(() => {
    messageEl.style.display = 'none';
}, 3000);
}
// Notify content script
async function notifyContentScript(action, data = {}) {
try {
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (tab && tab.url && tab.url.includes('youtube.com')) {
chrome.tabs.sendMessage(tab.id, { action, ...data });
}
} catch (error) {
console.error('Error notifying content script:', error);
}
}
// Load statistics
async function loadStatistics() {
try {
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (tab && tab.url && tab.url.includes('youtube.com')) {
chrome.tabs.sendMessage(tab.id, { action: 'getStats' }, (response) => {
if (response && response.success) {
updateStatsDisplay(response.stats);
}
});
} else {
// Load from storage directly
const result = await chrome.storage.local.get(['cinemaStats']);
if (result.cinemaStats) {
updateStatsDisplay(result.cinemaStats);
}
}
} catch (error) {
console.error('Error loading statistics:', error);
}
}
// Update stats display
function updateStatsDisplay(stats) {
document.getElementById('todayActivations').textContent = stats.todayActivations || 0;
document.getElementById('totalActivations').textContent = stats.activations || 0;
const totalMinutes = Math.floor((stats.totalTime || 0) / 60);
document.getElementById('totalMinutes').textContent = totalMinutes + 'm';

const avgTime = stats.activations > 0 ? Math.floor((stats.totalTime / stats.activations) / 60) : 0;
document.getElementById('averageTime').textContent = avgTime + 'm';

// Update info text
if (stats.activations > 0) {
    const infoText = `You've used cinema mode ${stats.activations} times, watching for ${totalMinutes} minutes total. Keep enjoying your immersive experience!`;
    document.getElementById('statsInfo').textContent = infoText;
}
}
// Reset statistics
async function resetStatistics() {
if (confirm('Are you sure you want to reset all statistics?')) {
await chrome.storage.local.set({
cinemaStats: {
activations: 0,
totalTime: 0,
lastActivation: null,
todayActivations: 0,
lastResetDate: new Date().toDateString()
}
});
    loadStatistics();
    showMessage('Statistics reset!', 'info');
}
}
// Reset all settings
async function resetAllSettings() {
if (confirm('Are you sure you want to reset all settings to defaults?')) {
await settingsManager.reset();
await loadAllSettings();
showMessage('Settings reset to defaults!', 'success');
notifyContentScript('updateSettings', await settingsManager.getAll());
}
}
// Open options page
function openOptionsPage() {
chrome.runtime.openOptionsPage();
}
// Tab switching
function setupTabs() {
const tabs = document.querySelectorAll('.tab');
const contents = document.querySelectorAll('.tab-content');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update tabs
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update content
        contents.forEach(c => c.classList.remove('active'));
        document.getElementById(targetTab + '-tab').classList.add('active');
        
        // Load stats when stats tab is opened
        if (targetTab === 'stats') {
            loadStatistics();
        }
    });
});
}
// Report issue
function reportIssue() {
chrome.tabs.create({ url: 'https://github.com/yourusername/cinematube-pro/issues' });
}
// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
// Load all settings
await loadAllSettings();
// Setup tabs
setupTabs();

// Setup toggles
setupToggles();

// Set up event listeners
document.getElementById('mainSiteLink').addEventListener('click', redirect);
document.getElementById('visitWebpage').addEventListener('click', redirect);
document.getElementById('triggerCinema').addEventListener('click', triggerCinemaMode);
document.getElementById('resetSettings').addEventListener('click', resetAllSettings);
document.getElementById('openOptions').addEventListener('click', openOptionsPage);
document.getElementById('resetStats').addEventListener('click', resetStatistics);
document.getElementById('reportIssue').addEventListener('click', reportIssue);

// Load initial stats
loadStatistics();
});