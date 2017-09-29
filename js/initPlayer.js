export const initPlayer = (player) => {
    // Trigger this event after to signal that your integration is ready to play ads.
    player.on('adsready', (e) => {
        console.log('ads-ready', e);
    });

    // Trigger this event when an ads starts playing.
    player.on('adplaying', (e) => {
        console.log('ads-playing', e);
    });

    // Trigger this event after starting up the player or setting a new video to skip ads entirely. 
    // This event is optional; if you always plan on displaying ads, you don't need to worry about triggering it.
    player.on('adscanceled', (e) => {
        console.log('ads-cenceled', e);
    });

    // Trigger this event to indicate that an error in the ad integration has ocurred and
    // any ad states should abort so that content can resume.
    player.on('adserror', (e) => {
        console.log('ads-error', e);
    });

    /**
     * start here is for tracking and other custom events.
     */

    // Trigger this when each individual ad begins.
    player.on('ads-ad-started', (e) => {
        console.log('ads-ad-started', e);
    });

    // Fired when the ad is clicked.
    player.on('ads-click', (e) => {
        console.log('ads-click', e);
    });

    // Fired when the ad volume has been muted.
    player.on('ads-mute', (e) => {
        console.log('ads-mute', e);
    });

    //
    player.on('ads-request', (e) => {
        console.log('ads-request', e);
    });

    //
    player.on('ads-load', (e) => {
        console.log('ads-load', e);
    });

    //
    player.on('ads-pod-started', (e) => {
        console.log('ads-pod-started', e);
    });

    //
    player.on('ads-pod-ended', (e) => {
        console.log('ads-pod-ended', e);
    });

    //
    player.on('ads-allpods-completed', (e) => {
        console.log('ads-allpods-completed', e);
    });

    //
    player.on('ads-ad-ended', (e) => {
        console.log('ads-ad-ended', e);
    });

    //
    player.on('ads-first-quartile', (e) => {
        console.log('ads-first-quartile', e);
    });

    //
    player.on('ads-midpoint', (e) => {
        console.log('ads-midpoint', e);
    });

    //
    player.on('ads-third-quartile', (e) => {
        console.log('ads-third-quartile', e);
    });

    // Fired when the ad is resumed.
    player.on('adplay', (e) => {
        console.log('adplay', e);
    });

    // Fired when ad ended, if there is a postroll, this will fire after the postroll.
    player.on('adended', (e) => {
    	console.log('adended', e);
    });

    // Fired when ad is paused.
    player.on('adpause', (e) => {
    	console.log('adpause', e);
    });

    // Fired when ad request timeout.
    player.on('adtimeout', (e) => {
    	console.log('adtimeout', e);
    });

    player.on('contentended', (e) => {
    	console.log('contentended', e);
    });
}