import videojs from 'video.js';

export const setCustomControlBarUI = (player) => {
    if (!player || player.constructor.name !== 'Player')
        throw new Error('A player must be provided for setting custom UI.');
    // button, MenuItem, 
    var VjsButton = videojs.getComponent('Button');
    var Component = videojs.getComponent('Component');
    class PointLabel extends Component {
        constructor(player, options) {
            super(player, options);
        }

        buildCSSClass() {
            return `vjs-time-control ${super.buildCSSClass()}`;
        }
    }

    videojs.registerComponent('PointLabel', PointLabel);
    let toggle = player.controlBar.addChild('PointLabel');
    toggle.addClass('vjs-time-control');
    toggle.el().innerHTML = 'Point-TV';
    console.log(toggle.el());
    player.controlBar.el()
        .insertBefore(toggle.el(), player.controlBar.playbackRateMenuButton.el());
}