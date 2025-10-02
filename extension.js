import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const INTERVAL_SET_TEXT = 60 / 2;

const Uptime = GObject.registerClass(
    class Uptime extends PanelMenu.Button {
        _init() {
            super._init(0.5, "uptime", false);

            this._time_seconds = 0.0;
            this._label_time = new St.Label({
                text: Uptime._create_text(this._time_seconds),
                y_align: Clutter.ActorAlign.CENTER,
            });
            this._item_time_detailed = new PopupMenu.PopupMenuItem(Uptime._create_text_detailed(this._time_seconds));

            this.add_child(this._label_time);
            this.menu.addMenuItem(this._item_time_detailed);

            // This should prevent some flicker
            this._label_time.set_text(Uptime._create_text(this._time_seconds));
            this._item_time_detailed.label_actor.set_text(Uptime._create_text_detailed(this._time_seconds));

            // Update now and every so often
            this.update_time().catch((e) => {
                console.error(`UPTIME: Unexpected error: ${e}`);
            });
            this._timer_source_id = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, INTERVAL_SET_TEXT, () => {
                this.update_time().catch((e) => {
                    console.error(`UPTIME: Unexpected error: ${e}`);
                });

                return GLib.SOURCE_CONTINUE;
            });
        }

        destroy() {
            GLib.Source.remove(this._timer_source_id);
            this._timer_source_id = null;

            super.destroy();
        }

        async update_time() {
            this._time_seconds = await Uptime._retrieve_time();
            this._label_time.set_text(Uptime._create_text(this._time_seconds));
            this._item_time_detailed.label_actor.set_text(Uptime._create_text_detailed(this._time_seconds));
        }

        static async _retrieve_time() {
            const file = Gio.File.new_for_path("/proc/uptime");

            try {
                const [contents, etag] = await file.load_contents_async(null);

                const decoder = new TextDecoder("utf-8");
                const contentsString = decoder.decode(contents);

                return contentsString.split(" ")[0];
            } catch (e) {
                console.error(`UPTIME: Could not load file contents: ${e}`);
                return 0.0;
            }
        }

        static _create_text(time_seconds) {
            const minutes = Math.floor(time_seconds / 60.0);
            const hours = Math.floor(time_seconds / (60.0 * 60.0));
            const days = Math.floor(time_seconds / (60.0 * 60.0 * 24.0));

            if (days > 0) {
                return days === 1 ? `${days} ${_("day")}` : `${days} ${_("days")}`;
            } else if (hours > 0) {
                return hours === 1 ? `${hours} ${_("hour")}` : `${hours} ${_("hours")}`;
            } else {
                return minutes === 1 ? `${minutes} ${_("minute")}` : `${minutes} ${_("minutes")}`;
            }
        }

        static _create_text_detailed(time_seconds) {
            const [days_quot, days_rem] = Uptime._divmod(time_seconds, 60.0 * 60.0 * 24.0);
            const [hours_quot, hours_rem] = Uptime._divmod(days_rem, 60.0 * 60.0);
            const [minutes_quot, minutes_rem] = Uptime._divmod(hours_rem, 60.0);

            const days = days_quot === 1 ? `${days_quot} ${_("day")}` : `${days_quot} ${_("days")}`;
            const hours = hours_quot === 1 ? `${hours_quot} ${_("hour")}` : `${hours_quot} ${_("hours")}`;
            const minutes = minutes_quot === 1 ? `${minutes_quot} ${_("minute")}` : `${minutes_quot} ${_("minutes")}`;

            return `${days} ${hours} ${minutes}`;
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
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
