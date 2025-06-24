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

    // Create popup element
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

    // Show popup with element information
    function showPopup(element, event) {
        if (!isExtensionEnabled) return;

        if (!popup) {
            popup = createPopup();
        }

        // Get element information
        const tagName = element.tagName.toLowerCase();
        const className = element.className || 'No class';
        const id = element.id || 'No ID';
        const textContent = element.textContent.trim().substring(0, 50) || 'No text content';

        // Update popup content
        document.getElementById('clicked-element-info').textContent = tagName;
        document.querySelector('.element-popup-details').innerHTML = `
      <strong>Tag:</strong> ${tagName}<br>
      <strong>ID:</strong> ${id}<br>
      <strong>Class:</strong> ${className}<br>
      <strong>Text:</strong> ${textContent}${textContent.length === 50 ? '...' : ''}
    `;

        // Position popup near click location
        const rect = element.getBoundingClientRect();
        popup.style.display = 'block';
        popup.style.left = Math.min(event.pageX + 10, window.innerWidth - 320) + 'px';
        popup.style.top = Math.min(event.pageY + 10, window.innerHeight - 200) + 'px';

        // Add close event listener
        const closeBtn = popup.querySelector('.element-popup-close');
        closeBtn.onclick = hidePopup;

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (popup && popup.style.display === 'block') {
                hidePopup();
            }
        }, 5000);
    }

    // Hide popup
    function hidePopup() {
        if (popup) {
            popup.style.display = 'none';
        }
    }

    // Check if element matches our trigger selectors
    function shouldTriggerPopup(element) {
        return TRIGGER_SELECTORS.some(selector => {
            try {
                return element.matches(selector);
            } catch (e) {
                return false;
            }
        });
    }

    // Main click event listener
    function handleClick(event) {
        const element = event.target;

        if (shouldTriggerPopup(element)) {
            // Prevent default action temporarily to show popup
            event.preventDefault();
            event.stopPropagation();

            showPopup(element, event);

            // Allow the original action after a short delay
            setTimeout(() => {
                if (element.tagName.toLowerCase() === 'a' && element.href) {
                    window.location.href = element.href;
                } else if (element.type === 'submit') {
                    // Re-trigger the form submission
                    element.click();
                }
            }, 100);
        }
    }

    // Listen for messages from popup/background script
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

    // Add click event listener to document
    document.addEventListener('click', handleClick, true);

    // Hide popup when clicking outside
    document.addEventListener('click', (event) => {
        if (popup && popup.style.display === 'block' &&
            !popup.contains(event.target) &&
            !shouldTriggerPopup(event.target)) {
            hidePopup();
        }
    });

    // Hide popup on escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && popup && popup.style.display === 'block') {
            hidePopup();
        }
    });

})();