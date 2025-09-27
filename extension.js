import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';

const ByteArray = imports.byteArray;

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const Uptime = GObject.registerClass(
    class Uptime extends PanelMenu.Button {
        _init() {
            super._init(0.0, "Uptime", true);

            this._time_seconds = Uptime._retrieve_time();
            console.warn("Time seconds: " + this._time_seconds);

            const label = new St.Label({
                text: Uptime._create_text(this._time_seconds),
                y_align: Clutter.ActorAlign.CENTER,
            });

            this.add_child(label);
        }

        static _retrieve_time() {
            const file = Gio.File.new_for_path("/proc/uptime");

            try {
                const [ok, contents, etag] = file.load_contents(null);

                if (!ok) {
                    console.error("Could not read `/proc/uptime`");
                    return 0.0;
                }

                const stringContents = ByteArray.toString(contents);

                return stringContents.split(" ")[0];
            } catch (error) {
                console.error("Could not open `/proc/uptime` for reading");
                return 0.0;
            }
        }

        static _create_text(time_seconds) {
            const minutes = Math.floor(time_seconds / 60.0);
            const hours = Math.floor(time_seconds / (60.0 * 60.0));
            const days = Math.floor(time_seconds / (60.0 * 60.0 * 24.0));

            if (days > 0) {
                return `${days} ${_("days")}`;
            } else if (hours > 0) {
                return `${hours} ${_("hours")}`;
            } else {
                return `${minutes} ${_("minutes")}`;
            }
        }
    }
);

export default class UptimeExtension extends Extension {
    enable() {
        this._indicator = new Uptime();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
