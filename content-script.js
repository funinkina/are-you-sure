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

        const rect = element.getBoundingClientRect();
        popup.style.display = 'block';
        popup.style.left = Math.min(event.pageX + 10, window.innerWidth - 320) + 'px';
        popup.style.top = Math.min(event.pageY + 10, window.innerHeight - 200) + 'px';

        const closeBtn = popup.querySelector('.element-popup-close');
        closeBtn.onclick = hidePopup;

        setTimeout(() => {
            if (popup && popup.style.display === 'block') {
                hidePopup();
            }
        }, 5000);
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
        const element = event.target;

        if (shouldTriggerPopup(element)) {
            event.preventDefault();
            event.stopPropagation();

            showPopup(element, event);

            const isLink = element.tagName.toLowerCase() === 'a' && element.href;
            const isSubmit = element.type === 'submit';
            const form = isSubmit ? element.form : null;

            const popupContent = popup.querySelector('.element-popup-body');
            const actionDiv = document.createElement('div');
            actionDiv.className = 'element-popup-actions';
            actionDiv.innerHTML = `
                <button id="confirm-action" class="element-popup-confirm">Continue</button>
                <button id="cancel-action" class="element-popup-cancel">Cancel</button>
            `;
            popupContent.appendChild(actionDiv);

            document.getElementById('confirm-action').addEventListener('click', () => {
                hidePopup();
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

            document.getElementById('cancel-action').addEventListener('click', hidePopup);
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