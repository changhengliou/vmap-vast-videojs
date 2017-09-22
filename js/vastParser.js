export class VASTResponse {
    constructor() {
        this.version = '3.0';
        this.noAdError = [];
        this.ads = [];
    }
};

/**
 * if input string is in the format of 'hh:mm:ss' or 'hh:mm:ss.mmm', return true, otherwise false.
 * @param  {string} time 
 * @return {boolean}   
 */
export const isTimeFormatValid = (time) => {
    var timePattern = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{0,3}|$)$/;
    if (timePattern.exec(time))
        return true;
    return false;
}

/**
 * verify if adSource (the subelement of adBreak) is valid or not
 * @param  {object}  adSource - the object contains 
 * @param  {string}  id - string identifier
 * @param  {boolean} allowMultipleAds - allow ad pods, this is an optional value, if not specified, default is true
 * @param  {boolean} followRedirects - this is an optional value, specify if it allow redirect with an ad response or not 
 * @return {boolean}         
 */
const isAdSourceValid = (adSource) => {
    var allowMultipleAds = adSource.allowMultipleAds || true,
        followRedirects = adSource.followRedirects || true;
    if (typeof allowMultipleAds !== 'boolean') {
        if (typeof allowMultipleAds !== 'string')
            return false;
        if (!(allowMultipleAds.toLowerCase() === 'true' || allowMultipleAds.toLowerCase() === 'false'))
            return false;
    }
    if (typeof followRedirects !== 'boolean') {
        if (typeof followRedirects !== 'string')
            return false;
        if (!(followRedirects.toLowerCase() === 'true' || followRedirects.toLowerCase() === 'false'))
            return false;
    }
    return true;
}

const isTrackingEventTypeValid = (event) => {
    switch (event) {
        case 'breakStart':
        case 'breakEnd':
        case 'error':
            return true;
        default:
            return false;
    }
}

export class VMAPResponse {
    constructor() {
        this.version = '1.0';
        this._isTimeOffsetValid = this._isTimeOffsetValid.bind(this);
        this._parseBreakType = this._parseBreakType.bind(this);

        var _adBreaks = [];
        this.getAdBreaks = function() {
            return _adBreaks;
        }

        /**
         * parse input and add to AdBreak, if input is invalid, error will be throw. 
         * @param {string} _timeOffset  [description]
         * @param {string}  _breakType  what type of ads are allow, 'linear, 'nonlinear' and 
         * 'display', which maps to companion ads.
         * @param {string} _breakId     an optional string identifier for adbreaks.
         * @param {string} _repeatAfter a time string specify when should the ad repeat after certain
         * amount of time
         */
        this.addAdBreaks = function(_timeOffset, _breakType, _breakId, _repeatAfter, _adSource, _trackingEvent) {
            if (!this._isTimeOffsetValid(_timeOffset))
                throw new Error('Parsing VASTResponse Error - Invalid timeOffset in AdBreak');
            if (_repeatAfter) {
                if (!isTimeFormatValid(_repeatAfter))
                    throw new Error('Parsing VASTResponse Error - Invalid repeatAfter in AdBreak')
            }
            if (_adSource) {
                if (!isAdSourceValid(_adSource))
                    throw new Error('Parsing VASTResponse Error - Invalid adSource');
            }
            if (_trackingEvent) {

            }
            _adBreaks.push({
                timeOffset: _timeOffset,
                breakType: this._parseBreakType(_breakType),
                breakId: _breakId,
                repeatAfter: _repeatAfter,
                adSource: _adSource,
                trackingEvent: _trackingEvent,
            });
        }
    }

