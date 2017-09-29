import * as Parser from './vastParser.js';
import { initPlayer } from './initPlayer.js';
import { isTimeFormatValid } from './vastParser.js';
import { setCustomControlBarUI } from './videoJsCustomUI.js';
import axios from 'axios';
import videojs from 'video.js';

window.videojs = videojs;
require('videojs-contrib-hls/dist/videojs-contrib-hls.min.js');

/**
 * Post-roll still has problem.
 */
export class AdsHandler {
    constructor() {
        this.init = this.init.bind(this);
        this._requestAd = this._requestAd.bind(this);
        this._requestCompanionAd = this._requestCompanionAd.bind(this);
        this._setMediaSource = this._setMediaSource.bind(this);
        this._parser = new Parser.VASTParser();
        this._pendingRequest = {};
        this._ads = {};
        this._currentTime = 0;
        this._companionAdURI = null;
        this._companionAdClickURI = null;
        this._companionAdWidth = null;
        this._companionAdHeight = null;
        this._videoSource = null;
        this._videoType = null;
        this._videoLength = 0;
    }

    init(videoSource, videoType, adSource) {
        this._videoSource = videoSource;
        this._videoType = videoType;

        var handler = this;
        var player = videojs('point-tv', {
            controls: true,
            autoplay: false,
            preload: 'auto',
            playbackRates: [0.5, 1, 1.25, 1.5, 2],
            "controlBar": {
                "remainingTimeDisplay": false,
            }
        }, function() {
            window.player = this;

            player.ads = require('videojs-contrib-ads');
            player.ads();
            
            // set custom controlBar UI
            setCustomControlBarUI(player);
            // init video src;
            handler._setMediaSource();

            player.on('contentupdate', function() {
                console.log('----- contentupdate -----', player.src());
                handler._videoLength = Math.round(player.duration());
                handler._currentSrc = player.src();
                handler._requestAd(adSource);
                this.ads.disableNextSnapshotRestore = true;
            });

            player.on('readyforpreroll', function() {
                player.ads.startLinearAdMode();
                // initialize companion ad banner
                handler._requestCompanionAd();
                // fix bug of the loading spinner
                document.querySelector('.vjs-loading-spinner').style = 'display:none;';
                player.src(handler._ads[handler._currentTime][0].URI);
                player.play();
            });

            player.on('adended', function() {
                console.log(`--- ad ended ---`);
                handler._ads[handler._currentTime].pop();

                if (handler._ads[handler._currentTime].length) {
                    player.src(handler._ads[handler._currentTime][0].URI);
                    player.play();
                    return;
                }
                player.ads.endLinearAdMode();
                this.ads.disableNextSnapshotRestore = true;
                // resume from ad mode
                handler._setMediaSource();
                player.currentTime(handler._currentTime);
                if (handler._videoLength !== handler._currentTime)
                    player.play();

                document.querySelector('.vjs-loading-spinner').style = null;
            });

            player.on('timeupdate', function() {
                var now = parseInt(player.currentTime());
                if (now === handler._videoLength - 1)
                    now += 1;
                if (handler._pendingRequest[now] && handler._pendingRequest[now].length) {
                    handler._currentTime = now;
                    handler._pendingRequest[now].map((url, index) => {
                        setTimeout(() => {
                            console.log('--- requesting ad ---', handler._pendingRequest[handler._currentTime]);
                            handler._requestAd(url, handler._currentTime);
                            handler._pendingRequest[handler._currentTime].pop();
                        }, index * 300);
                    });
                }
            });

            player.on('ended', function() {
                console.log('!!!!! end !!!!!');
                var key = parseInt(player.duration());
                if (handler._pendingRequest[key] && handler._pendingRequest[key].length) {
                    handler._currentTime = key;
                    handler._pendingRequest[key].map((url, index) => {
                        setTimeout(() => {
                            console.log('!!! post-roll requesting ad !!!');
                            handler._requestAd(url, key);
                            handler._pendingRequest[key].pop();
                        }, index * 300);
                    });
                } else {
                    player.trigger('no-postroll');
                }
            });
            // register other event listener for debugging purpose
            // initPlayer(player);
        });
    }

