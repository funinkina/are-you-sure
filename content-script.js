(function () {
    'use strict';

    let isExtensionEnabled = true;
    let popup = null;
    let overlay = null;

    const YOUTUBE_SELECTORS = [
        'a[href^="/watch"]',
        'a.ytd-thumbnail',
        'a.ytd-video-renderer',
        'a.ytd-compact-video-renderer',
        'a.ytd-playlist-video-renderer',
        'button.ytp-play-button',
        '.ytp-thumbnail-overlay',
        'a[href^="/shorts"]',
        'a.ytd-shorts',
        'ytd-thumbnail',
        'ytd-video-renderer',
        'a.yt-simple-endpoint[href^="/watch"]'
    ];

    const REDDIT_SELECTORS = [
        'a.title',
        'a[href^="/r/"]',
        'a.post',
        'a.comments-link',
        'button.arrow',
        '.post-link',
        '[data-click-id="body"]',
        '[data-click-id="image"]'
    ];

    const TWITTER_SELECTORS = [
        'a[href^="/status"]',
        'div[data-testid="tweet"]',
        'div[role="button"]',
        'article'
    ];

    const FACEBOOK_SELECTORS = [
        'a[href^="/posts"]',
        'a[href^="/photo"]',
        'a[href^="/video"]',
        'div[role="button"]'
    ];

    let enabledSites = {
        youtube: true,
        reddit: true,
        twitter: true,
        facebook: true
    };

    browser.storage.local.get(['enabledSites', 'isEnabled'], function (result) {
        if (result.enabledSites) {
            enabledSites = result.enabledSites;
        }

        if (result.isEnabled !== undefined) {
            isExtensionEnabled = result.isEnabled;
        }
    });

    function createPopup() {
        overlay = document.createElement('div');
        overlay.className = 'element-popup-overlay';
        document.body.appendChild(overlay);

        const popup = document.createElement('div');
        popup.id = 'element-click-popup';
        popup.className = 'element-popup-container';
        popup.innerHTML = `
            <div class="element-popup-content">
                <img src="https://i.imgflip.com/9oa21z.png" class="element-popup-image" alt="Are you sure?" />

                <div class="element-popup-actions">
                    <button id="confirm-action" class="element-popup-deactive">YES</button>
                    <button id="cancel-action" class="element-popup-active">Nah I'm good</button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        return popup;
    }

    function showPopup(element, event) {
        if (!isExtensionEnabled) return;

        if (!popup) {
            popup = createPopup();
        }

        overlay.style.display = 'block';
        document.body.classList.add('element-popup-open');

        popup.style.display = 'block';
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';

        const cancelBtn = document.getElementById('cancel-action');
        const confirmBtn = document.getElementById('confirm-action');

        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));

        document.getElementById('cancel-action').addEventListener('click', hidePopup);
        document.getElementById('confirm-action').addEventListener('click', () => {
            hidePopup();
            const isLink = element.tagName.toLowerCase() === 'a' && element.href;
            const isSubmit = element.type === 'submit';
            const form = isSubmit ? element.form : null;

            if (isLink) {
                window.location.href = element.href;
            } else if (isSubmit && form) {
                form.submit();
            } else {
                const newEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                newEvent._bypassPopup = true;
                element.dispatchEvent(newEvent);
            }
        });
    }

    function hidePopup() {
        if (popup) {
            popup.style.display = 'none';
            if (overlay) {
                overlay.style.display = 'none';
            }
            document.body.classList.remove('element-popup-open');
        }
    }

    function shouldTriggerPopup(element) {
        if (popup && popup.contains(element)) {
            return false;
        }

        const hostname = window.location.hostname;
        let currentSite = null;
        let siteSelectors = [];

        if (hostname.includes('youtube.com')) {
            currentSite = 'youtube';
            siteSelectors = YOUTUBE_SELECTORS;
        } else if (hostname.includes('reddit.com')) {
            currentSite = 'reddit';
            siteSelectors = REDDIT_SELECTORS;
        } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            currentSite = 'twitter';
            siteSelectors = TWITTER_SELECTORS;
        } else if (hostname.includes('facebook.com')) {
            currentSite = 'facebook';
            siteSelectors = FACEBOOK_SELECTORS;
        }

        if (!currentSite || !enabledSites[currentSite]) {
            return false;
        }

        const matchesSelector = siteSelectors.some(selector => {
            try {
                return element.matches(selector);
            } catch (e) {
                return false;
            }
        });

        if (matchesSelector) return true;

        let parent = element.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
            const parentMatches = siteSelectors.some(selector => {
                try {
                    return parent.matches(selector);
                } catch (e) {
                    return false;
                }
            });

            if (parentMatches) return true;

            parent = parent.parentElement;
            depth++;
        }

        return false;
    }

    function handleClick(event) {
        if (event._bypassPopup) return;

        const element = event.target;

        if (shouldTriggerPopup(element)) {
            event.preventDefault();
            event.stopPropagation();
            showPopup(element, event);
        }
    }

    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'toggleExtension') {
            isExtensionEnabled = request.enabled;
            browser.storage.local.set({ isExtensionEnabled: isExtensionEnabled });

            if (!isExtensionEnabled) {
                hidePopup();
            }
            sendResponse({ status: 'success' });
        } else if (request.action === 'getStatus') {
            sendResponse({ enabled: isExtensionEnabled, sites: enabledSites });
        } else if (request.action === 'updateSites') {
            enabledSites = request.sites;
            browser.storage.local.set({ enabledSites: enabledSites });
            sendResponse({ status: 'success' });
        }
    });

    document.addEventListener('click', handleClick, true);

    document.addEventListener('click', (event) => {
        if (popup && popup.style.display === 'block' &&
            !popup.contains(event.target) &&
            !shouldTriggerPopup(event.target)) {
            hidePopup();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && popup && popup.style.display === 'block') {
            hidePopup();
        }
    });

})();