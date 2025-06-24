browser.runtime.onInstalled.addListener(() => {
    console.log('Element Click Popup extension installed');
});

browser.browserAction.onClicked.addListener((tab) => {
    console.log('Extension icon clicked on tab:', tab.url);
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'logElementClick') {
        console.log('Element clicked:', request.data);
        sendResponse({ status: 'logged' });
    }

    return true;
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    }
});