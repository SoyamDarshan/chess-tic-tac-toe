import json, wave
import numpy as np

SR = 44100
TL = json.load(open('events.json'))
TOTAL = TL['total']
N = int(TOTAL * SR)
BPM = 100.0
BEAT = 60.0 / BPM            # 0.6 s
BAR = BEAT * 4               # 2.4 s
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def note(m):  # midi -> Hz
    return 440.0 * 2 ** ((m - 69) / 12)

def add(buf_l, buf_r, t0, sig, gl=1.0, gr=1.0):
    i0 = int(t0 * SR)
    if i0 >= N: return
    n = min(len(sig), N - i0)
    buf_l[i0:i0 + n] += sig[:n] * gl
    buf_r[i0:i0 + n] += sig[:n] * gr

def env_exp(n, decay, attack=0.004):
    t = np.arange(n) / SR
    e = np.exp(-t / decay)
    a = np.minimum(1, t / attack)
    return e * a

def lowpass(x, cutoff):
    # one-pole low-pass; cutoff may be an array (Hz) of len(x)
    c = np.broadcast_to(cutoff, x.shape).astype(float)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s); y[i] = s
    return y

# ---- music: Am F C G, 100 bpm ----
chords = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]  # root, triad (midi)
music_start = 2.8
def pad(t0, dur, midis, gain):
    n = int(dur * SR); t = np.arange(n) / SR
    sig = np.zeros(n)
    for m in midis:
        for det in (-0.12, 0.0, 0.12):
            f = note(m) * 2 ** (det / 12)
            sig += np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    sig /= (len(midis) * 3)
    e = np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.6)
    return sig * e * gain

def pluck(freq, dur, gain):
    n = int(dur * SR); t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * 2 * freq * t) + 0.2 * np.sin(2 * np.pi * 3 * freq * t)
    return sig * env_exp(n, dur / 3.2, 0.006) * gain

bars = int(np.ceil((TOTAL - music_start) / BAR))
for b in range(bars):
    t0 = music_start + b * BAR
    root, tri = chords[b % 4]
    p = pad(t0, BAR + 0.5, [m for m in tri], 0.11)
    add(L, R, t0, p, 1.0, 1.0)
    # bass: beats 1, 2.5(and), 3, 4
    for beat, off in ((0, 0), (1.5, 0), (2, 0), (3, 7)):
        add(L, R, t0 + beat * BEAT, pluck(note(root - 12 + off), BEAT * 1.1, 0.20), 1, 1)
    # arp: 8th notes up the triad
    for k in range(8):
        m = tri[k % 3] + (12 if k % 6 < 3 else 24)
        pan = 0.6 + 0.4 * (k % 2)
        add(L, R, t0 + k * BEAT / 2, pluck(note(m), 0.45, 0.07), pan, 1.2 - pan)

# ---- drums from the first highlight on ----
drum_from, drum_to = 6.9, 18.6
def kick():
    n = int(0.3 * SR); t = np.arange(n) / SR
    f = 45 + 90 * np.exp(-t / 0.04)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env_exp(n, 0.12, 0.002) * 0.55
def hat():
    n = int(0.06 * SR)
    x = rng.standard_normal(n); x = x - np.concatenate(([0], x[:-1]))  # crude high-pass
    return x * env_exp(n, 0.018, 0.001) * 0.06
tb = drum_from
while tb < drum_to:
    add(L, R, tb, kick())
    add(L, R, tb + BEAT / 2, hat(), 0.8, 1.1)
    tb += BEAT

# ---- sound effects ----
def whoosh(dur=0.45, gain=0.25, up=True):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    cut = np.linspace(300, 5000, n) if up else np.linspace(5000, 300, n)
    y = lowpass(x, cut)
    t = np.arange(n) / SR
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return y * e * gain
def thud():
    n = int(0.22 * SR); t = np.arange(n) / SR
    f = 110 + 80 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.07, 0.001) * 0.5
    click = lowpass(rng.standard_normal(n), 3000) * env_exp(n, 0.008, 0.0005) * 0.25
    return body + click
def bell(freq, dur=1.4, gain=0.18):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.45 * np.sin(2 * np.pi * freq * 2.76 * t) + 0.2 * np.sin(2 * np.pi * freq * 5.4 * t)
    return s * env_exp(n, dur / 4, 0.002) * gain
def alert():
    out = np.zeros(int(0.9 * SR))
    for k, f in enumerate((466.16, 349.23, 466.16)):
        n = int(0.16 * SR); t = np.arange(n) / SR
        s = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 3 * f * t)) * env_exp(n, 0.1, 0.003) * 0.16
        i = int(k * 0.2 * SR); out[i:i + n] += s
    return out
def capture():
    n = int(0.6 * SR); t = np.arange(n) / SR
    low = np.sin(2 * np.pi * np.cumsum(70 + 120 * np.exp(-t / 0.05)) / SR) * env_exp(n, 0.16, 0.001) * 0.6
    snap = lowpass(rng.standard_normal(n), 6000) * env_exp(n, 0.05, 0.0005) * 0.35
    return low + snap

for ev in TL['events']:
    t, k = ev['t'], ev['k']
    if k == 'whoosh': add(L, R, t - 0.3, whoosh(0.45, 0.22), 1, 1)
    elif k == 'slide': add(L, R, t, whoosh(0.8, 0.22, True), 0.8, 1.1)
    elif k == 'thud': add(L, R, t - 0.02, thud(), 1, 1)
    elif k == 'capture': add(L, R, t, capture(), 1, 1)
    elif k == 'alert': add(L, R, t, alert(), 1, 1)
    elif k == 'hit':
        add(L, R, t, thud() * 1.2, 1, 1); add(L, R, t, bell(note(81), 1.0, 0.12), 1, 1)
    elif k == 'bell':
        for j, m in enumerate((72, 76, 79, 84)):   # C major, same key area as the music
            add(L, R, t + j * 0.07, bell(note(m), 1.6, 0.17), 1, 1)
    elif k == 'chime':
        add(L, R, t, bell(note(84), 1.8, 0.16), 1, 1); add(L, R, t + 0.12, bell(note(91), 1.8, 0.12), 1, 1)

# ---- light stereo echo, fades, normalise ----
def echo(x, delay, gain):
    d = int(delay * SR); y = x.copy(); y[d:] += x[:-d] * gain; return y
L = echo(L, 0.30, 0.22); R = echo(R, 0.45, 0.22)
fi = np.minimum(1, np.arange(N) / (0.15 * SR)); fo = np.minimum(1, (N - np.arange(N)) / (0.6 * SR))
L *= fi * fo; R *= fi * fo
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.89, R / peak * 0.89
pcm = (np.stack([L, R], 1) * 32767).astype('<i2')
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('music.wav', TOTAL, 's')
