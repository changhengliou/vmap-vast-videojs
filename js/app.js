import * as Parser from './vastParser.js';
import { AdsHandler } from './adsHandler.js'

var parser = new Parser.VASTParser();
window.parser = parser;

var handler = new AdsHandler();
window.handler = handler;

// vmap
handler.init(
	'/media/hls/getplaylist?iA=0&tR=1&res=720',
	'application/x-mpegURL',
	'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpremidpostpod&cmsid=496&vid=short_onecue&correlator='
);

// handler.init(
// 	'/media/0.480p.mp4',
// 	'video/mp4',
// 	'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpremidpostpod&cmsid=496&vid=short_onecue&correlator='
// );

// vast
// handler.init(
// 	'/media/hls/getplaylist?iA=0&tR=1&res=720',
// 	'application/x-mpegURL',
// 	'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dlinear&correlator='
// );
// handler.init('/media/getvastresponse');
// handler.init('https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dlinear&correlator=');