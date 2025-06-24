document.addEventListener('DOMContentLoaded', function () {
    const statusDiv = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const toggleBtn = document.getElementById('toggle-btn');

    let isEnabled = true;

    // Get current status from content script
    function updateStatus() {
        browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            browser.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, function (response) {
                if (response) {
                    isEnabled = response.enabled;
                    updateUI();
                } else {
                    // Fallback if content script not loaded
                    statusText.textContent = 'Ready';
                    statusDiv.className = 'status enabled';
                    toggleBtn.textContent = 'Disable';
                }
            });
        });
    }

    // Update UI based on current status
    function updateUI() {
        if (isEnabled) {
            statusText.textContent = 'Active';
            statusDiv.className = 'status enabled';
            toggleBtn.textContent = 'Disable';
            toggleBtn.className = 'toggle-btn';
        } else {
            statusText.textContent = 'Disabled';
            statusDiv.className = 'status disabled';
            toggleBtn.textContent = 'Enable';
            toggleBtn.className = 'toggle-btn disabled';
        }
    }

    // Toggle extension state
    function toggleExtension() {
        isEnabled = !isEnabled;

        browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'toggleExtension',
                enabled: isEnabled
            }, function (response) {
                if (response && response.status === 'success') {
                    updateUI();
                }
            });
        });
    }

    // Event listeners
    toggleBtn.addEventListener('click', toggleExtension);

    // Initialize
    updateStatus();
});