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

    browser.storage.local.get(['enabledSites', 'isEnabled'], function (result) {
        if (result.enabledSites) {
            enabledSites = result.enabledSites;
        }

        if (result.isEnabled !== undefined) {
            isEnabled = result.isEnabled;
        }

        updateUI();
        updateCheckboxes();

        browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
                browser.tabs.sendMessage(tabs[0].id, { action: 'getStatus' })
                    .then(response => {
                        if (response) {
                            isEnabled = response.enabled;
                            updateUI();
                        }
                    })
                    .catch(error => console.log('Error getting status:', error));
            }
        });
    });

    toggleBtn.addEventListener('click', function () {
        isEnabled = !isEnabled;

        browser.storage.local.set({ isEnabled: isEnabled });

        browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'toggleExtension',
                enabled: isEnabled
            });
        });

        updateUI();
    });

    // Handle site checkboxes
    siteCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            enabledSites[this.value] = this.checked;

            // Save to storage
            browser.storage.local.set({ enabledSites: enabledSites });

            browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                browser.tabs.sendMessage(tabs[0].id, {
                    action: 'updateSites',
                    sites: enabledSites
                });
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