var tabs = {};

browser.extension.onConnect.addListener(function(port)
{
	port.onMessage.addListener(function(msg)
	{
		var curTab = msg.tabid;
		
		if (!curTab)
		{
			return;
		}
		
		if (curTab < 0)
		{
			return;
		}
		
		if (!tabs[curTab])
		{
			tabs[curTab] = {};
			tabs[curTab].panning = 0;
            tabs[curTab].volume = 1;
			tabs[curTab].enabled = 0;
			tabs[curTab].panNode;
			tabs[curTab].context;
			tabs[curTab].source;
		}
		
		if (msg.type == 'set_request')
		{
			tabs[curTab].panning = msg.value[0];
            tabs[curTab].volume = msg.value[1];            
			
			if (tabs[curTab].enabled == 0)
			{
				browser.tabCapture.capture(
				{
					audio: true,
					video: false
				}, function (stream)
				{
					tabs[curTab].context = new AudioContext();
					tabs[curTab].source = tabs[curTab].context.createMediaStreamSource(stream);
					
                    tabs[curTab].gainNode = tabs[curTab].context.createGain();
                    tabs[curTab].gainNode.gain.setValueAtTime(tabs[curTab].volume, tabs[curTab].context.currentTime);
                    
					tabs[curTab].panNode = tabs[curTab].context.createStereoPanner();
					tabs[curTab].panNode.pan.setValueAtTime(tabs[curTab].panning, tabs[curTab].context.currentTime);
					
					tabs[curTab].source.connect(tabs[curTab].gainNode).connect(tabs[curTab].panNode).connect(tabs[curTab].context.destination);
				});
				
				tabs[curTab].enabled = 1;
			}
			else
			{
                if (typeof tabs[curTab].panNode !== "undefined" && typeof tabs[curTab].panNode.pan !== "undefined" && typeof tabs[curTab].gainNode !== "undefined" && typeof tabs[curTab].gainNode.gain !== "undefined") {
    				tabs[curTab].panNode.pan.setValueAtTime(tabs[curTab].panning, tabs[curTab].context.currentTime);
                    tabs[curTab].gainNode.gain.setValueAtTime(tabs[curTab].volume, tabs[curTab].context.currentTime);
                }
			}
		}
		else if (msg.type == 'update_request')
		{
			var msgdata = {
				'type':'update_response',
				'value': [
                    tabs[curTab].panning,
                    tabs[curTab].volume
                ],
				'tabid': curTab
			};
			
			port.postMessage(msgdata);
		}
		else if (mst.type == 'resetall_request')
		{
			
		}
	});
});

<<<<<<< Updated upstream
browser.tabs.onRemoved.addListener(function(tabid, removed) {
	if (tabs[tabid])
	{
		delete tabs[tabid];
	}
=======
function saveTabStates() {
    chrome.storage.session.set({ tabStates });
}

async function ensureOffscreenDocument() {
    const url = chrome.runtime.getURL('offscreen.html');
    const existing = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [url]
    });
    if (existing.length > 0) return;

    // Guard against concurrent calls racing into createDocument.
    if (!creatingOffscreen) {
        creatingOffscreen = chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
            justification: 'Process captured tab audio for stereo panning and volume control'
        }).finally(() => { creatingOffscreen = null; });
    }
    await creatingOffscreen;
}

async function applyAudio(tabId, state) {
    await ensureOffscreenDocument();

    if (!state.enabled) {
        // Mark enabled before the async gap so a second rapid request
        // takes the update_audio path rather than starting a second capture.
        state.enabled = true;
        saveTabStates();

        const streamId = await new Promise((resolve) =>
            chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, resolve)
        );

        if (!streamId) {
            // Capture failed (e.g. tab can't be captured right now) — don't
            // leave state stuck thinking audio is enabled when it isn't.
            state.enabled = false;
            saveTabStates();
            return;
        }

        chrome.runtime.sendMessage({
            target: 'offscreen',
            type: 'capture_tab',
            tabId,
            streamId,
            panning: state.panning,
            volume: state.volume,
            eq: state.eq
        }).catch(() => {});
    } else {
        chrome.runtime.sendMessage({
            target: 'offscreen',
            type: 'update_audio',
            tabId,
            panning: state.panning,
            volume: state.volume,
            eq: state.eq
        }).catch(() => {});
    }
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
    ]);
}

async function resetTabAudio(tabId, state) {
    await ensureOffscreenDocument();

    // Tear down any existing graph for this tab before recreating it. Covers
    // the case where the offscreen document's audio graph went stale (e.g. a
    // tab reload invalidated the captured MediaStream, or the offscreen
    // document itself restarted) while this state still says enabled: true,
    // which would otherwise route applyAudio into the update_audio path and
    // silently no-op against a graph that no longer exists.
    await chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'release_tab',
        tabId
    }).catch(() => {});

    state.enabled = false;
    await applyAudio(tabId, state);
}

chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener(async (msg) => {
        const tabId = msg.tabid;
        if (!tabId || tabId < 0) return;

        if (!tabStates[tabId]) {
            tabStates[tabId] = { panning: 0, volume: 1, eq: Array(12).fill(0), enabled: false };
        }
        const state = tabStates[tabId];

        if (msg.type === 'set_request') {
            state.panning = parseFloat(msg.value[0]);
            state.volume = parseFloat(msg.value[1]);
            saveTabStates();

            await applyAudio(tabId, state);
        } else if (msg.type === 'set_eq_request') {
            state.eq = msg.value.map(parseFloat);
            saveTabStates();

            await applyAudio(tabId, state);
        } else if (msg.type === 'update_request') {
            port.postMessage({
                type: 'update_response',
                value: [state.panning, state.volume],
                eq: state.eq,
                tabid: tabId
            });
        } else if (msg.type === 'reset_request') {
            // Always respond, even if the reset hangs or throws — otherwise
            // the popup's refresh button is stuck spinning forever with no
            // way to recover.
            try {
                await withTimeout(resetTabAudio(tabId, state), 8000);
            } catch (e) {
                state.enabled = false;
                saveTabStates();
            }
            port.postMessage({
                type: 'update_response',
                value: [state.panning, state.volume],
                eq: state.eq,
                tabid: tabId
            });
        }
    });
});

chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabStates[tabId]) {
        delete tabStates[tabId];
        saveTabStates();
        chrome.runtime.sendMessage({
            target: 'offscreen',
            type: 'release_tab',
            tabId
        }).catch(() => {});
    }
>>>>>>> Stashed changes
});
