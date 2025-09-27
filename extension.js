import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';

const ByteArray = imports.byteArray;

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const INTERVAL_SET_TEXT = 1000 * 60;

const Uptime = GObject.registerClass(
    class Uptime extends PanelMenu.Button {
        _init() {
            super._init(0.0, "Uptime", false);

            this._timer_source = null;
            this._time_seconds = Uptime._retrieve_time();
            this._label = new St.Label({
                text: Uptime._create_text(this._time_seconds),
                y_align: Clutter.ActorAlign.CENTER,
            });
            this._item = new PopupMenu.PopupMenuItem(Uptime._create_text_detailed(this._time_seconds));

            this.add_child(this._label);
            this.menu.addMenuItem(this._item);
        }

        start_timer() {
            this._timer_source = setInterval(Uptime._set_text_timer, INTERVAL_SET_TEXT, this);
        }

        stop_timer() {
            clearInterval(this._timer_source);
            this._timer_source = null;
            console.debug("UPTIME: Stopped timer");
        }

        static _set_text_timer(instance) {
            instance._time_seconds = Uptime._retrieve_time();
            instance._label.set_text(Uptime._create_text(instance._time_seconds));
            instance._item.label_actor.set_text(Uptime._create_text_detailed(instance._time_seconds));
            console.debug(`UPTIME: Time seconds: ${instance._time_seconds}`);
        }

        static _retrieve_time() {
            const file = Gio.File.new_for_path("/proc/uptime");

            try {
                const [ok, contents, etag] = file.load_contents(null);  // TODO

                if (!ok) {
                    console.error("UPTIME: Could not read `/proc/uptime`");
                    return 0.0;
                }

                const stringContents = ByteArray.toString(contents);

                return stringContents.split(" ")[0];
            } catch (e) {
                console.error("UPTIME: Could not open `/proc/uptime` for reading");
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

        static _create_text_detailed(time_seconds) {
            const [days_quot, days_rem] = Uptime._divmod(time_seconds, 60.0 * 60.0 * 24.0);
            const [hours_quot, hours_rem] = Uptime._divmod(days_rem, 60.0 * 60.0);
            const [minutes_quot, minutes_rem] = Uptime._divmod(hours_rem, 60.0);

            return `${days_quot} ${_("days")} ${hours_quot} ${_("hours")} ${minutes_quot} ${_("minutes")}`;
        }

        static _divmod(y, x) {
            x = Math.trunc(x);
            y = Math.trunc(y);

            const quotient = Math.floor(y / x);
            const remainder = y % x;

            return [quotient, remainder];
        }
    }
);

export default class UptimeExtension extends Extension {
    enable() {
        this._indicator = new Uptime();
        this._indicator.start_timer();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.stop_timer();
        this._indicator.destroy();
        this._indicator = null;
    }
}

// TODO translations, alignment