    /**
     * this function will return true if adBreak's parameter "timeOffset" is valid, otherwise return false
     * @param  {string}  timeOffset - 4 type of valid timeOffset, either directly provide hh:mm:ss, in the form
     * of percentage, the string "start" and "end", or "#"[number]
     * @return {Boolean} - true if the input is valid
     */
    _isTimeOffsetValid(timeOffset) {
        var _timeOffset = timeOffset.trim().toLowerCase();
        if (isTimeFormatValid(_timeOffset)) // hh:mm:ss
            return true;
        if (_timeOffset.lastIndexOf('%') === _timeOffset.length - 1) { // 0-100%
            let percertage = parseFloat(_timeOffset.split('%')[0]);
            if (percertage <= 100 && percertage >= 0)
                return true;
        }
        if (_timeOffset === 'start' || timeOffset === 'end') // start, end
            return true;
        if (_timeOffset[0] === '#') { // #1
            let number = _timeOffset.split('#')[1];
            if (parseInt(number) >= 1)
                return true;
        }
        return false;
    }

    /**
     * parse asBreak's parameter breakType and return it, if the input is invalid, an error will be thrown  
     * @param  {string} breakType - specify what kind of ads are allow, either "linear", "nonlinear" or "display"
     * if more than one type is allow, use a comma seperate string as an input, ex: "linear,nonlinear"
     * @return {array} an array contains what type of ads are allow.
     */
    _parseBreakType(breakType) {
        var str = breakType.split(',');
        var result = [];
        str.map((_type) => {
            var type = _type.trim();
            switch (type) {
                case 'linear':
                case 'nonlinear':
                case 'display':
                    result.push(type);
                    break;
                default:
                    throw new Error('Parsing VASTResponse Error - Invalid breakType in AdBreak');
            }
        });
        return result;
    }
}

export class VASTParser {
    constructor() {
        this.parser = new DOMParser();
        this.parseFromString = this.parseFromString.bind(this);
        this.parseVASTResponse = this.parseVASTResponse.bind(this);
        this.parseVMAPResponse = this.parseVMAPResponse.bind(this);
        this.parseInlineAd = this.parseInlineAd.bind(this);
        this.parseWrapperAd = this.parseWrapperAd.bind(this);
    }

    parseFromString(string) {
        var xml = this.parser.parseFromString(string, 'application/xml');
        var vmap = xml.getElementsByTagName('vmap:VMAP');
        var vast = xml.getElementsByTagName('VAST');
        if (vmap.length) {
            return this.parseVMAPResponse(vmap);
        } else if (vast.length) {
            return this.parseVASTResponse(vast);
        }
        throw new Error('Parsing VAST Response Error - Invalid VAST Type');
    }

    parseVMAPResponse(vmap) {
        var adBreaks;
        var response = new VMAPResponse();
        response.version = vmap[0].getAttribute('version');
        adBreaks = vmap[0].getElementsByTagName('vmap:AdBreak');
        for (var i = 0; i < adBreaks.length; i++) {
            var adSource = {},
                trackingEvents = [];
            // add AdSource
            var _adSource = adBreaks[i].getElementsByTagName('vmap:AdSource');
            if (_adSource.length) {
                adSource.id = _adSource[0].getAttribute('id');
                adSource.allowMultipleAds = _adSource[0].getAttribute('allowMultipleAds');
                adSource.followRedirects = _adSource[0].getAttribute('followRedirects');
                // if adsource is provided, adData must be also provided
                // we don't support customAdData here
                var vastAdData = _adSource[0].getElementsByTagName('VAST'),
                    adTagURI = _adSource[0].getElementsByTagName('vmap:AdTagURI');
                if (!(vastAdData && adTagURI)) {
                    throw new Error('Parsing VASTResponse Error - At least one adData must be provided.');
                }
                if (adTagURI.length) {
                    adSource.URI = adTagURI[0].textContent || adTagURI[0].innerText;
                    adSource.templateType = adTagURI[0].getAttribute('templateType');
                }
                if (vastAdData.length) {
                    // parse embeded VAST response
                    this.parseVASTResponse(vastAdData[0]);
                }
            }
            // tracking events
            var _trackingEvents = adBreaks[i].getElementsByTagName('vmap:TrackingEvents');
            if (_trackingEvents.length) {
                var _tracking = _trackingEvents[0].getElementsByTagName('vmap:Tracking');
                for (var i = 0; i < _tracking.length; i++) {
                    var tracking = {};
                    tracking.event = _tracking[i].getAttribute('event');
                    tracking.URI = _tracking[i].textContent || _tracking[i].innerText;
                    if (tracking.event === 'error') {
                        // for now set all error code to 900 undefined
                        tracking.URI = tracking.URI.replace('[ERRORCODE]', '900');
                    }
                    trackingEvents.push(tracking);
                }
            }
            // add AdBreak attributes.
            response.addAdBreaks(adBreaks[i].getAttribute('timeOffset'),
                adBreaks[i].getAttribute('breakType'),
                adBreaks[i].getAttribute('breakId'),
                adBreaks[i].getAttribute('repeatAfter'),
                _adSource.length ? adSource : null,
                trackingEvents);
        }
        return response;
    }

