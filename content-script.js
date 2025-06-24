(function () {
    'use strict';

    let isExtensionEnabled = true;
    let popup = null;

    const TRIGGER_SELECTORS = [
        'button',
        'a',
        '.clickable',
        '[data-click-popup]',
        'input[type="submit"]'
    ];

    function createPopup() {
        const popup = document.createElement('div');
        popup.id = 'element-click-popup';
        popup.className = 'element-popup-container';
        popup.innerHTML = `
            <div class="element-popup-content">
                <div class="element-popup-header">  
                    <span class="element-popup-title">Element Clicked!</span>
                    <button class="element-popup-close">&times;</button>
                </div>
                <div class="element-popup-body">
                    <p class="element-popup-text">You clicked on: <span id="clicked-element-info"></span></p>
                    <p class="element-popup-details">Element details will appear here</p>
                    <div class="element-popup-actions">
                        <button id="confirm-action" class="element-popup-confirm">Continue</button>
                        <button id="cancel-action" class="element-popup-cancel">Cancel</button>
                    </div>
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

        const tagName = element.tagName.toLowerCase();
        const className = element.className || 'No class';
        const id = element.id || 'No ID';
        const textContent = element.textContent.trim().substring(0, 50) || 'No text content';

        document.getElementById('clicked-element-info').textContent = tagName;
        document.querySelector('.element-popup-details').innerHTML = `
            <strong>Tag:</strong> ${tagName}<br>
            <strong>ID:</strong> ${id}<br>
            <strong>Class:</strong> ${className}<br>
            <strong>Text:</strong> ${textContent}${textContent.length === 50 ? '...' : ''}
        `;

        // Center the popup on the screen
        popup.style.display = 'block';
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';

        const closeBtn = popup.querySelector('.element-popup-close');
        closeBtn.onclick = hidePopup;

        // Setup the action buttons
        const cancelBtn = document.getElementById('cancel-action');
        const confirmBtn = document.getElementById('confirm-action');

        // Remove any existing event listeners first to prevent multiple handlers
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));

        // Get the fresh references after replacing the nodes
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

        // setTimeout(() => {
        //     if (popup && popup.style.display === 'block') {
        //         hidePopup();
        //     }
        // }, 5000);
    }

    function hidePopup() {
        if (popup) {
            popup.style.display = 'none';
        }
    }

    function shouldTriggerPopup(element) {
        return TRIGGER_SELECTORS.some(selector => {
            try {
                return element.matches(selector);
            } catch (e) {
                return false;
            }
        });
    }

    function handleClick(event) {
        // Skip if this event has the bypass flag
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
            if (!isExtensionEnabled) {
                hidePopup();
            }
            sendResponse({ status: 'success' });
        } else if (request.action === 'getStatus') {
            sendResponse({ enabled: isExtensionEnabled });
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