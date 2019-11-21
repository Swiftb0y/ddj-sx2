import { MidiControl } from "@controls/midiControl";
import { DeckMidiControl } from "@controls/deckMidiControl";
import { DeckFineMidiControl } from "@controls/deckFineMidiControl";
import { DeckLedButton } from "@controls/deckLedButton";
import { LedButton } from "@controls/ledButton";
import { DeckButton } from "@controls/deckButton";
import { log, toggleControl, activate, makeLedConnection } from "@/utils";
import { FineMidiControl } from "@/controls/fineMidiControl";
import { Button } from "@/controls/button";

export class Deck {

    private static potiBase = 0xB0;
    private static jogWheelCenter = 0x40;

    public readonly controls: MidiControl[];
    private readonly group: string;

    constructor(readonly channel: number) {
        this.group = `[Channel${channel}]`;

        this.controls = [
            new DeckButton(channel, 0x0B, {
                onPressed: () => {
                    this.toggleControl("play");
                }
            }),
            new DeckLedButton(channel, 0x58, {
                onPressed: () => {
                    this.activate("beatsync");
                }
            }),
            new DeckButton(channel, 0x54, {
                onPressed: () => {
                    this.toggleControl("pfl");
                }
            }),
            new DeckButton(channel, 0x16, {
                onPressed: () => {
                    this.setValue("orientation", 0);
                }
            }),
            new DeckButton(channel, 0x1D, {
                onPressed: () => {
                    this.setValue("orientation", 1);
                }
            }),
            new DeckButton(channel, 0x18, {
                onPressed: () => {
                    this.setValue("orientation", 2);
                }
            }),

            // Loops
            new DeckButton(channel, 0x14, {
                onPressed: () => {
                    this.activate(`beatloop_${this.getValue("beatloop_size")}_toggle`);
                }
            }),
            new DeckLedButton(channel, 0x12, {
                onPressed: () => {
                    this.activate("loop_halve");
                }
            }),
            new DeckLedButton(channel, 0x13, {
                onPressed: () => {
                    this.activate("loop_double");
                }
            }),

            // Jog wheel
            new DeckButton(channel, 0x36, {
                onPressed: () => {
                    const alpha = 1.0 / 8;
                    const beta = alpha / 32;
                    engine.scratchEnable(channel, 1024, 33 + 1 / 3, alpha, beta, true);
                },
                onReleased: () => {
                    engine.scratchDisable(channel, true);
                }
            }),
            new DeckMidiControl(channel, Deck.potiBase, 0x22, {
                onNewValue: value => {
                    engine.scratchTick(channel, value - Deck.jogWheelCenter);
                }
            }),
            new DeckMidiControl(channel, Deck.potiBase, 0x21, {
                onNewValue: value => {
                    if (engine.isScratching(channel)) {
                        engine.scratchTick(channel, value - Deck.jogWheelCenter);
                    } else {
                        this.setParameter("jog", (value - Deck.jogWheelCenter) / 10.0);
                    }
                }
            }),

            // EQ
            new DeckFineMidiControl(channel, Deck.potiBase, 0x0F, 0x2F, {
                onValueChanged: value => {
                    engine.setParameter(`[EqualizerRack1_${this.group}_Effect1]`, "parameter1", value);
                }
            }),
            new DeckFineMidiControl(channel, Deck.potiBase, 0x0B, 0x2B, {
                onValueChanged: value => {
                    engine.setParameter(`[EqualizerRack1_${this.group}_Effect1]`, "parameter2", value);
                }
            }),
            new DeckFineMidiControl(channel, Deck.potiBase, 0x07, 0x27, {
                onValueChanged: value => {
                    engine.setParameter(`[EqualizerRack1_${this.group}_Effect1]`, "parameter3", value);
                }
            }),

            // Quick Effect / Filter
            new FineMidiControl(0xB6, 0x16 + channel, 0x36 + channel, {
                onValueChanged: value => {
                    engine.setParameter(`[QuickEffectRack1_${this.group}]`, "super1", value);
                }
            }),
            new Button(0x96, 0x73 + channel, {
                onValueChanged: value => {
                    engine.setValue(`[QuickEffectRack1_${this.group}]`, "enabled", value > 0);
                }
            }),

            new DeckFineMidiControl(Deck.potiBase, channel, 0x04, 0x24, {
                onValueChanged: value => {
                    this.setParameter("pregain", value);
                }
            }),
            new DeckFineMidiControl(Deck.potiBase, channel, 0x13, 0x33, {
                onValueChanged: value => {
                    this.setParameter("volume", value);
                }
            }),
            new DeckFineMidiControl(Deck.potiBase, channel, 0x00, 0x20, {
                onValueChanged: value => {
                    this.setParameter("rate", 1 - value);
                }
            }),

            new LedButton(0x96, 0x45 + channel, {
                onPressed: () => {
                    this.activate("LoadSelectedTrack");
                }
            }),
            new DeckButton(channel, 0x1A, {
                onPressed: () => {
                    this.toggleControl("quantize");
                }
            })
        ];


        this.makeLedConnection("play", 0x0B);
        this.makeLedConnection("pfl", 0x54);
        this.makeLedConnection("quantize", 0x1A);
        this.makeLedConnection("loop_enabled", 0x14);
    }

    private setParameter(key: string, value: number) {
        engine.setParameter(this.group, key, value);
    }

    private getValue(key: string): number | boolean {
        return engine.getValue(this.group, key);
    }

    private setValue(key: string, value: number | boolean) {
        engine.setValue(this.group, key, value);
    }

    private activate(key: string) {
        activate(this.group, key);
    }

    private toggleControl(key: string) {
        toggleControl(this.group, key);
    }

    private makeLedConnection(key: string, midiLedNo: number) {
        makeLedConnection(this.group, key, DeckButton.BUTTON_BASE + this.channel - 1, midiLedNo);
    }
}