    parseVASTResponse(vast) {
        var response = new VASTResponse();
        response.version = vast[0].getAttribute('version');
        var ptr = vast[0].firstElementChild;
        if (!ptr)
            throw new Error('Parsing VASTResponse Error - Empty VAST Response');
        // no ad error
        while (ptr && ptr.tagName === 'Error') {
            var errorUrl = ptr.textContent || ptr.innerText;
            response.noAdError.push(errorUrl.replace('ERRORCODE', 900));
            ptr = ptr.nextElementSibling;
        }
        // handle single ad or ad pods
        var _ads = vast[0].getElementsByTagName('Ad'),
            ads = {};
        for (var i = 0; i < _ads.length; i++) {
            ads.id = _ads[i].getAttribute('id');
            ads.sequence = _ads[i].getAttribute('sequence');
            ads.conditionalId = _ads[i].getAttribute('conditionalId');
            var wrapper = _ads[i].getElementsByTagName('Wrapper'),
                inline = _ads[i].getElementsByTagName('InLine');
            if (wrapper.length) {
                ads.wrapper = this.parseWrapperAd(wrapper);
            } else if(inline.length) {
            	ads.inline = this.parseInlineAd(inline);
            } else {
            	throw new Error('Parsing VASTResponse Error - Can\'t found an InLine or Wrapper Ad.');
            }
            response.ads.push(ads);
        }
        return response;
    }

