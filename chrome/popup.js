document.addEventListener('DOMContentLoaded', function () {
    const toggleBtn = document.getElementById('toggle-btn');
    const statusText = document.getElementById('status-text');
    const statusContainer = document.getElementById('status');
    const siteCheckboxes = document.querySelectorAll('input[name="site"]');

    let isEnabled = true;
    let enabledSites = {
        youtube: true,
        reddit: true,
        twitter: true,
        facebook: true
    };

    // Load initial state from storage
    chrome.storage.local.get(['enabledSites', 'isEnabled'], function (result) {
        if (result.enabledSites) {
            enabledSites = result.enabledSites;
        }
        if (result.isEnabled !== undefined) {
            isEnabled = result.isEnabled;
        }

        updateUI();
        updateCheckboxes();

        // Sync with the active tab's state
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, function (response) {
                    // Check for errors from sending the message, like if the content script isn't injected
                    if (chrome.runtime.lastError) {
                        console.log('Could not get status from content script:', chrome.runtime.lastError.message);
                        // The UI is already updated from storage, which is a good fallback
                        return;
                    }
                    if (response) {
                        isEnabled = response.enabled;
                        updateUI();
                    }
                });
            }
        });
    });

    toggleBtn.addEventListener('click', function () {
        isEnabled = !isEnabled;

        chrome.storage.local.set({ isEnabled: isEnabled });

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggleExtension',
                    enabled: isEnabled
                });
            }
        });

        updateUI();
    });

    siteCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            enabledSites[this.value] = this.checked;

            chrome.storage.local.set({ enabledSites: enabledSites });

            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'updateSites',
                        sites: enabledSites
                    });
                }
            });
        });
    });

    function updateUI() {
        if (isEnabled) {
            statusContainer.classList.add('enabled');
            statusContainer.classList.remove('disabled');
            statusText.textContent = 'Enabled';
            toggleBtn.textContent = 'Disable';
            toggleBtn.classList.remove('disabled');
        } else {
            statusContainer.classList.add('disabled');
            statusContainer.classList.remove('enabled');
            statusText.textContent = 'Disabled';
            toggleBtn.textContent = 'Enable';
            toggleBtn.classList.add('disabled');
        }
    }

    function updateCheckboxes() {
        for (const site in enabledSites) {
            const checkbox = document.getElementById(site);
            if (checkbox) {
                checkbox.checked = enabledSites[site];
            }
        }
    }
});