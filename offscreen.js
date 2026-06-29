// Keyed by tabId. Holds the live Web Audio graph for each captured tab.
const tabAudio = {};

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.target !== 'offscreen') return;

    switch (msg.type) {
        case 'capture_tab':
            captureTab(msg.tabId, msg.streamId, msg.panning, msg.volume);
            break;
        case 'update_audio':
            updateAudio(msg.tabId, msg.panning, msg.volume);
            break;
        case 'release_tab':
            releaseTab(msg.tabId);
            break;
    }
});

async function captureTab(tabId, streamId, panning, volume) {
    // If the service worker restarted and lost its state but this document kept
    // running, the audio graph already exists — just update the values.
    if (tabAudio[tabId]) {
        updateAudio(tabId, panning, volume);
        return;
    }

    // getUserMedia with chromeMediaSource:'tab' consumes the one-time streamId
    // obtained via chrome.tabCapture.getMediaStreamId() in the service worker.
    // Chrome mutes the tab's own audio output while this stream is active.
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId
            }
        },
        video: false
    });

    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const gainNode = context.createGain();
    // getUserMedia tab capture returns a stereo stream. StereoPannerNode's
    // stereo-in algorithm shifts the stereo field rather than panning, which
    // for correlated content (L≈R) reads as volume change instead of position.
    // Forcing the gain node to mono triggers the spec's speaker downmix
    // (0.5·L + 0.5·R) so the panner always receives a true mono signal.
    gainNode.channelCount = 1;
    gainNode.channelCountMode = 'explicit';
    gainNode.gain.setValueAtTime(volume, context.currentTime);
    const panNode = context.createStereoPanner();
    panNode.pan.setValueAtTime(panning, context.currentTime);
    source.connect(gainNode).connect(panNode).connect(context.destination);

    tabAudio[tabId] = { context, source, gainNode, panNode };
}

function updateAudio(tabId, panning, volume) {
    const audio = tabAudio[tabId];
    if (!audio) return;
    audio.panNode.pan.setValueAtTime(panning, audio.context.currentTime);
    audio.gainNode.gain.setValueAtTime(volume, audio.context.currentTime);
}

function releaseTab(tabId) {
    const audio = tabAudio[tabId];
    if (!audio) return;
    audio.source.disconnect();
    audio.context.close();
    delete tabAudio[tabId];
}
