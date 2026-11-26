#!/usr/bin/env python3
"""
Generate 9 pre-rendered symphonic orchestra BGM MP3 tracks for RuneTamer Labyrinth
using pure-Python Standard MIDI File generation -> FluidSynth (FluidR3_GM.sf2) -> FFmpeg mastering.
"""

import os
import struct
import subprocess
import tempfile

SOUNDFONT = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "audio")
PPQ = 480  # Ticks per quarter note


def vlq(value: int) -> bytes:
    """Encode an integer as MIDI Variable-Length Quantity."""
    buf = [value & 0x7F]
    value >>= 7
    while value > 0:
        buf.append((value & 0x7F) | 0x80)
        value >>= 7
    return bytes(reversed(buf))


def build_track(events: list[tuple[int, bytes]]) -> bytes:
    """Sort absolute-tick MIDI events and encode a single MTrk chunk."""
    events.sort(key=lambda e: e[0])
    body = bytearray()
    last_tick = 0
    for tick, data in events:
        delta = max(0, tick - last_tick)
        body.extend(vlq(delta))
        body.extend(data)
        last_tick = tick
    # End of Track meta event
    body.extend(b"\x00\xff\x2f\x00")
    return b"MTrk" + struct.pack(">I", len(body)) + bytes(body)


def write_midi(path: str, bpm: int, tracks: list[list[tuple[int, bytes]]]) -> None:
    tempo_us = int(60_000_000 / bpm)
    tempo_track = [
        (0, b"\xff\x51\x03" + tempo_us.to_bytes(3, "big")),
        (0, b"\xff\x58\x04\x04\x02\x18\x08"),
    ]
    all_tracks = [tempo_track] + tracks
    header = b"MThd" + struct.pack(">IHHH", 6, 1, len(all_tracks), PPQ)
    with open(path, "wb") as f:
        f.write(header)
        for tr in all_tracks:
            f.write(build_track(tr))


def prog_change(ch: int, program: int, vol: int = 100, pan: int = 64, reverb: int = 70) -> list[tuple[int, bytes]]:
    return [
        (0, bytes([0xC0 | ch, program & 0x7F])),
        (0, bytes([0xB0 | ch, 7, vol & 0x7F])),
        (0, bytes([0xB0 | ch, 10, pan & 0x7F])),
        (0, bytes([0xB0 | ch, 91, reverb & 0x7F])),
    ]


def add_note(ev: list[tuple[int, bytes]], ch: int, start: int, dur: int, note: int, vel: int) -> None:
    if note <= 0 or vel <= 0 or dur <= 0:
        return
    ev.append((start, bytes([0x90 | ch, note & 0x7F, vel & 0x7F])))
    ev.append((start + dur, bytes([0x80 | ch, note & 0x7F, 0])))