    parseInlineAd(inline) {
        // survey, category and viewableImpression are not implemented.
        var inlineAd = {},
            adSystem = inline[0].getElementsByTagName('AdSystem'),
            adTitle = inline[0].getElementsByTagName('AdTitle'),
            impression = inline[0].getElementsByTagName('Impression'),
            description = inline[0].getElementsByTagName('Description'),
            advertiser = inline[0].getElementsByTagName('Advertiser'),
            error = inline[0].getElementsByTagName('Error'),
            creatives = inline[0].getElementsByTagName('Creatives');

        if (adSystem[0]) {
            inlineAd.adSystem = adSystem[0].innerHTML;
            inlineAd.adSystemVersion = adSystem[0].getAttribute('version');
        }
        if (impression[0]) {
            inlineAd.impression = impression[0].textContent || impression[0].innerText;
            inlineAd.impressionId = impression[0].getAttribute('Id');
        }
        inlineAd.adTitle = adTitle[0] ? adTitle[0].innerHTML : null;
        inlineAd.adDescription = description[0] ? 
                                 description[0].textContent || description[0].innerText : null;
        inlineAd.advertiser = advertiser[0] ? advertiser[0].innerHTML : null;
        inlineAd.error = error[0] ? error[0].textContent.replace('[ERRORCODE]', 900) || 
                         error[0].innerText.replace('[ERRORCODE]', 900) : null;
        // handling creatives
        if (creatives.length) {
            var creativeNode = creatives[0].firstElementChild;
            inlineAd.creatives = [];
            while (creativeNode) {
                // creativeExtensions is not implemented.
                var creative = {};
                creative.id = creativeNode.getAttribute('id');
                creative.adId = creativeNode.getAttribute('adId');
                creative.sequence = creativeNode.getAttribute('sequence');
                creative.apiFramework = creativeNode.getAttribute('apiFramework');
                var universalAdId = creativeNode.getElementsByTagName('UniversalAdId'), // not implemented
                    linearAdNode = creativeNode.getElementsByTagName('Linear'),
                    nonlinearAd = creativeNode.getElementsByTagName('NonLinearAds');
                // handling linear ads
                if (linearAdNode[0]) {
                    var linearAd = {},
                        duration = linearAdNode[0].getElementsByTagName('Duration'),
                        mediaFiles = linearAdNode[0].getElementsByTagName('MediaFiles'),
                        adParameters = linearAdNode[0].getElementsByTagName('AdParameters'),
                        trackingEvents = linearAdNode[0].getElementsByTagName('TrackingEvents'),
                        videoClicks = linearAdNode[0].getElementsByTagName('VideoClicks'),
                        icons = linearAdNode[0].getElementsByTagName('Icons');
                    linearAd.skipoffset = linearAdNode[0].getAttribute('skipoffset');
                    if (!duration[0]) {
                        throw new Error('Parsing VASTResponse Error - Duration is not specified.');
                    }
                    if (!isTimeFormatValid(duration[0].innerHTML))
                        throw new Error('Parsing VASTResponse Error - Invalid Duration format.');
                    linearAd.duration = duration[0].innerHTML;
                    if (adParameters.length) {
                        linearAd.adParameters = [];
                        for (var i = 0; i < adParameters.length; i++) {
                            var adParam = {};
                            adParam.metadata = adParameters[i].innerHTML;
                            adParam.isXmlEncoded = adParameters[i].getAttribute('xmlEncoded');
                            linearAd.adParameters.push(adParam);
                        }
                    }
                    // handling mediafiles 
                    // mezzanine is not supported for now, error code 406 is return.
                    var mediaFileNodes = mediaFiles[0].getElementsByTagName('MediaFile'),
                        interactiveCreativeFile = mediaFiles[0].getElementsByTagName('InteractiveCreativeFile');
                    if (mediaFiles.length) {
                        linearAd.mediaFiles = [];
                        linearAd.interactiveCreativeFile = [];
                        [].map.call(mediaFileNodes, (node) => {
                        	var mediaFile = {};
                            mediaFile.delivery = node.getAttribute('delivery');
                            mediaFile.type = node.getAttribute('type');
                            mediaFile.width = node.getAttribute('width');
                            mediaFile.height = node.getAttribute('height');
                            mediaFile.codec = node.getAttribute('codec');
                            mediaFile.id = node.getAttribute('id');
                            mediaFile.bitrate = node.getAttribute('bitrate');
                            mediaFile.minBitrate = node.getAttribute('minBitrate');
                            mediaFile.maxBitrate = node.getAttribute('maxBitrate');
                            mediaFile.scalable = node.getAttribute('scalable');
                            mediaFile.maintainAspectRatio = node.getAttribute('maintainAspectRatio');
                            mediaFile.apiFramework = node.getAttribute('apiFramework');
                            mediaFile.URI = node.textContent || node.innerText;
                            linearAd.mediaFiles.push(mediaFile);
                        });

                        [].map.call(interactiveCreativeFile, (node) => {
                        	var interactCF = {};
                        	interactCF.mimeType = node.getAttribute('type');
                        	interactCF.apiFramework = node.getAttribute('apiFramework');
                        	interactCF.URI = node.textContent || node.innerText;
                        	linearAd.interactiveCreativeFile.push(interactCF);
                        });
                    }
                    creative.linearAd = linearAd;
                }
                inlineAd.creatives.push(creative);
                creativeNode = creativeNode.nextElementSibling;
            }
        }
        console.log(inlineAd);
        return inlineAd;
    }

    parseWrapperAd(wrapper) {
        
    }
}