    _requestAd(url, time) {
        time ? null : time = 0;
        axios.get(url).then((res) => {
            window.adResponse = this._parser.parseFromString(res.data);
            if (window.adResponse.constructor.name === 'VMAPResponse') {
                var vmap = window.adResponse.getAdBreaks();
                [].map.call(vmap, (obj) => {
                    if (obj.timeOffset.toLowerCase() === 'start')
                        this._pendingRequest[0] ? this._pendingRequest[0].push(obj.adSource.URI) :
                        this._pendingRequest[0] = [obj.adSource.URI];
                    else if (obj.timeOffset.toLowerCase() === 'end') {
                        var key = parseInt(player.duration());
                        this._pendingRequest[key] ? this._pendingRequest[key].push(obj.adSource.URI) :
                            this._pendingRequest[key] = [obj.adSource.URI];
                    } else if (obj.timeOffset[obj.timeOffset.length - 1] === '%') {
                        var t = parseInt(obj.timeOffset.substr(0, obj.timeOffset.length - 1)) / 100 * player.duration();
                        t = parseInt(t);
                        this._pendingRequest[t] ? this._pendingRequest[t].push(obj.adSource.URI) :
                            this._pendingRequest[t] = [obj.adSource.URI];
                    } else if (isTimeFormatValid(obj.timeOffset)) {
                        var time = obj.timeOffset.split(':');
                        var sec = time[0] * 3600 + time[1] * 60 + parseInt(time[2]);
                        this._pendingRequest[sec] ? this._pendingRequest[sec].push(obj.adSource.URI) :
                            this._pendingRequest[sec] = [obj.adSource.URI];
                    } else if (obj.timeOffset[0] === '#') {
                        // position unknown place to insert, for now just throw an error
                        throw new Error('Unimplemented error, position in VMAP is not supported for now.')
                    }
                });
                // pre-roll
                if (this._pendingRequest[0]) {
                    while (this._pendingRequest[0].length) {
                        this._requestAd(this._pendingRequest[0][0]);
                        this._pendingRequest[0].pop();
                    }
                }
            } else if (window.adResponse.constructor.name === 'VASTResponse') {
                console.log('--- ad requested ---')
                // handle ad pods
                var adpods = window.adResponse.ads;
                adpods.sort((x, y) => {
                    if (x.sequence > y.sequence)
                        return true;
                    return false;
                });
                window.adResponse.ads.map((ad) => {
                    // handle inline ad
                    if (ad.inline) {
                        var creatives = ad.inline.creatives;
                        creatives.sort((x, y) => {
                            if (x.sequence > y.sequence)
                                return true;
                            return false;
                        });
                        creatives.map((creative) => {
                            // handle linear ad
                            if (creative.linearAd) {
                                var mediaFiles = creative.linearAd.mediaFiles,
                                    _adWidth = null,
                                    _adHeight = null,
                                    _adURI = null;
                                // choose video from the matchedest mediafiles to be played
                                for (var i = 0; i < mediaFiles.length; i++) {
                                    if (!player.canPlayType(mediaFiles[i].type))
                                        continue;
                                    var diff = parseInt(mediaFiles[i].width - player.width()) + parseInt(mediaFiles[i].height - player.height()),
                                        _diff = parseInt(_adWidth - player.width()) + parseInt(_adHeight - player.height());
                                    if (!_adURI) {
                                        _adWidth = mediaFiles[i].width;
                                        _adHeight = mediaFiles[i].height;
                                        _adURI = mediaFiles[i].URI;
                                        continue;
                                    }
                                    if ((_diff < 0 && diff > _diff) || (_diff > 0 && diff > 0 && diff < _diff)) {
                                        _adWidth = mediaFiles[i].width;
                                        _adHeight = mediaFiles[i].height;
                                        _adURI = mediaFiles[i].URI;
                                    }
                                }
                                this._ads[time] ? this._ads[time].push({
                                    width: _adWidth,
                                    height: _adHeight,
                                    URI: _adURI,
                                }) : this._ads[time] = [{
                                    width: _adWidth,
                                    height: _adHeight,
                                    URI: _adURI,
                                }];
                            }

                            // handle companion ad
                            if (creative.companionAd) {
                                creative.companionAd.companion.map((companion) => {
                                    this._companionAdURI = companion.staticResource.URI;
                                    this._companionAdClickURI = companion.companionClickThrough;
                                    this._companionAdWidth = companion.width;
                                    this._companionAdHeight = companion.height;
                                });
                            }
                        });
                        console.log(this._ads[this._currentTime], this._currentTime);
                        if (this._ads[this._currentTime].length >= 1) {
                            console.log('--- ad is fired ---');
                            player.trigger('adsready');
                        } else if (this._ads[this._currentTime].length === 0) {
                            if (player.currentTime() === 0)
                                player.trigger('no-preroll');
                        }
                    }
                });
            } else {
                throw new Error('An unexpected adResponse was returned.');
            }
        }).catch((err) => {
            player.trigger('adserror');
            console.log(err);
        });
    }

    /**
     * after parsing VAST response, this function is used to set up companian ad.
     */
    _requestCompanionAd() {
        if (!(this._companionAdURI && this._companionAdWidth && this._companionAdHeight))
            return;
        var ele = document.getElementById('video-container');
        var companionAdContainer = document.createElement('div');
        companionAdContainer.className = 'col-md-12';
        companionAdContainer.style.height = `${this._companionAdHeight}px`;
        companionAdContainer.style.marginTop = '20px';
        companionAdContainer.innerHTML =
            `<div style="margin: 0 auto;text-align:center;"><a style='display:block;' target="_blank" href="${this._companionAdClickURI}">
            <img src="${this._companionAdURI}" width="${this._companionAdWidth}px" height="${this._companionAdHeight}">
            </a></div>`;
        ele.appendChild(companionAdContainer);
    }

    _setMediaSource(source, videoType) {
        source ? null : source = this._videoSource;
        videoType ? null : videoType = this._videoType;
        player.src({
            src: source,
            type: videoType,
            withCredentials: true
        });
    }
}