// Debug helper
function log(msg) {
    console.log(`[AutoSub Pro]: ${msg}`);
}

// Auto-Like Function
function autoLike() {
    log('Attempting to auto-like...');
    
    // Try multiple selectors for like button
    const likeButton = document.querySelector('like-button-view-model button') ||
                       document.querySelector('#top-level-buttons-computed > segmented-like-dislike-button-view-model > yt-smartimation > div > div > like-button-view-model > toggle-button-view-model > button') ||
                       document.querySelector('ytd-menu-renderer button[aria-label*="like"]');
    
    if (likeButton) {
        const isLiked = likeButton.getAttribute('aria-pressed') === 'true';
        
        if (isLiked) {
            log('Video already liked.');
        } else {
            log('Clicking like button...');
            likeButton.click();
        }
    } else {
        // Fallback method
        log('Trying fallback like method...');
        const segmentedContainer = document.querySelector('ytd-segmented-like-dislike-button-renderer');
        
        if (segmentedContainer) {
            const likeToggle = segmentedContainer.querySelector('ytd-toggle-button-renderer');
            
            if (likeToggle) {
                const btn = likeToggle.querySelector('button');
                const isLiked = btn && btn.getAttribute('aria-pressed') === 'true';
                
                if (!isLiked && btn) {
                    log('Clicking like button (fallback)...');
                    btn.click();
                }
            }
        } else {
            log('Like button not found with any method.');
        }
    }
}

// Auto-Subscribe Function
function autoSubscribe() {
    log('Attempting to auto-subscribe...');
    
    const subscribeRenderer = document.querySelector('ytd-subscribe-button-renderer');
    
    if (!subscribeRenderer) {
        log('Subscribe button not found yet.');
        return;
    }
    
    const isSubscribed = subscribeRenderer.hasAttribute('subscribed');
    
    if (isSubscribed) {
        log('Already subscribed to this channel.');
        return;
    }
    
    const subscribeButton = subscribeRenderer.querySelector('button');
    
    if (subscribeButton) {
        log('Clicking subscribe button...');
        subscribeButton.click();
    } else {
        log('Subscribe button element not found.');
    }
}

// Enable Cinematic Mode
function enableCinematicMode() {
    log('Enabling cinematic mode...');
    
    // Add cinematic class to body
    document.body.classList.add('autosub-cinematic-mode');
    
    // Get video title
    const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') || 
                        document.querySelector('h1.title') ||
                        document.querySelector('yt-formatted-string.style-scope.ytd-watch-metadata');
    const videoTitle = titleElement ? titleElement.textContent.trim() : 'Now Playing';
    
    // Create cinematic overlay with close button
    const overlay = document.createElement('div');
    overlay.id = 'autosub-cinematic-overlay';
    overlay.innerHTML = `
        <div class="cinematic-header">
            <div class="cinematic-title">${videoTitle}</div>
            <button class="cinematic-exit" id="exit-cinematic">✕ CLICK ESC Button To Exit Cinema Mode</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Exit button functionality
    const exitBtn = overlay.querySelector('#exit-cinematic');
    exitBtn.addEventListener('click', disableCinematicMode);
    
    // Add keyboard shortcut (ESC key)
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            disableCinematicMode();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Animate in
    setTimeout(() => {
        overlay.classList.add('active');
    }, 100);
    
    // Auto-hide title after 3 seconds
    const header = overlay.querySelector('.cinematic-header');
    let hideTimeout;
    
    setTimeout(() => {
        header.classList.add('hidden');
    }, 5000);
    
    // Show on hover and hide again after 3 seconds
    header.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        header.classList.remove('hidden');
        
        hideTimeout = setTimeout(() => {
            header.classList.add('hidden');
        }, 3000);
    });
    
    log('Cinematic mode enabled!');
}

// Disable Cinematic Mode
function disableCinematicMode() {
    log('Disabling cinematic mode...');
    
    const overlay = document.getElementById('autosub-cinematic-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }
    
    document.body.classList.remove('autosub-cinematic-mode');
    
    log('Cinematic mode disabled!');
}

// Check if auto cinema mode is enabled
async function checkCinemaPreference() {
    try {
        const result = await chrome.storage.sync.get(['cinemaAutoEnabled']);
        // Default to true if not set
        return result.cinemaAutoEnabled !== false;
    } catch (error) {
        log('Error checking cinema preference: ' + error.message);
        return true; // Default to enabled
    }
}

// Run all actions
async function runAutoActions() {
    const isShort = location.href.includes('/shorts/');
    log(`${isShort ? 'Short' : 'Video'} detected. Starting auto-actions...`);
    
    // Auto-like after 1.5 seconds
    setTimeout(() => {
        autoLike();
    }, 1500);
    
    // Auto-subscribe after 2 seconds
    setTimeout(() => {
        autoSubscribe();
    }, 2000);
    
    // Enable cinematic mode after 5 seconds (only for videos, not shorts)
    if (!isShort) {
        // Check if auto cinema mode is enabled
        const cinemaEnabled = await checkCinemaPreference();
        
        if (cinemaEnabled) {
            setTimeout(() => {
                enableCinematicMode();
            }, 5000);
        } else {
            log('Auto cinema mode is disabled by user.');
        }
    } else {
        log('Cinematic mode skipped for Short.');
    }
}

// Detect when a video or short is opened
let lastUrl = location.href;

function checkForVideoChange() {
    const currentUrl = location.href;
    const isVideoPage = currentUrl.includes('/watch?v=') || currentUrl.includes('/shorts/');
    
    if (currentUrl !== lastUrl && isVideoPage) {
        log('New video/short detected!');
        lastUrl = currentUrl;
        
        // Disable cinematic mode from previous video
        disableCinematicMode();
        
        // Run new actions
        runAutoActions();
    }
}

// Initial check when page loads
if (location.href.includes('/watch?v=') || location.href.includes('/shorts/')) {
    log('Extension loaded on video/short page.');
    runAutoActions();
}

// Watch for URL changes
setInterval(checkForVideoChange, 1000);

// Listen for YouTube navigation
document.addEventListener('yt-navigate-finish', () => {
    log('YouTube navigation detected.');
    checkForVideoChange();
});

log('AutoSub Pro extension loaded and monitoring...');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'triggerCinema') {
        log('Cinema mode triggered from popup!');
        
        // Check if we're on a video page (not shorts)
        if (location.href.includes('/watch?v=')) {
            // If already in cinema mode, restart it
            if (document.body.classList.contains('autosub-cinematic-mode')) {
                disableCinematicMode();
                setTimeout(() => {
                    enableCinematicMode();
                }, 300);
            } else {
                // Enable cinema mode
                enableCinematicMode();
            }
            sendResponse({ success: true });
        } else if (location.href.includes('/shorts/')) {
            log('Cinema mode not available for Shorts');
            sendResponse({ success: false, message: 'Cinema mode not available for Shorts' });
        } else {
            log('Not on a video page');
            sendResponse({ success: false, message: 'Not on a video page' });
        }
    } else if (request.action === 'updateCinemaPreference') {
        log('Cinema preference updated: ' + request.enabled);
        sendResponse({ success: true });
    }
    return true; // Keep the message channel open for async response
});