def compose_track_midi(midi_path: str, spec: dict) -> float:
    bpm = spec["bpm"]
    step_ticks = PPQ // 2  # Eighth note per step
    loops = spec.get("loops", 2)
    steps = len(spec["lead"])

    # Channel assignments (GM)
    t_lead = prog_change(0, spec["lead_prog"], spec.get("lead_vol", 108), pan=60, reverb=78)
    t_counter = prog_change(1, spec["counter_prog"], spec.get("counter_vol", 84), pan=72, reverb=82)
    t_strings = prog_change(2, spec.get("strings_prog", 48), spec.get("strings_vol", 78), pan=64, reverb=92)
    t_harp = prog_change(3, spec.get("harp_prog", 46), spec.get("harp_vol", 82), pan=44, reverb=88)
    t_bass = prog_change(4, spec.get("bass_prog", 43), spec.get("bass_vol", 96), pan=56, reverb=55)
    t_timp = prog_change(5, 47, spec.get("timpani_vol", 92), pan=80, reverb=70)
    t_perc: list[tuple[int, bytes]] = [(0, bytes([0xB9, 7, spec.get("perc_vol", 88)])), (0, bytes([0xB9, 91, 65]))]

    for lp in range(loops):
        base_step = lp * steps
        # Slight dynamic swell on second pass for symphonic richness
        dyn_boost = 6 if lp == 1 else 0
        for i in range(steps):
            tick = (base_step + i) * step_ticks

            # 1. Lead melody with sustained rests
            lead_n = spec["lead"][i]
            if lead_n > 0:
                hold = 1
                while hold < 4 and i + hold < steps and spec["lead"][i + hold] == 0:
                    hold += 1
                dur = int(step_ticks * min(hold, 2.6) * 0.92)
                add_note(t_lead, 0, tick, dur, lead_n, min(124, spec.get("lead_vel", 94) + dyn_boost))

            # 2. Counter-melody
            if "counter" in spec:
                cn = spec["counter"][i]
                if cn > 0:
                    add_note(t_counter, 1, tick, int(step_ticks * 1.7), cn, min(115, spec.get("counter_vel", 74) + dyn_boost))

            # 3. Strings Ensemble Chords
            if i in spec["chords"]:
                chord = spec["chords"][i]
                cdur = int(step_ticks * spec.get("chord_steps", 4) * 0.98)
                for n in chord:
                    add_note(t_strings, 2, tick, cdur, n, min(100, spec.get("chord_vel", 66) + (4 if lp == 1 else 0)))

            # 4. Harp / Pizzicato / Celesta arpeggio
            if "harp" in spec:
                hn = spec["harp"][i]
                if hn > 0:
                    add_note(t_harp, 3, tick, int(step_ticks * 1.9), hn, spec.get("harp_vel", 74))

            # 5. Contrabass / Cello
            bn = spec["bass"][i]
            if bn > 0:
                add_note(t_bass, 4, tick, int(step_ticks * 1.6), bn, spec.get("bass_vel", 86))

            # 6. Timpani
            if "timpani" in spec:
                tn = spec["timpani"][i]
                if tn > 0:
                    add_note(t_timp, 5, tick, int(step_ticks * 1.2), tn, min(120, spec.get("timpani_vel", 92) + dyn_boost))

            # 7. Percussion (Snare, Cymbal, Bass Drum)
            if "snare" in spec and spec["snare"][i] > 0:
                s_vel = int(min(115, spec["snare"][i] * 86 + dyn_boost))
                add_note(t_perc, 9, tick, step_ticks // 2, 38, s_vel)
            if "cymbal" in spec and spec["cymbal"][i] > 0:
                add_note(t_perc, 9, tick, step_ticks * 2, 49, 76 + dyn_boost)
            if "kick" in spec and spec["kick"][i] > 0:
                add_note(t_perc, 9, tick, step_ticks // 2, 35, 84 + dyn_boost)

    write_midi(midi_path, bpm, [t_lead, t_counter, t_strings, t_harp, t_bass, t_timp, t_perc])
    total_beats = (loops * steps) / 2.0
    return total_beats * (60.0 / bpm)


TRACKS: dict[str, dict] = {
    # 1. 始まりの村：フルート＋弦楽＋ハープの牧歌的オーケストラ
    "village": {
        "bpm": 112,
        "loops": 2,
        "lead_prog": 73,  # Flute
        "counter_prog": 40,  # Violin
        "strings_prog": 48,  # String Ensemble 1
        "harp_prog": 46,  # Orchestral Harp
        "bass_prog": 42,  # Cello
        "lead": [
            72, 0, 76, 79, 76, 0, 74, 72,
            69, 0, 72, 76, 74, 0, 0, 0,
            77, 0, 76, 74, 72, 0, 74, 76,
            74, 0, 71, 67, 72, 0, 0, 0,
        ],
        "counter": [
            0, 0, 0, 0, 64, 0, 67, 0,
            69, 0, 67, 0, 65, 0, 67, 0,
            69, 0, 72, 0, 67, 0, 64, 0,
            65, 0, 62, 0, 64, 0, 0, 0,
        ],
        "chords": {
            0: [60, 64, 67], 4: [59, 64, 67], 8: [57, 60, 64], 12: [55, 59, 62],
            16: [53, 57, 60], 20: [52, 55, 60], 24: [50, 53, 57], 28: [55, 59, 62, 65],
        },
        "harp": [
            60, 64, 67, 72, 59, 64, 67, 71,
            57, 60, 64, 69, 55, 59, 62, 67,
            53, 57, 60, 65, 52, 55, 60, 64,
            50, 53, 57, 62, 55, 59, 62, 67,
        ],
        "bass": [
            48, 0, 0, 0, 47, 0, 0, 0,
            45, 0, 0, 0, 43, 0, 0, 0,
            41, 0, 0, 0, 40, 0, 0, 0,
            38, 0, 0, 0, 43, 0, 43, 0,
        ],
    },

    # 2. 始まりの森：オーボエ＋ピチカート＋木管の神秘的な森の交響曲
    "forest": {
        "bpm": 116,
        "loops": 2,
        "lead_prog": 68,  # Oboe
        "counter_prog": 73,  # Flute
        "strings_prog": 48,
        "harp_prog": 45,  # Pizzicato Strings
        "bass_prog": 43,  # Contrabass
        "lead": [
            69, 0, 72, 74, 76, 0, 74, 72,
            71, 0, 69, 67, 69, 0, 0, 0,
            72, 0, 74, 76, 79, 0, 76, 74,
            72, 0, 71, 69, 69, 0, 0, 0,
        ],
        "counter": [
            0, 0, 64, 0, 69, 0, 67, 0,
            64, 0, 62, 0, 64, 0, 0, 0,
            67, 0, 69, 0, 72, 0, 71, 0,
            69, 0, 67, 0, 64, 0, 0, 0,
        ],
        "chords": {
            0: [57, 60, 64], 4: [55, 59, 62], 8: [53, 57, 60], 12: [52, 55, 59],
            16: [60, 64, 67], 20: [55, 59, 62], 24: [53, 57, 60], 28: [52, 56, 59],
        },
        "harp": [
            57, 60, 64, 60, 55, 59, 62, 59,
            53, 57, 60, 57, 52, 55, 59, 55,
            60, 64, 67, 64, 55, 59, 62, 59,
            53, 57, 60, 57, 52, 56, 59, 64,
        ],
        "bass": [
            45, 0, 0, 45, 43, 0, 0, 43,
            41, 0, 0, 41, 40, 0, 43, 0,
            48, 0, 0, 48, 43, 0, 0, 43,
            41, 0, 0, 41, 40, 0, 45, 0,
        ],
        "timpani": [
            45, 0, 0, 0, 0, 0, 0, 0,
            41, 0, 0, 0, 40, 0, 0, 0,
            48, 0, 0, 0, 0, 0, 0, 0,
            41, 0, 0, 0, 40, 0, 0, 0,
        ],
    },

    # 3. 古代遺跡：バイオリン＋ホルン＋ハープの荘厳な遺跡
    "ruins": {
        "bpm": 108,
        "loops": 2,
        "lead_prog": 40,  # Violin
        "counter_prog": 60,  # French Horn
        "strings_prog": 49,  # String Ensemble 2
        "harp_prog": 46,
        "bass_prog": 43,
        "lead": [
            64, 0, 67, 71, 69, 0, 67, 64,
            62, 0, 66, 69, 67, 0, 0, 0,
            71, 0, 74, 76, 74, 0, 71, 69,
            67, 0, 66, 64, 64, 0, 0, 0,
        ],
        "counter": [
            52, 0, 0, 0, 57, 0, 55, 0,
            50, 0, 0, 0, 55, 0, 54, 0,
            59, 0, 0, 0, 62, 0, 59, 0,
            55, 0, 54, 0, 52, 0, 0, 0,
        ],
        "chords": {
            0: [52, 55, 59], 4: [57, 60, 64], 8: [50, 54, 57], 12: [55, 59, 62],
            16: [59, 62, 66], 20: [52, 55, 59], 24: [57, 60, 64], 28: [54, 57, 59, 63],
        },
        "harp": [
            52, 59, 64, 67, 57, 64, 69, 72,
            50, 57, 62, 66, 55, 62, 67, 71,
            59, 66, 71, 74, 52, 59, 64, 67,
            57, 60, 64, 69, 59, 63, 66, 71,
        ],
        "bass": [
            40, 0, 0, 40, 45, 0, 0, 45,
            38, 0, 0, 38, 43, 0, 0, 43,
            47, 0, 0, 47, 40, 0, 0, 40,
            45, 0, 0, 45, 47, 0, 47, 0,
        ],
        "timpani": [
            40, 0, 0, 0, 45, 0, 0, 0,
            38, 0, 0, 0, 43, 0, 0, 0,
            47, 0, 0, 0, 40, 0, 0, 0,
            45, 0, 0, 0, 47, 0, 40, 0,
        ],
    },

    # 4. 溶岩洞窟：重厚ホルン＋低音弦＋ティンパニの灼熱行進
    "volcano": {
        "bpm": 124,
        "loops": 2,
        "lead_prog": 60,  # French Horn
        "counter_prog": 56,  # Trumpet
        "strings_prog": 48,
        "harp_prog": 45,
        "bass_prog": 43,
        "lead": [
            62, 0, 63, 65, 62, 0, 60, 58,
            57, 0, 62, 65, 64, 0, 0, 0,
            65, 0, 67, 69, 70, 0, 69, 67,
            65, 0, 64, 62, 62, 0, 0, 0,
        ],
        "counter": [
            0, 0, 0, 0, 50, 0, 53, 0,
            57, 0, 55, 0, 52, 0, 0, 0,
            53, 0, 55, 0, 58, 0, 57, 0,
            53, 0, 52, 0, 50, 0, 0, 0,
        ],
        "chords": {
            0: [50, 53, 57], 4: [46, 50, 53], 8: [45, 49, 52], 12: [45, 49, 52, 55],
            16: [46, 50, 53], 20: [48, 52, 55], 24: [50, 53, 57], 28: [45, 49, 52],
        },
        "harp": [
            50, 0, 57, 50, 46, 0, 53, 46,
            45, 0, 52, 45, 45, 52, 55, 52,
            46, 0, 53, 46, 48, 0, 55, 48,
            50, 0, 57, 50, 45, 52, 57, 52,
        ],
        "bass": [
            38, 38, 0, 38, 34, 34, 0, 34,
            33, 33, 0, 33, 33, 0, 40, 0,
            34, 34, 0, 34, 36, 36, 0, 36,
            38, 38, 0, 38, 33, 0, 38, 0,
        ],
        "timpani": [
            38, 0, 38, 0, 34, 0, 34, 0,
            33, 0, 0, 33, 33, 0, 40, 33,
            34, 0, 34, 0, 36, 0, 36, 0,
            38, 0, 38, 0, 33, 33, 38, 0,
        ],
        "snare": [
            0, 0, 0.5, 0, 0, 0, 0.6, 0.4,
            0, 0, 0.5, 0, 0, 0.5, 0.8, 0.6,
            0, 0, 0.5, 0, 0, 0, 0.6, 0.4,
            0, 0.5, 0.6, 0.5, 0.9, 0, 0.7, 0,
        ],
    },

    # 5. 星屑の深淵：チェレスタ＋クワイア＋幽玄ストリングス
    "abyss": {
        "bpm": 100,
        "loops": 2,
        "lead_prog": 8,  # Celesta
        "counter_prog": 52,  # Choir Aahs
        "strings_prog": 49,  # Slow Strings
        "harp_prog": 46,
        "bass_prog": 42,
        "lead": [
            72, 0, 75, 79, 78, 0, 75, 72,
            70, 0, 74, 77, 75, 0, 0, 0,
            79, 0, 82, 84, 82, 0, 79, 77,
            75, 0, 74, 72, 72, 0, 0, 0,
        ],
        "counter": [
            60, 0, 0, 0, 63, 0, 0, 0,
            58, 0, 0, 0, 62, 0, 0, 0,
            63, 0, 0, 0, 65, 0, 0, 0,
            62, 0, 0, 0, 60, 0, 0, 0,
        ],
        "chords": {
            0: [48, 51, 55, 60], 4: [51, 55, 58, 63], 8: [46, 50, 53, 58], 12: [50, 53, 57, 62],
            16: [51, 55, 58, 63], 20: [53, 56, 60, 65], 24: [55, 58, 62, 67], 28: [55, 59, 62, 65],
        },
        "harp": [
            60, 63, 67, 72, 63, 67, 70, 75,
            58, 62, 65, 70, 62, 65, 69, 74,
            63, 67, 70, 75, 65, 68, 72, 77,
            67, 70, 74, 79, 67, 71, 74, 79,
        ],
        "bass": [
            36, 0, 0, 0, 39, 0, 0, 0,
            34, 0, 0, 0, 38, 0, 0, 0,
            39, 0, 0, 0, 41, 0, 0, 0,
            43, 0, 0, 0, 43, 0, 36, 0,
        ],
    },

    # 6. 氷結回廊：フルート＋チェレスタ＋冷徹弦楽
    "glacier": {
        "bpm": 106,
        "loops": 2,
        "lead_prog": 73,  # Flute
        "counter_prog": 8,  # Celesta
        "strings_prog": 48,
        "harp_prog": 46,
        "bass_prog": 42,
        "lead": [
            74, 0, 77, 81, 79, 0, 77, 74,
            72, 0, 76, 79, 77, 0, 0, 0,
            81, 0, 82, 84, 81, 0, 79, 77,
            76, 0, 74, 73, 74, 0, 0, 0,
        ],
        "counter": [
            86, 0, 81, 0, 84, 0, 79, 0,
            84, 0, 79, 0, 81, 0, 77, 0,
            86, 0, 82, 0, 81, 0, 79, 0,
            76, 0, 73, 0, 74, 0, 0, 0,
        ],
        "chords": {
            0: [50, 53, 57], 4: [48, 52, 55], 8: [46, 50, 53], 12: [45, 48, 52],
            16: [46, 50, 53], 20: [50, 53, 57], 24: [45, 49, 52], 28: [50, 53, 57],
        },
        "harp": [
            62, 65, 69, 74, 60, 64, 67, 72,
            58, 62, 65, 70, 57, 60, 64, 69,
            58, 62, 65, 70, 62, 65, 69, 74,
            57, 61, 64, 69, 62, 65, 69, 74,
        ],
        "bass": [
            38, 0, 0, 0, 36, 0, 0, 0,
            34, 0, 0, 0, 33, 0, 0, 0,
            34, 0, 0, 0, 38, 0, 0, 0,
            33, 0, 0, 0, 38, 0, 38, 0,
        ],
    },

    # 7. 虚無の聖域：パイプオルガン＋クワイア＋大聖堂オーケストラ
    "sanctum": {
        "bpm": 114,
        "loops": 2,
        "lead_prog": 19,  # Church Organ
        "counter_prog": 52,  # Choir Aahs
        "strings_prog": 48,
        "harp_prog": 46,
        "bass_prog": 43,
        "lead": [
            67, 0, 70, 74, 72, 0, 70, 69,
            67, 0, 65, 63, 62, 0, 0, 0,
            70, 0, 74, 77, 75, 0, 74, 72,
            70, 0, 69, 66, 67, 0, 0, 0,
        ],
        "counter": [
            55, 0, 0, 0, 58, 0, 57, 0,
            55, 0, 53, 0, 50, 0, 0, 0,
            58, 0, 0, 0, 63, 0, 62, 0,
            58, 0, 57, 0, 55, 0, 0, 0,
        ],
        "chords": {
            0: [55, 58, 62], 4: [51, 55, 58], 8: [53, 57, 60], 12: [50, 54, 57],
            16: [51, 55, 58], 20: [48, 51, 55], 24: [50, 54, 57, 60], 28: [55, 58, 62],
        },
        "harp": [
            55, 62, 67, 70, 51, 58, 63, 67,
            53, 60, 65, 69, 50, 57, 62, 66,
            51, 58, 63, 67, 48, 55, 60, 63,
            50, 57, 62, 66, 55, 62, 67, 74,
        ],
        "bass": [
            43, 0, 43, 0, 39, 0, 39, 0,
            41, 0, 41, 0, 38, 0, 38, 0,
            39, 0, 39, 0, 36, 0, 36, 0,
            38, 0, 38, 0, 43, 0, 43, 0,
        ],
        "timpani": [
            43, 0, 0, 0, 39, 0, 0, 0,
            41, 0, 0, 0, 38, 0, 38, 0,
            39, 0, 0, 0, 36, 0, 0, 0,
            38, 0, 38, 0, 43, 0, 43, 0,
        ],
    },

    # 8. 通常戦闘：勇壮バイオリン＋ホルン＋スネア＆ティンパニ交響曲
    "battle": {
        "bpm": 152,
        "loops": 2,
        "lead_prog": 40,  # Violin
        "counter_prog": 60,  # French Horn
        "strings_prog": 48,
        "harp_prog": 45,  # Pizzicato
        "bass_prog": 43,
        "lead": [
            62, 65, 69, 0, 74, 72, 70, 69,
            67, 69, 70, 0, 69, 67, 65, 64,
            62, 65, 69, 72, 74, 0, 76, 77,
            76, 74, 72, 69, 70, 69, 67, 69,
        ],
        "counter": [
            50, 0, 57, 0, 62, 0, 0, 0,
            58, 0, 55, 0, 57, 0, 52, 0,
            50, 0, 57, 0, 65, 0, 64, 0,
            60, 0, 57, 0, 58, 0, 57, 0,
        ],
        "chords": {
            0: [50, 53, 57], 4: [50, 53, 57], 8: [46, 50, 53], 12: [45, 49, 52],
            16: [50, 53, 57], 20: [53, 57, 60], 24: [48, 52, 55], 28: [45, 49, 52, 55],
        },
        "harp": [
            50, 57, 62, 57, 50, 57, 62, 57,
            46, 53, 58, 53, 45, 52, 57, 52,
            50, 57, 62, 57, 53, 60, 65, 60,
            48, 55, 60, 55, 45, 52, 57, 61,
        ],
        "bass": [
            38, 0, 45, 38, 38, 0, 45, 38,
            34, 0, 41, 34, 33, 0, 40, 33,
            38, 0, 45, 38, 41, 0, 48, 41,
            36, 0, 43, 36, 33, 40, 45, 40,
        ],
        "timpani": [
            38, 0, 0, 0, 38, 0, 45, 0,
            34, 0, 0, 0, 33, 0, 40, 33,
            38, 0, 0, 0, 41, 0, 0, 0,
            36, 0, 0, 0, 33, 0, 33, 45,
        ],
        "snare": [
            0, 0, 0.6, 0, 0, 0.5, 0.9, 0.5,
            0, 0, 0.6, 0, 0, 0.5, 0.9, 0.7,
            0, 0, 0.6, 0, 0, 0.5, 0.9, 0.5,
            0, 0.5, 0.7, 0.5, 1.0, 0, 0.8, 0.8,
        ],
        "cymbal": [
            1, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            1, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
        ],
        "kick": [
            1, 0, 0, 0, 1, 0, 0, 0,
            1, 0, 0, 0, 1, 0, 1, 0,
            1, 0, 0, 0, 1, 0, 0, 0,
            1, 0, 0, 0, 1, 0, 1, 0,
        ],
    },

    # 9. ボス戦：トランペット＋疾走バイオリン＋クワイア＋雷鳴ティンパニ大交響曲
    "boss": {
        "bpm": 164,
        "loops": 2,
        "lead_prog": 56,  # Trumpet
        "counter_prog": 40,  # Violin
        "strings_prog": 52,  # Choir Aahs
        "harp_prog": 48,  # String Ensemble ostinato
        "bass_prog": 43,
        "lead": [
            62, 0, 62, 65, 69, 0, 68, 65,
            62, 65, 69, 70, 69, 0, 67, 64,
            62, 0, 65, 69, 74, 0, 73, 70,
            69, 67, 65, 64, 62, 0, 61, 0,
        ],
        "counter": [
            74, 72, 70, 69, 74, 76, 77, 76,
            74, 70, 69, 67, 69, 73, 76, 73,
            74, 72, 70, 69, 81, 79, 77, 76,
            74, 70, 69, 67, 69, 73, 76, 79,
        ],
        "chords": {
            0: [50, 53, 57], 4: [46, 50, 53, 57], 8: [43, 46, 50, 53], 12: [45, 49, 52, 58],
            16: [50, 53, 57], 20: [51, 55, 58], 24: [43, 46, 50], 28: [45, 49, 52, 55],
        },
        "harp": [
            50, 57, 62, 57, 46, 53, 58, 53,
            43, 50, 55, 50, 45, 52, 57, 52,
            50, 57, 62, 57, 51, 58, 63, 58,
            43, 50, 55, 50, 45, 52, 57, 61,
        ],
        "bass": [
            38, 38, 45, 38, 34, 34, 41, 34,
            43, 43, 38, 43, 33, 33, 40, 33,
            38, 38, 45, 38, 39, 39, 46, 39,
            43, 43, 38, 34, 33, 40, 45, 33,
        ],
        "timpani": [
            38, 0, 38, 0, 34, 0, 34, 0,
            43, 0, 0, 38, 33, 0, 33, 33,
            38, 0, 38, 0, 39, 0, 39, 0,
            43, 0, 38, 0, 33, 33, 45, 33,
        ],
        "snare": [
            1.0, 0, 0.6, 0.5, 1.0, 0, 0.7, 0.6,
            1.0, 0, 0.6, 0.5, 1.0, 0.6, 0.8, 0.9,
            1.0, 0, 0.6, 0.5, 1.0, 0, 0.7, 0.6,
            1.0, 0.6, 0.7, 0.8, 1.0, 0.8, 0.9, 1.0,
        ],
        "cymbal": [
            1, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 1, 0, 0, 0,
            1, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 1, 0, 0, 0,
        ],
        "kick": [
            1, 0, 1, 0, 1, 0, 1, 0,
            1, 0, 1, 0, 1, 1, 1, 1,
            1, 0, 1, 0, 1, 0, 1, 0,
            1, 0, 1, 0, 1, 1, 1, 1,
        ],
    },
}


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        total_bytes = 0
        for name, spec in TRACKS.items():
            midi_path = os.path.join(tmp, f"{name}.mid")
            wav_path = os.path.join(tmp, f"{name}.wav")
            mp3_path = os.path.join(OUT_DIR, f"{name}.mp3")

            exact_sec = compose_track_midi(midi_path, spec)
            subprocess.run(
                [
                    "fluidsynth",
                    "-ni",
                    "-F",
                    wav_path,
                    "-r",
                    "44100",
                    "-g",
                    "0.85",
                    "-R",
                    "1",
                    "-C",
                    "1",
                    SOUNDFONT,
                    midi_path,
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            fade_out_start = max(0.2, exact_sec - 0.04)
            af = f"atrim=0:{exact_sec:.4f},afade=t=in:st=0:d=0.025,afade=t=out:st={fade_out_start:.4f}:d=0.04,loudnorm=I=-16:TP=-1.5:LRA=11"
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    wav_path,
                    "-af",
                    af,
                    "-c:a",
                    "libmp3lame",
                    "-b:a",
                    "96k",
                    "-ac",
                    "2",
                    mp3_path,
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            sz = os.path.getsize(mp3_path)
            total_bytes += sz
            print(f"Generated {name}.mp3 ({exact_sec:.1f}s, {sz / 1024:.1f} KB)")
        print(f"Total audio bundle size: {total_bytes / (1024 * 1024):.2f} MB")


if __name__ == "__main__":
    main()
