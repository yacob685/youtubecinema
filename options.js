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
        rememberPerChannel: false,
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
    
    // General
    setToggleState('autoToggle', settings.cinemaAutoEnabled);
    setToggleState('perChannelToggle', settings.rememberPerChannel);
    
    // Appearance
    document.getElementById('opacitySlider').value = settings.opacity;
    document.getElementById('opacityValue').textContent = settings.opacity + '%';
    document.getElementById('videoSizeSelect').value = settings.videoSize;
    document.getElementById('glowSelect').value = settings.glowIntensity;
    
    // Set active theme
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.theme === settings.theme) {
            card.classList.add('active');
        }
    });
    
    // Features
    setToggleState('ambientToggle', settings.ambientMode);
    setToggleState('keyboardToggle', settings.keyboardShortcuts);
    setToggleState('fadeToggle', settings.fadeAnimation);
    setToggleState('autoPauseToggle', settings.autoPauseOnExit);
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

// Setup toggle listeners
function setupToggles() {
    const toggles = [
        { id: 'autoToggle', key: 'cinemaAutoEnabled' },
        { id: 'perChannelToggle', key: 'rememberPerChannel' },
        { id: 'ambientToggle', key: 'ambientMode' },
        { id: 'keyboardToggle', key: 'keyboardShortcuts' },
        { id: 'fadeToggle', key: 'fadeAnimation' },
        { id:'autoPauseToggle', key: 'autoPauseOnExit' }
];
toggles.forEach(({ id, key }) => {
    const toggle = document.getElementById(id);
    if (toggle) {
        toggle.addEventListener('click', () => {
            const isActive = toggle.classList.contains('active');
            const newState = !isActive;
            setToggleState(id, newState);
            settingsManager.set(key, newState);
        });
    }
});
}
// Opacity slider
document.getElementById('opacitySlider').addEventListener('input', (e) => {
const value = e.target.value;
document.getElementById('opacityValue').textContent = value + '%';
});
// Theme selector
document.querySelectorAll('.theme-card').forEach(card => {
card.addEventListener('click', () => {
document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
card.classList.add('active');
});
});
// Save settings
async function saveSettings() {
const settings = {
cinemaAutoEnabled: document.getElementById('autoToggle').classList.contains('active'),
rememberPerChannel: document.getElementById('perChannelToggle').classList.contains('active'),
opacity: parseInt(document.getElementById('opacitySlider').value),
videoSize: document.getElementById('videoSizeSelect').value,
theme: document.querySelector('.theme-card.active').dataset.theme,
glowIntensity: document.getElementById('glowSelect').value,
ambientMode: document.getElementById('ambientToggle').classList.contains('active'),
keyboardShortcuts: document.getElementById('keyboardToggle').classList.contains('active'),
fadeAnimation: document.getElementById('fadeToggle').classList.contains('active'),
autoPauseOnExit: document.getElementById('autoPauseToggle').classList.contains('active')
};
await settingsManager.setMultiple(settings);
showSaveIndicator();
}
// Reset settings
async function resetSettings() {
if (confirm('Are you sure you want to reset all settings to defaults?')) {
await settingsManager.reset();
await loadAllSettings();
showSaveIndicator('Settings reset to defaults!');
}
}
// Show save indicator
function showSaveIndicator(message = '✓ Settings saved successfully!') {
const indicator = document.getElementById('saveIndicator');
indicator.textContent = message;
indicator.classList.add('show');
setTimeout(() => {
    indicator.classList.remove('show');
}, 3000);
}
// Initialize
document.addEventListener('DOMContentLoaded', async () => {
await loadAllSettings();
setupToggles();
document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('resetBtn').addEventListener('click', resetSettings);
});