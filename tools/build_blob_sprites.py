"""Pixel art for the blob and the items in the scene → sprite sheets.

    python tools/build_blob_sprites.py

Writes to app/pet/assets/ in Aseprite's JSON format ("json-array" with
frameTags):

- blob_baby_body / blob_baby_faces – baby (small, with its own faces)
- blob_body / blob_faces           – child (the adult uses these faces too)
- blob_adult_body                  – adult (larger; colored per species in the code) for any
                                     species without pixel art of its own
- sneezle_body / sneezle_faces     – Sneezle (faces of its own)
- flicker_body / flicker_faces     – Flicker (faces of its own)
- lumoth_body / lumoth_faces       – Lumoth (faces of its own)
- angloop_body / angloop_faces     – Angloop (faces of its own)
- gemperor_body / gemperor_faces   – Gemperor (faces of its own)
- purrloop_body / purrloop_faces   – Purrloop (faces of its own)
- grumpcap_body / grumpcap_faces   – Grumpcap (faces of its own)
- cyclopuff_body / cyclopuff_faces – Cyclopuff (one big eye, faces of its own)
- ember_baby_body / ember_baby_faces, cindlet_body / ember_faces – baby and child of the ember line
- lanternling_body / lanternling_faces, flarelet_body / flarelet_faces – its adults (faces of their own)
- stone_baby_body / stone_baby_faces, pebblet_body / stone_faces – baby and child of the stone line
- glimmerock_body / glimmerock_faces, bouldergrin_body / bouldergrin_faces – its adults (faces of their own)
- fox_baby_body / fox_baby_faces, kitlet_body / fox_faces – baby and child of the fox line
- roamtail_body / roamtail_faces, filchfox_body / filchfox_faces – its adults (faces of their own)
- cloud_baby_body / cloud_baby_faces, nimbit_body / cloud_faces – baby and child of the cloud line
- rumblefluff_body / rumblefluff_faces, prismist_body / prismist_faces – its adults (faces of their own)
- <line>_baby_body / <line>_baby_faces, <child>_body / <line>_faces – baby and child of the leaf
  (sproutlet), duck (paddlet), hippo (soakling) and beak (crestling) lines
- twiggle, needlenub, drakwing, quill, steamo, lillypot, rapierre, parcelbeak (_body / _faces) –
  their adults (faces of their own)
- salamber, lunarock, foxfire, flurrbleat, sakurin, bubblehelm, hippula, acewing (_body / _faces) –
  the special forms of the lines (faces of their own)
- <line>_baby_body / <line>_baby_faces, <child>_body / <line>_faces – baby and child of the
  caterpillar (munchlet), dog (pupplet), dragonfly (nymphlet) and beaver (gnawlet) lines
- mothmuff, sunflutter, jesterwing, digby, barrelbard, pawdini, rotorfly, jewelwing, prismfly, dambert,
  timberjack, archibeaver (_body / _faces) – their adults, the last of each three the secret one
  (faces of their own)
- <line>_baby_body / <line>_baby_faces, <child>_body / <line>_faces – baby and child of the
  crab (shellbit) and axolotl (axolittle) lines
- teacrab, lightclaw, castlecrab, mossolotl, medilotl, axodrake (_body / _faces) – their adults, the
  last of each three the secret one (faces of their own)
- mouse_baby_body / mouse_baby_faces, squeaklet_body / mouse_faces – baby and child of the mouse line
- sirthimble, cogsqueak, woolwhisk (_body / _faces) – its adults, Woolwhisk the secret one
- <line>_baby_body / <line>_baby_faces, <child>_body / <line>_faces – baby and child of the
  bear (cubble), penguin (waddlet) and bat (flapling) lines
- hivebear, snorbear, ursastra, tuxwaddle, glidepin, aurorapin, umbrabat, batbeat, lunaflap
  (_body / _faces) – their adults, the last of each three the secret one
- <line>_baby_body / <line>_baby_faces, <child>_body / <line>_faces – baby and child of the
  owl (hootlet), chameleon (colorlet), scarab (rollet) and kite (kitelet) lines
- owlbert, stargazer, ninjowl, palettino, hidewell, mirrorleon, solroll, clockbeetle, pharabug,
  origrane, lionkite, stormkite (_body / _faces) – their adults, the last of each three the secret one
- <line>_baby_body / <line>_baby_faces, <child>_body / <line>_faces – baby and child of the
  octopus (inklet) and gargoyle (gargit) lines
- inkasso, octavio, abyssink, gargard, fountaingle, bellfry (_body / _faces) – their adults, the last
  of each three the secret one
- items                            – eggs, bowl, food, poop, ball, umbrella, clouds, medicine, and
                                     the app's things (sponge, baton, bag, whistle, training, rod)
- trip                             – backpack, plants, decorations, hats, things along the path,
                                     opponents and guardians
- house                            – the house in its three steps, outside and inside

The pixels are written out below as text: one character per pixel, "." is
transparent, and the letters are defined in the palettes. This script is the
only source of the sheets: change the pixels here and run it again, don't
edit the generated PNG and JSON files.

Rules for the LED panel: no black outlines (black doesn't light up), no dark
grays, white only for highlights. How a new creature is designed, and where it
goes in the code: *Designing a creature* in docs/gameplay.md.
"""

import json
import math
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "app" / "pet" / "assets"
CANVAS = 32  # frame for the body, the same for all stages

# ---------------------------------------------------------------- Bodies

BODY_PALETTE = {
    "o": (12, 92, 98),     # outline: dark teal instead of black
    "d": (22, 150, 150),   # shadow
    "b": (40, 200, 188),   # base color
    "l": (105, 228, 212),  # lit
    "h": (205, 255, 244),  # highlight
    "g": (255, 235, 150),   # the bulb of the lure; the code recolors these three during the
    "G": (240, 190, 90),    # child stage as a hint at the adult form (LURE_HINT in core/src/scene.ts)
    "w": (255, 255, 255),
}

# The light comes from the top left. Rows 0–4 are the lure on the head: a stalk
# with a glowing bulb, like an anglerfish's. Column 13 stays free of it, because
# that is the one the poses and a pet that is too heavy get wider at.
BODY = [
    "....................ggg...",
    "...............ooooggwgg..",
    "..............obbbbggggG..",
    "..............oboooGggGG..",
    "..............bbo...GGG...",
    ".........ooooobbo.........",
    ".......oolllllbbboo.......",
    ".....oolhhllllbbbbboo.....",
    "....olhhhlllbbbbbbbbdo....",
    "...olhhllbbbbbbbbbbbbdo...",
    "...ollhlbbbbbbbbbbbbddo...",
    "..ollbbbbbbbbbbbbbbbbddo..",
    "..olbbbbbbbbbbbbbbbbbddo..",
    "..olbbbbbbbbbbbbbbbbbddo..",
    "..olbbbbbbbbbbbbbbbbbddo..",
    ".olbbbbbbbbbbbbbbbbbbbddo.",
    ".olbbbbbbbbbbbbbbbbbbbddo.",
    ".olbbbbbbbbbbbbbbbbbbbddo.",
    ".olbbbbbbbbbbbbbbbbbbbddo.",
    ".obbbbbbbbbbbbbbbbbbbbddo.",
    ".odbbbbbbbbbbbbbbbbbbbddo.",
    "oddbbbbbbbbbbbbbbbbbbbdddo",
    "oddddddddddddddddddddddddo",
    ".oooooooooooooooooooooooo.",
]


def drop_rows(grid, *rows):
    return [r for i, r in enumerate(grid) if i not in rows]


def double_rows(grid, row, times=1):
    return grid[:row] + [grid[row]] * times + grid[row:]


def widen(grid, col, times=1):
    return [r[:col] + r[col] * times + r[col:] for r in grid]


def narrow(grid, col):
    return [r[:col] + r[col + 1:] for r in grid]


def dots(grid, pixels):
    """Replace single pixels: {(x, y): color}."""
    rows = [list(r) for r in grid]
    for (x, y), ch in pixels.items():
        rows[y][x] = ch
    return ["".join(r) for r in rows]


def lookout_tags(base, row):
    """Waiting at the edge of the panel for its usual meal or game (core/src/habits.ts): on tiptoe
    now and then, everything above row `row` leaning a pixel towards the edge it looks out from.
    The frames are a pixel wider on each side, so there is room for the lean."""
    def leaning(grid, direction):
        rows = ["." + r + "." for r in grid]
        top = len(grid) - (len(base) - row)  # the rows below `row` stay where they are
        shift = (lambda r: r[1:] + ".") if direction < 0 else (lambda r: "." + r[:-1])
        return [shift(r) if i < top else r for i, r in enumerate(rows)]

    tiptoe = double_rows(base, row)  # a pixel taller
    return {f"lookout_{side}": [(leaning(base, direction), 900), (leaning(tiptoe, direction), 500)]
            for side, direction in (("left", -1), ("right", 1))}


# More poses come about the way they would when drawing by hand: drop rows in
# the middle (squashed) or double them (stretched), double columns in the middle.
def body_tags(base, row, col, flat_rows=4):
    """All poses of a body; row/col = a straight row and the center column."""
    flat = range(row - flat_rows // 2, row - flat_rows // 2 + flat_rows)
    lighter = range(row - flat_rows // 2, row - flat_rows // 2 + flat_rows - 1)
    return {
        "idle": [(base, 700), (drop_rows(base, row), 700)],                     # breathing
        "squash": [(widen(drop_rows(base, row - 1, row), col), 100)],          # before the jump
        "stretch": [(narrow(double_rows(base, row, 2), col), 100)],            # in the air
        "flat": [(widen(drop_rows(base, *flat), col, 2), 100)],                # landing
        "sleep": [(widen(drop_rows(base, *flat), col, 2), 1600),
                  (widen(drop_rows(base, *lighter), col, 2), 1600)],
    } | lookout_tags(base, row)


BODY_TAGS = body_tags(BODY, 14, 13)

# Adult: the same slime, just larger (the code sets the color per species).
# A fallback for a species without pixel art of its own.
ADULT_BODY = double_rows(widen(BODY, 13, 2), 14, 2)
ADULT_TAGS = body_tags(ADULT_BODY, 16, 14)

# Baby: a small blob with a sprout; the lure grows out of it later
BABY_BODY = [
    ".......o........",
    ".....oobboo.....",
    "...oolhllbboo...",
    "..olhhlbbbbbdo..",
    ".ollhbbbbbbbbdo.",
    ".olbbbbbbbbbbdo.",
    "olbbbbbbbbbbbddo",
    "olbbbbbbbbbbbddo",
    "obbbbbbbbbbbbddo",
    "odbbbbbbbbbbdddo",
    "oddddddddddddddo",
    ".oooooooooooooo.",
]
BABY_TAGS = body_tags(BABY_BODY, 6, 8, flat_rows=3)

# ---------------------------------------------------------------- Sneezle

# A teapot dragon seen from the front: its tail is the handle, and it sneezes
# steam out of the spout (the code adds the steam). Little horns and a spike on
# the lid, bat wings behind its shoulders, scales, a belly of plates and clawed
# feet. The body is the slime's dome. Its eyes are a dragon's (SNEEZLE_EYES).
SNEEZLE_PALETTE = {
    "o": (20, 85, 35),     # outline
    "d": (40, 135, 50),    # shadow, the seam of the lid
    "b": (70, 185, 70),    # base color
    "l": (125, 220, 105),  # lit
    "h": (205, 255, 185),  # highlight
    "y": (240, 215, 130),  # belly
    "Y": (200, 165, 85),   # belly stripe
    "c": (245, 235, 205),  # horns
    "C": (195, 175, 135),
    "r": (245, 150, 60),   # spike and wings
    "R": (190, 90, 35),
}
SNEEZLE = [
    "...........o...oo...o...........",
    "..........oco.orRo.oco..........",
    "..........oCooooooooCo..........",
    "..........oolllllbbboo..........",
    "........oddddddddddddddo........",
    ".......olhhhlllbbbbbbbbdo.......",
    "......olhhllbbbbbbbbbbbbdo...oo.",
    "......ollhlbbbbbbbbbbbbddo..olbo",
    "..oooollbbbbbbbbbbbbbbbbddo.obo.",
    ".obbbolbbbbbbbbbbbbbbbbbddoobbo.",
    "obo..olbbbbbbbbbbbbbbbbbddobbo..",
    "obo..olbbbbbbbbbbbbbbbbbddooo...",
    "obo.olbbbbbbbbbbbbbbbbbbbddo....",
    "obo.olbbbbbbbbbbbbbbbbbbbddo....",
    "obo.olbbbbbbbbbbbbbbbbbbbddo....",
    ".obbblbbbbbbbbbbbbbbbbbbbddo....",
    "..ooolbbbbbbbbbbbbbbbbbbbddo....",
    "....olbbbbbbbbbbbbbbbbbbbddo....",
    "....olbbbbbyyyyyyyyybbbbbddo....",
    "....obbbbbyYYYYYYYYYybbbbddo....",
    "....odbbbbyyyyyyyyyyybbbbddo....",
    "...oddbbbbbYYYYYYYYYbbbbbdddo...",
    "...oddddddddddddddddddddddddo...",
    "....odbbdoooooooooooooodbbdo....",
    "....obcbco............ocbcbo....",
    ".....oooo..............oooo.....",
]
SNEEZLE = dots(SNEEZLE, {(9, 12): "l", (12, 15): "l", (22, 10): "d", (20, 14): "d", (8, 9): "l"})  # scales


def behind(grid, part, left, top):
    """Draws `part` behind the body: only where the grid is still empty."""
    rows = [list(r) for r in grid]
    for y, line in enumerate(part):
        for x, ch in enumerate(line):
            if ch != "." and rows[top + y][left + x] == ".":
                rows[top + y][left + x] = ch
    return ["".join(r) for r in rows]


# The wings, folded behind the shoulders and spread when it flutters (the left one; the right one
# is its mirror image)
SNEEZLE_WING = ["o.....", "oo....", "oro...", "orroo.", "oRrrro", ".oRRro", "..oooo"]
SNEEZLE_WING_SPREAD = ["o.......", "ooo.....", "orroo...", "orrrroo.", "oRrRrrro", "oRrRrRro", "oRoRrRro",
                       ".o.oRoRo", "....o.o."]
SNEEZLE_FLUTTER = behind(behind(SNEEZLE, SNEEZLE_WING_SPREAD, 0, 0), [r[::-1] for r in SNEEZLE_WING_SPREAD], 24, 0)
SNEEZLE = behind(behind(SNEEZLE, SNEEZLE_WING, 3, 0), [r[::-1] for r in SNEEZLE_WING], 23, 0)
SNEEZLE_FACE_TOP = 6

# ---------------------------------------------------------------- Flicker, Cyclopuff, Grumpcap, Lumoth

# Drawn as the left half, mirrored, outline and light from the top left added,
# and then touched up by hand. Poses as for the others: drop or double row
# `row`, double column `col` (the center).

def species_tags(idle, row, col, up=None, idle_ms=700, sleep=None):
    """idle: list of frames (breathing/flickering/fluttering), up: frame for the jump."""
    base, up = idle[0], up or idle[0]
    flat = lambda g, n=3: widen(drop_rows(g, *range(row - 1, row - 1 + n)), col, 2)
    sleep = sleep or [flat(base), flat(base, 2)]
    return {
        "idle": [(g, idle_ms) for g in idle],
        "squash": [(widen(drop_rows(base, row - 1, row), col), 100)],
        "stretch": [(narrow(double_rows(up, row, 2), col), 100)],
        "flat": [(flat(base), 100)],
        "sleep": [(g, 1600) for g in sleep],
    } | lookout_tags(base, row)



def walk_tags(grid, row, left_foot, right_foot, foot_top, ms=(200, 120)):
    """A walk for a form with feet, instead of hopping: one foot lifted and the body leaning over
    the other one, then a pixel taller (row `row` doubled) between the steps. left_foot/right_foot:
    the columns of the feet, foot_top: the first row of the feet; everything above it leans. The
    frames are a pixel wider on each side, so there is room for the lean."""
    def step(feet, lean):
        rows = [list("." + r + ".") for r in grid]
        for y in range(foot_top, len(rows)):  # the foot moves up a row
            for x in feet:
                rows[y - 1][x + 1], rows[y][x + 1] = rows[y][x + 1], "."
        for y in range(foot_top - 1):  # the body leans towards the foot that stays down
            rows[y] = ["."] + rows[y][:-1] if lean > 0 else rows[y][1:] + ["."]
        return ["".join(r) for r in rows]

    passing = ["." + r + "." for r in double_rows(grid, row)]
    return [(step(left_foot, 1), ms[0]), (passing, ms[1]), (step(right_foot, -1), ms[0]), (passing, ms[1])]

SNEEZLE_TAGS = species_tags([SNEEZLE, drop_rows(SNEEZLE, 17)], 17, 13)
# It walks; its wings only flap for a trick: its flip is a flutter (OWN_TRICKS in core/src/scene.ts)
SNEEZLE_TAGS["flutter"] = [(SNEEZLE_FLUTTER, 80), (SNEEZLE, 80)]
SNEEZLE_TAGS["walk"] = walk_tags(SNEEZLE, 17, range(4, 10), range(22, 28), 22)

# Flicker: a candle of melted slime – playful, and bored as easily. The flame on the wick is what
# the bulb of the child's lure turned into; it flickers, and its color shows the mood (blue = sad,
# golden = happy) – the code does that recoloring, for every saturated red to yellow. So the wick
# and the wax keep away from those hues. The flame stays narrower than 8 pixels: the head starts
# at the wax. The top has melted: a pool with a rim that hangs over, and three drips running down.
# Two blobs of wax on its sides are its arms: the left one waves, the right one hangs lower.
FLICKER_PALETTE = {
    "o": (120, 25, 10), "r": (225, 60, 30), "f": (250, 130, 30), "y": (255, 200, 60), "w": (255, 235, 160),
    "O": (45, 130, 128),   # outline of the wax, wick
    "m": (175, 238, 224),  # wax
    "M": (110, 205, 195),  # shadow, the ends of the drips
    "H": (240, 255, 252),  # highlight, drips
}
FLICKER_A = [
    "............o.............",
    "...........oro............",
    "...........orro...........",
    "..........orfro...........",
    "..........orfyro..........",
    ".........orfywro..........",
    ".........orfyyro..........",
    "..........orffro..........",
    "...........oooo...........",
    "............OO............",
    "....OOOOOOOOOOOOOOOOOO....",
    "...OHHHHHHHHHHHHHHHHHMO...",
    "...OHmmmmmmmmmmmmmmmmMO...",
    "...OHHmmmmmHHmmmmmHHmMO...",
    "....OHmmmmmHHmmmmmHHMO....",
    "....OHmmmmmMMmmmmmHHMO....",
    "....OMmmmmmmmmmmmmMMMO....",
    "....OmmmmmmmmmmmmmmmMO....",
    "....OmmmmmmmmmmmmmmmMO....",
    "....OmmmmmmmmmmmmmmmMO....",
    "....OmmmmmmmmmmmmmmmMO....",
    "....OmmmmmmmmmmmmmmmMO....",
    "....OmmmmmmmmmmmmmmmMO....",
    "....OmmmmmmmmmmmmmmmMO....",
    "....OmmmmmmmmmmmmmmmMO....",
    "...OmmmmmmmmmmmmmmmmMMO...",
    "..OMmmmmmmmmmmmmmmmmMMMO..",
    ".OMMMMMMMMMMMMMMMMMMMMMMO.",
    "..OOOOOOOOOOOOOOOOOOOOOO..",
]


def wax_arms(candle):
    """The candle with a blob of wax on each side as its arms: the left one up, the right one
    hanging lower."""
    rows = [list(r) for r in candle]
    for x, y, ch in ((3, 16, "O"), (2, 17, "O"), (3, 17, "H"), (4, 17, "m"), (2, 18, "O"), (3, 18, "m"), (4, 18, "m"),
                     (3, 19, "O"), (22, 19, "O"), (21, 19, "M"), (21, 20, "M"), (22, 20, "M"), (23, 20, "O"),
                     (22, 21, "O"), (23, 21, "O")):
        rows[y][x] = ch
    return ["".join(r) for r in rows]


# The tip of the flame leans to the right and to the left
FLICKER_B = wax_arms([".............o............", "............oro...........", "...........orro..........."]
                     + FLICKER_A[3:])
FLICKER_C = wax_arms(["...........o..............", "...........oro............", "...........orro..........."]
                     + FLICKER_A[3:])
FLICKER_A = wax_arms(FLICKER_A)
FLICKER_FACE_TOP = 7  # below the drips
FLICKER_TAGS = species_tags([FLICKER_A, FLICKER_B, FLICKER_C], 21, 6, idle_ms=160)

# Cyclopuff: an easy-going, scruffy ram calf with one big eye – sturdy, a bit of a glutton and
# hard to rush. Curled ram horns, a cowlick falling to the right, a cream belly with fluffy fur at
# the top, stubby arms with claws and big feet. The cream of the horns, claws and belly and the
# amber of the eye (CYCLOPS) are the accents on the purple fur.
CYCLOPUFF_PALETTE = {
    "o": (60, 25, 90), "d": (110, 55, 150), "b": (150, 90, 200), "l": (190, 140, 235), "h": (235, 210, 255),
    "H": (150, 85, 55), "C": (225, 165, 90), "c": (250, 225, 170),  # horns and claws
    "e": (245, 225, 200), "E": (215, 180, 175),                     # belly
}
CYCLOPUFF = [
    "...HHH..................HHH...",
    "..HcccH................HcccH..",
    ".HcCHHcH..............HcHHCcH.",
    ".HcH..HcH............HcH..HcH.",
    ".HcH...HCH.oooooooo.HCH...HcH.",
    "..HCH..HCHoolllbbbooHCH..HCH..",
    "...HH.oHCHllhhlbbbbbHCHo.HH...",
    ".....olHHlhhhllbbbbbdHHdo.....",
    "....olhlllhllbbbbbbbbbbddo....",
    "...olhhlbbbbbbbbbbbbbbbbddo...",
    "..oolhlbbbbbbbbbbbbbbbbbddoo..",
    "...olhlbbbbbbbbbbbbbbbbbddo...",
    "..olbbbbbbbbbbbbbbbbbbbbbbdo..",
    ".oolbbbbbbbbbbbbbbbbbbbbbbdoo.",
    "..olbbbbbbbbbbbbbbbbbbbbbbdo..",
    ".oolodbbbbbbbbbbbbbbbbbbdodoo.",
    "olllbdbbbbbbbbbbbbbbbbbbdbbbdo",
    "olbbbdbbbbbbbbbbbbbbbbbbdbbbdo",
    "ocbcodbbbbbeeeeeeeebbbbbdocbco",
    ".oooddbbbeeeeeeeeeeEbbbbddooo.",
    "..odbbbbbeeeeeeeeeeEbbbbbbdo..",
    "..odbbbbbeeeeeeeeeEEbbbbbbdo..",
    "...odbbbbbEeeeeeeEEbbbbbbdo...",
    "....oddbbbbbbbbbbbbbbbbddo....",
    "...obbddddddddddddddddddbbo...",
    "...obbbdoooooooooooooodbbdo...",
    "...ocdcdo............odcdco...",
    "....oooo..............oooo....",
]
CYCLOPUFF = dots(CYCLOPUFF, {
    # the cowlick between the horns
    (13, 3): "o", (14, 2): "o", (15, 2): "o", (16, 3): "o", (17, 3): "o", (18, 4): "o",
    (14, 3): "l", (15, 3): "l", (14, 4): "l", (15, 4): "b", (16, 4): "b", (17, 4): "b",
    # fluffy fur at the top of the belly
    (12, 17): "e", (14, 17): "e", (16, 17): "e",
    # flecks in the coat
    (9, 12): "l", (7, 14): "l", (21, 12): "d", (22, 14): "d", (11, 22): "d", (20, 22): "d",
})
CYCLOPUFF_FACE_TOP = 5  # the brow sits just under the cowlick
CYCLOPUFF_TAGS = species_tags([CYCLOPUFF, drop_rows(CYCLOPUFF, 13)], 13, 14)

CYCLOPUFF_TAGS["walk"] = walk_tags(CYCLOPUFF, 13, range(3, 9), range(21, 27), 25)

# Grumpcap: a toad under a toadstool, grumpy but lovable. Its cap is too big and pulled down
# low: the sides hang past the eyes, which look out right under the brim, heavy-lidded and golden
# (GRUMPCAP_EYES). A wide toad mouth, warts, a cream belly, front legs and webbed feet. The green
# of the toad against the red of the cap is its accent.
GRUMPCAP_PALETTE = {
    "o": (100, 22, 22), "d": (160, 35, 35), "k": (210, 60, 50), "l": (240, 110, 90), "h": (255, 200, 180),
    "w": (250, 240, 230),                                                       # cap and spots
    "O": (45, 75, 35), "G": (80, 125, 50), "g": (115, 165, 70), "j": (160, 205, 105),  # toad
    "s": (240, 225, 175), "S": (200, 185, 135),                                 # belly
}
GRUMPCAP = [
    "..........oooooooooo..........",
    ".......ooolkkkkkkkddooo.......",
    ".....oolkkkkkkkkkkkkkddoo.....",
    "....olkkhkkwwkkkkkkkkkkddo....",
    "...olkkhhkkwwkkkkkkkkkkkddo...",
    "..olkkkkkkkkkkkkkkwwkkkkkddo..",
    ".olkkkkkkkkkkkkkkwwwkkkkkkddo.",
    ".olkkwwkkkkkkkkkkkkkkkkkkkddo.",
    "olkkkwwkkkkkkkkkkkkkkkkkwwkddo",
    "olkkkkkkkkkkkkwwkkkkkkkkwkkddo",
    "olkkkkkkkkkkkkkkkkkkkkkkkkkddo",
    "olkkkkkkkkwwkkkkkkkkkkkkkkkddo",
    "olkkddddddddddddddddddddddkddo",
    "olkdOjgggggggggggggggggGGOdddo",
    "olddOjgggggggggggggggggGGOdddo",
    ".oooOjgggggggggggggggggGGOooo.",
    "...OjgggggggggggggggggggGGO...",
    "..OjggggggggggggggggggggggGO..",
    "..OjggggggggggggggggggggggGO..",
    ".OjjgGggggggggggggggggggGgGGO.",
    ".OjjgGggggggggggggggggggGgGGO.",
    ".OjggGgGssssssssssssssGgGggGO.",
    "OjggGjgGssssssssssssssGgGGggGO",
    "OjggGjgGssssssssssssssGgGGggGO",
    "OjggGjgGssssssssssssssGgGGggGO",
    "OgggGjjGSssssssssssssSGGGGgggO",
    "OjjOjjjjOOOOOOOOOOOOOOGGGGOGGO",
    ".OOOOOOO..............OOOOOOO.",
]
GRUMPCAP = dots(GRUMPCAP, {(9, 17): "G", (19, 18): "j", (2, 22): "G", (26, 23): "j", (13, 16): "j"})  # warts
GRUMPCAP_FACE_TOP = 13  # right under the brim
GRUMPCAP_TAGS = species_tags([GRUMPCAP, drop_rows(GRUMPCAP, 18)], 18, 14)
# It walks, and as a toad it hops now and then (WALK_HOPS in core/src/scene.ts), but not like a
# slime: in the air its hind legs stretch out behind it.
GRUMPCAP_LEAP = GRUMPCAP[:25] + [h + h[::-1].translate(str.maketrans("j", "G")) for h in [
    ".OOOGjjGOOOOOOO",
    "..OjjgGO.......",
    ".OjggGO........",
    "OjggGO.........",
    "OjgGO..........",
    "jOjO...........",
]]
GRUMPCAP_TAGS["stretch"] = [(GRUMPCAP_LEAP, 100)]
GRUMPCAP_TAGS["walk"] = walk_tags(GRUMPCAP, 18, range(0, 8), range(22, 30), 25)

# Lumoth: a cuddly moth – fluffy as a plush toy, and it loves being petted. A fluffy white ruff,
# a striped belly on little pink feet, feathery antennae (the right one droops), big wings with a
# heart on each, and at night it glows.
LUMOTH_PALETTE = {
    "o": (90, 40, 110), "f": (230, 205, 245), "F": (180, 150, 210), "w": (235, 110, 190), "W": (165, 60, 140),
    "v": (165, 115, 235), "V": (110, 65, 175), "E": (110, 45, 130), "s": (200, 160, 225),
    "H": (255, 238, 225),  # the ruff
    "k": (255, 150, 190),  # the feet
    # The hearts, the antennae and the dots on the lower wings: at night the code lights them up
    # (LUMOTH_GLOW in core/src/scene.ts), so these colors are only used for them.
    "e": (255, 215, 110), "a": (240, 200, 120), "g": (250, 160, 215),
}
LUMOTH = [
    "......ooo.......................",
    "o....oaaao.....................o",
    "oo....ooao............oooo....oo",
    "owo.....oao.o.o..o.o.oaaaao..owo",
    "owWwwo...oaofofoofofoao.oaowwWwo",
    "owwWwwwwwoffffffffffFFowwowwWwwo",
    "owwwWwwwofffffffffffffFowwwWwwwo",
    "owwEwEwoffffffffffffffFfowEwEwwo",
    "owEeEeEoffffffffffffffFfoEeEeEwo",
    "owEeeeEoffffffffffffffFfoEeeeEwo",
    "owwEeEwoffffffffffffffFfowEeEwwo",
    "oWwwEwwwoffffffffffffFFowwwEwwWo",
    ".oWWWWWoHHHHHHHHHHHHHHHHoWWWWWo.",
    ".oovvoHHHHHHHHHHHHHHHHHHHHovvoo.",
    "ovvvvoHoHHoHHHoHHoHHHoHHoHovvvvo",
    "ovvvvvoFoffFoffffffoFffoFovvvvvo",
    "ovvgvvvvoffffffFFffffffovvvvgvvo",
    "ovvvvvgvossssssssssssssovgvvvvvo",
    ".ovgvvvvoffffffFFffffffovvvvgvo.",
    "..oVVVVVVossssssssssssoVVVVVVo..",
    "...ooooo.offffffffffffo.ooooo...",
    "..........okko....okko..........",
    "...........oo......oo...........",
]
# A wingbeat: the upper wings one row higher
LUMOTH_FLAP = [
    "o.....ooo......................o",
    "oo...oaaao....................oo",
    "owo...ooao............oooo...owo",
    "owWww...oao.o.o..o.o.oaaaaowwWwo",
    "owwWwww..oaofofoofofoao.oaowWwwo",
    "owwwWwwwwoffffffffffFFowwwwWwwwo",
    "owwEwEwwofffffffffffffFowwEwEwwo",
    "owEeEeEoffffffffffffffFfoEeEeEwo",
    "owEeeeEoffffffffffffffFfoEeeeEwo",
    "owwEeEwoffffffffffffffFfowEeEwwo",
    "oWwwEwwoffffffffffffffFfowwEwwWo",
    ".oWWWWWwoffffffffffffFFowWWWWWo.",
] + LUMOTH[12:]
LUMOTH_FACE_TOP = 4
LUMOTH_TAGS = species_tags([LUMOTH, LUMOTH_FLAP], 16, 15, up=LUMOTH_FLAP, idle_ms=450)
# Its spin is circling, as a moth circles a lamp (OWN_TRICKS in core/src/scene.ts)
LUMOTH_TAGS["flutter"] = [(LUMOTH_FLAP, 80), (LUMOTH, 80)]

# Angloop: what the slime becomes when its care was nothing special – the child, grown up, with
# its lure turned into a real anglerfish's: it arcs over its head and the bulb hangs in front of
# its brow, a light that glows at night. Its sides have grown into fins it uses as arms (the
# left one raised), a little fin sits on the back of its head, and bubbles float in the jelly.
# The face is the child's eyes with a wide anglerfish grin (ANGLOOP_MOUTHS). Teal, the orange of
# the fins and the gold of the bulb.
ANGLOOP_PALETTE = BODY_PALETTE | {"q": (150, 70, 30), "F": (255, 165, 80), "f": (225, 115, 55)}
ANGLOOP = [
    "...................ooooo......",
    "..................obbbbbo.....",
    ".................obooooobo....",
    ".................obo...obo....",
    ".................obo....o.....",
    ".................obo..ggg.....",
    ".................obo.ggwgg....",
    "......q..........bbo.ggggG....",
    "......qq..ooooooobbo..GGG.....",
    "......qFoolllllllbbboo........",
    "......oolhhllllllbbbbboo......",
    ".....olhhhlllbbbbbbbbbbdo.....",
    "q...olhhllbbbbbbbbbbbbbbdo....",
    "qq..ollhlbbbbbbbbbbbbbbddo....",
    "qFqollbbbbbbbbbbbbbbbbbbddo...",
    "qFFqlbbbbbbbbbbbbbbbbbbbddo...",
    "qFfFqbbbbbbbbbbbbbbbbbbbddo...",
    ".qffqbbbbbbbbbbbbbbbbbbbddo...",
    "..qqlbbbbbbbbbbbbbbbbbbbddo..q",
    "...olbbbbbbbbbbbbbbbbbbbddo.qq",
    "..olbbbbbbbbbbbbbbbbbbbbbddqFq",
    "..olbbbbbbbbbbbbbbbbbhbbbdqFFq",
    "..olbbbbbbbbbbbbbbbbhbhbbqFfFq",
    "..olbbbbbbbbbbbbbbbbbhbbbqffq.",
    "..obbbbbbbbbbbbbbbbbbbbbbdqq..",
    "..odbbbbbbbbbbbbbbbbbbbhbddo..",
    ".oddbbbbbbbbbbbbbbbbbbbbbdddo.",
    ".oddddddddddddddddddddddddddo.",
    "..oooooooooooooooooooooooooo..",
]
# The bulb swings on its line
ANGLOOP_B = ANGLOOP[:4] + [r[:20] + r[21:27] + "." + r[27:] for r in ANGLOOP[4:9]] + ANGLOOP[9:]
ANGLOOP_FACE_TOP = 9  # counted from the bulb
ANGLOOP_TAGS = species_tags([ANGLOOP, ANGLOOP_B], 20, 14)
# Its own bow, the lure: it casts its line out in front and lets the bulb dangle, flashing (the
# bulb light, then bright), before it snaps. The stalk arcs further out, the rest stays the same.
ANGLOOP_LURE_TOP = [  # columns 17 on; a space keeps what is there
    "..ooooooo....",
    ".obbbbbbbo...",
    "obooooooobo..",
    "obo.....obo..",
    "obo.....obo..",
    "obo.....obo..",
    "obo.....obo..",
    "bbo.....obo..",
    "bbo......o...",
    "         ggg.",
    "        ggwgg",
    "        ggggG",
    "         GGG.",
]
ANGLOOP_LURE = [r[:17] + "".join(o if t == " " else t for o, t in zip(r[17:], top))
                for r, top in zip(ANGLOOP, ANGLOOP_LURE_TOP)] + ANGLOOP[len(ANGLOOP_LURE_TOP):]
ANGLOOP_TAGS["lure"] = [(ANGLOOP_LURE, 150), ([r[:25] + r[25:].replace("g", "w").replace("G", "g") for r in ANGLOOP_LURE], 150)]

# Purrloop: what the slime becomes when it is petted a lot – a cat of jelly. Ears of jelly (the
# right one folded over at the tip), the bulb of the lure turned into a heart, whiskers, and two
# little paws in front that knead. Cat eyes with a slit, its normal look a slow, content blink
# (PURRLOOP_EYES). Teal, the pink of the heart, ears and nose, and the amber of the eyes.
PURRLOOP_PALETTE = BODY_PALETTE | {"P": (255, 130, 170), "k": (255, 205, 222), "Q": (190, 60, 110)}
PURRLOOP = [
    "............QQQ.QQQ...........",
    "...........QPkPQPPPQ..........",
    "...........QPPPPPPPQ..........",
    ".......o....QPPPPPQ...........",
    ".......oo....QPPPQ............",
    ".......olo....QPQ...oooo......",
    ".......olPo....Q....oPdo......",
    ".......olPPo..obo..oPPdo......",
    ".......olPPbooooooobPPdo......",
    "........oolllllllbbboo........",
    "......oolhhllllllbbbbboo......",
    ".....olhhhlllbbbbbbbbbbdo.....",
    "....olhhllbbbbbbbbbbbbbbdo....",
    "....ollhlbbbbbbbbbbbbbbddo....",
    "...ollbbbbbbbbbbbbbbbbbbddo...",
    "...olbbbbbbbbbbbbbbbbbbbddo...",
    "...olbbbbbbbbbbbbbbbbbbbddo...",
    "...olbbbbbbbbbbbbbbbbbbbddo...",
    "ll.olbbbbbbbbbbbbbbbbbbbddo.ll",
    "..lolbbbbbbbbbbbbbbbbbbbddol..",
    "llolbbbbbbbbbbbbbbbbbbbbbddoll",
    "..olbbbbbbbbbbbbbbbbbbbbbddo..",
    "..olbbbbbbbbbbbbbbbbbbbbbddo..",
    "..olbbbbbbbbbbbbbbbbbbbbbddo..",
    "..obbbbbboobbbbbbbboobbbbddo..",
    "..odbbbbolbobbbbbbobbobbbddo..",
    ".oddbbbbobbobbbbbbobdobbbdddo.",
    ".oddddddooooddddddooooddddddo.",
    "..oooooooooooooooooooooooooo..",
]
# The heart sways on its stalk
PURRLOOP_B = [r[:11] + "." + r[11:20] + r[21:] for r in PURRLOOP[:5]] + PURRLOOP[5:]
PURRLOOP_FACE_TOP = 14  # counted from the heart
PURRLOOP_TAGS = species_tags([PURRLOOP, PURRLOOP_B], 20, 14)


def cat_stretch(grid, row, drop):
    """A cat's stretch: the front (on the right) sinks and the back stays up; column x loses
    round(drop * x / width) rows at `row` and moves down by as much."""
    width = len(grid[0])
    cols = []
    for x in range(width):
        col = [r[x] for r in grid]
        n = round(drop * x / (width - 1))
        cols.append(["."] * n + col[:row] + col[row + n:])
    return ["".join(c[y] for c in cols) for y in range(len(grid))]


# Its own bow: front down in a long stretch with a yawn
PURRLOOP_TAGS["stretch_low"] = [(cat_stretch(PURRLOOP, 10, 7), 1000)]

# Gemperor: the slime grown into a king. The jelly on its back has hardened into a crown of
# crystals, one of them broken off, and the bulb of the child's lure has sunk into its belly,
# where it glows as its core. One crystal fist planted on the ground, the other raised. It still
# hops, only heavier. The face is a hero's (GEMPEROR_EYES). Teal, the lilac of the crystals and
# the gold of the core; at night the crystals and the core glow (GLOWS in core/src/scene.ts).
GEMPEROR_PALETTE = {
    "o": (12, 92, 98), "d": (22, 150, 150), "b": (40, 200, 188), "l": (105, 228, 212), "h": (205, 255, 244),
    "E": (95, 60, 160), "C": (190, 150, 255), "c": (140, 95, 215), "X": (235, 220, 255),  # crystal
    "x": (255, 255, 255),                                                                  # sparkle
    "y": (255, 225, 110), "Y": (240, 165, 50), "w": (255, 250, 220),                       # core
}
GEMPEROR = [
    "...............E..............",
    "..............EXE.............",
    ".............ECXcE............",
    "............ECCXccE...........",
    ".........E..ECCXccE...........",
    "........EXE.ECxXccE...........",
    ".......ECXcEECCCccE..E........",
    ".......ExXcEECCCccE.EXE.......",
    ".......ECXcEECCCccEECXcE......",
    ".......ECCcEECCCccEExXcE......",
    "......oECCcEECCCccEECXcE......",
    "....EXEECCcEECCCccEECCcEo.....",
    "....EXEECCcEhhbbbbbECCcEdo....",
    "...oEXEbhhhhbbbbbbbbbbbbddEEE.",
    "...oECEbhhhbbbbbbbbbbbbbdoCcCo",
    "..olECEbbbbbbbbbbbbbbbbbbobbbo",
    "..ollbbbbbbbbbbbbbbbbbbbbobbdo",
    "..ollbbbbbbbbbbbbbbbbbbbbobbo.",
    "..ollbbbbbbbbbbbbbbbbbbbbobo..",
    "..ollbbbbbbbbbbbbbbbbbbbbddo..",
    "..ollbbbbbbbbbbbbbbbbbbbbddo..",
    ".ooolbbbbbbbbbbbbbbbbbbbbddo..",
    "olbbobbbbbbbbblllbbbbbbbbddo..",
    "olbbobbbbbbbblywylbbbbbbbddo..",
    "oCcCobbbbbbbblyyYlbbbbbbbddo..",
    ".EEElbbbbbbbblYYYlbbbbbbbddo..",
    "..ollbbbbbbbbblllbbbbbbbbddo..",
    "..oddddddddddddddddddddddddo..",
    "..oooooooooooooooooooooooooo..",
]
# A sparkle runs over the crystals
GEMPEROR_B = dots(GEMPEROR, {(14, 5): "X", (8, 7): "X", (20, 9): "X", (16, 2): "x", (10, 9): "x", (22, 11): "x"})
GEMPEROR_FACE_TOP = 8  # brows just under the crown
GEMPEROR_TAGS = species_tags([GEMPEROR, GEMPEROR_B], 18, 15, idle_ms=800)

# ---------------------------------------------------------------- The ember line

# The pet that hatches from the ember egg. What its forms keep is the flame.
FIRE = {"o": (120, 25, 10), "r": (225, 60, 30), "f": (250, 130, 30), "y": (255, 200, 60), "w": (255, 235, 160)}
EMBER_PALETTE = FIRE | {
    "O": (95, 22, 14), "D": (120, 30, 20), "K": (160, 45, 30), "k": (195, 70, 40),  # the cooled crust
    "c": (255, 190, 50), "C": (255, 240, 170),                                       # cracks that glow
    "F": (245, 125, 35),                                                             # the crust in the light
    "Z": (150, 100, 40), "s": (245, 205, 105), "S": (205, 155, 65),                  # brass
    "g": (170, 210, 255),                                                            # the shine on the glass
}


def overlay(grid, part, at):
    """Lay one drawing over another, its top left corner at `at` (x, y); "." lets the lower one show."""
    x0, y0 = at
    rows = [list(r) for r in grid] + [list("." * len(grid[0])) for _ in range(y0 + len(part) - len(grid))]
    for y, line in enumerate(part):
        for x, ch in enumerate(line):
            if ch != ".":
                rows[y0 + y][x0 + x] = ch
    return ["".join(r) for r in rows]


# Baby: the baby slime as an ember, with a spark where the sprout would be
EMBER_BABY = dots([r.translate(str.maketrans("odblh", "ODKkF")) for r in BABY_BODY],
                  {(7, 0): "y", (7, 1): "f", (8, 1): "r", (2, 9): "c", (13, 6): "c"})
EMBER_BABY_TAGS = body_tags(EMBER_BABY, 6, 8, flat_rows=3)

# Cindlet, the child: an ember slime. A cooled crust with glowing cracks, a flame for a curl, and
# eyes that glow. The three colors of the flame are its own: the code recolors them as a hint at
# the adult form, the way it does with the bulb of the slime's lure (LURES in core/src/scene.ts). Column 9
# is the one the poses get wider at; it runs past the flame.
CINDLET = [
    "............o.............",
    "...........oro............",
    "...........orfo...........",
    "..........orfyro..........",
    "..........orfyfo..........",
    ".........OOOrfOOO.........",
    ".......OOkkkkkKKKOO.......",
    ".....OckFFkkkkKKKKKOO.....",
    "....OkcFFkkkKKKKKKcKDO....",
    "...OkCFkkKKKKKKKKKKCKDO...",
    "...OckFkKKKKKKKKKKKcDDO...",
    "..OkcKKKKKKKKKKKKKKKKDDO..",
    "..OkKKKKKKKKKKKKKKKKKDDO..",
    "..OkKKKKKKKKKKKKKKKKKDcO..",
    "..OkKKKKKKKKKKKKKKKKKcDO..",
    ".OkKKKKKKKKKKKKKKKKKKCDDO.",
    ".OkKKKKKKKKKKKKKKKKKKKcDO.",
    ".OkKKKKKKKKKKKKKKKKKKKDDO.",
    ".OkKKKKKKKKKKKKKKKKKKKDDO.",
    ".OKKcCKKKKKKKKKKKKKcKKDDO.",
    ".ODcKKcKKKKKKKKKKcCKKKDDO.",
    "ODDKKKKcKKKKKKKKcKKKKKDDDO",
    "ODDDDDDDDDDDDDDDDDDDDDDDDO",
    ".OOOOOOOOOOOOOOOOOOOOOOOO.",
]
CINDLET_TAGS = body_tags(CINDLET, 17, 9)

# Lanternling: a flame that has moved into a lantern, so the rain can't get at it. The glass is
# left transparent ("g" is its shine). The lantern is stiff: what gives when it hops is the handle
# on top, which folds down and stretches. Asleep, the flame burns low.
LANTERN = [
    "...........ZZZZ...........",
    "..........ZZ..ZZ..........",
    "...........ZZZZ...........",
    "........ZZZZZZZZZZ........",
    ".....ZZssssssssssssZZ.....",
    "..ZZssSSSSSSSSSSSSSSssZZ..",
    ".ZZZZZZZZZZZZZZZZZZZZZZZZ.",
] + ["..ZS..................SZ.."] * 16 + [
    ".ZZZZZZZZZZZZZZZZZZZZZZZZ.",
    ".ZSSSSSSSSSSSSSSSSSSSSSSZ.",
    "..ZZZ................ZZZ..",
]
LANTERN = dots(LANTERN, {(5, 7): "g", (4, 8): "g", (4, 9): "g", (21, 20): "g", (21, 21): "g"})
LANTERN_FLAME = [
    "......o...o.....",
    ".....oro.oro....",
    "..o..orrorro.o..",
    ".oro.orrrrroro..",
    ".orrorrffrrrro..",
    "orrrrffffffrrro.",
    "orrffyyyyyyffrro",
    "orffyywwwwyyffro",
    "orffywwwwwwyffro",
    "orffywwwwwwyffro",
    "orffywwwwwwyffro",
    "orffywwwwwwyffro",
    "orffyywwwwyyffro",
    ".orffyyyyyyffro.",
    "..orrffffffrro..",
]
LANTERN_FLAME_B = [  # the tips lean the other way
    ".....o.....o....",
    "....oro...oro...",
    ".o..orro.orro.o.",
    ".oro.orrrrroro..",
] + LANTERN_FLAME[4:]
LANTERN_FLAME_LOW = ["................"] * 4 + ["....oooooooo....", "..oorrffffrroo.."] + LANTERN_FLAME[6:]
LANTERN_FLAME_LOWER = ["................"] * 5 + ["....oooooooo....", "..oorffyyffroo.."] + LANTERN_FLAME[7:]
LANTERN_FLAME_AT = (5, 8)
LANTERNLING_FACE_TOP = 11  # in the heart of the flame
LANTERNLING, LANTERNLING_B, LANTERNLING_LOW, LANTERNLING_LOWER = (
    overlay(LANTERN, flame, LANTERN_FLAME_AT)
    for flame in (LANTERN_FLAME, LANTERN_FLAME_B, LANTERN_FLAME_LOW, LANTERN_FLAME_LOWER))
LANTERNLING_TAGS = species_tags(
    [LANTERNLING, LANTERNLING_B], 1, 13, idle_ms=450,
    sleep=[widen(drop_rows(g, 0, 1, 2), 13, 2) for g in (LANTERNLING_LOW, LANTERNLING_LOWER)])

# Flarelet: a flame that has burst out of its crust and burns in the open. What is left of the
# crust is the bowl it sits in, cracked open like an eggshell.
FLARELET_A = [
    ".........o....o.........",
    "........oro..oro........",
    "....o...orroorro...o....",
    "...oro..orroorro..oro...",
    "...orroorrrrrrrroorro...",
    "...orrrorrfrrfrrorrro...",
    "..orrfrrrffffffrrrfrro..",
    "..orrffrffyffyffrffrro..",
    ".orrfffffyyyyyyfffffrro.",
    ".orrffyfyywyywyyfyffrro.",
    ".orrffyyywwwwwwyyyffrro.",
    ".orrffyywwwwwwwwyyffrro.",
    "orrffyywwwwwwwwwwyyffrro",
    "orrffyywwwwwwwwwwyyffrro",
    "orrffyywwwwwwwwwwyyffrro",
    "orrffyywwwwwwwwwwyyffrro",
    "orrffyywwwwwwwwwwyyffrro",
    "orrffyywwwwwwwwwwyyffrro",
    "orrffyyyyyyyyyyyyyyffrro",
    ".orrffyyyyyyyyyyyyffrro.",
    ".orrffffffffffffffffrro.",
]
FLARELET_B = [
    ".........o.....o........",
    "........oro...oro.......",
    "....o...orro.orro...o...",
    "...oro..orroorro...oro..",
    "...orroorrrrrrrro.oro...",
    "...orrrorrfrrffrrorro...",
    "..orrfrrrfffffffrrrrro..",
    "..orrffrffyffyyffrfrro..",
    ".orrfffffyyyyyyyffffrro.",
    ".orrffyfyywyywwyyfffrro.",
    ".orrffyyywwwwwwwyyffrro.",
] + FLARELET_A[11:]
FLARELET_C = [
    "..............o.........",
    "..........o..oro........",
    ".....o...oroorro...o....",
    "....oro.orroorro..oro...",
    "...orroorrrrrrrroorro...",
    "...orrrrrffrrfrrorrro...",
    "..orrfrrfffffffrrrfrro..",
    "..orrffffyyffyffrffrro..",
    ".orrffffyyyyyyyfffffrro.",
    ".orrffyyywwyywyyfyffrro.",
    ".orrffyywwwwwwwyyyffrro.",
] + FLARELET_A[11:]
CRUST_BOWL = [
    "..O....O....OO....O....O..",
    ".OkO..OkO..OkKO..OKO..OKO.",
    "OkkkOOkkKOOKKKKOOKKKOOKKDO",
    "Ok" + "K" * 21 + "DDO",
    "OKKc" + "K" * 16 + "cKKDDO",
    ".ODDc" + "K" * 14 + "cDDDDO.",
    ".." + "O" * 22 + "..",
]
FLARELET_A, FLARELET_B, FLARELET_C = (overlay([f".{r}." for r in flame], CRUST_BOWL, (0, 19))
                                      for flame in (FLARELET_A, FLARELET_B, FLARELET_C))
FLARELET_FACE_TOP = 6
FLARELET_TAGS = species_tags([FLARELET_A, FLARELET_B, FLARELET_C], 16, 12, idle_ms=160)

# ---------------------------------------------------------------- The stone line

# The pet that hatches from the stone egg: a river pebble. What its forms keep is the quartz band
# around its middle. The three colors of the band are its own: the code recolors them on the child
# as a hint at the adult form (LURES in core/src/scene.ts).
STONE_PALETTE = {
    "O": (70, 82, 108),    # outline: dark slate instead of black
    "D": (115, 128, 152),  # shadow
    "K": (155, 168, 190),  # base color
    "k": (192, 203, 220),  # lit
    "F": (232, 238, 248),  # highlight, the wet shine of a river pebble
    "q": (245, 238, 215),  # the quartz band
    "Q": (205, 192, 165),
    "x": (255, 252, 232),
    "c": (175, 160, 215),  # crystals; at night the code lights them up (GLOWS in core/src/scene.ts)
    "C": (130, 115, 180),
    "e": (220, 212, 245),
    "a": (205, 180, 150),  # the warmer stones of the cairn
    "A": (160, 135, 108),
    "b": (232, 214, 188),
    "s": (120, 200, 90),   # moss, Bouldergrin's accent
    "S": (70, 145, 60),
}

# Baby: the baby slime as a pebble, with a speck of quartz where the sprout would be
STONE_BABY = dots([r.translate(str.maketrans("odblh", "ODKkF")) for r in BABY_BODY],
                  {(7, 0): "x", (7, 1): "q", (6, 1): "q", (8, 1): "Q"})
STONE_BABY_TAGS = body_tags(STONE_BABY, 6, 8, flat_rows=3)

# Pebblet, the child: a smooth river pebble, wider than tall, with a white quartz band around its
# middle, on two stubby feet. A corner has chipped off at the top, which shows the lighter stone
# inside. The face sits above the band, centered on the feet (the chip makes the top lopsided).
# Column 13 is the one the poses get wider at.
PEBBLET = [
    "........OOOOOOOO..........",
    ".....OOOkkkkkKKKOO........",
    "...OOkFFkkkKKKKKKFOO......",
    "..OkFFkkKKKKKKKKKKFFOO....",
    ".OkFkkKKKKKKKKKKKKKFFFOO..",
    ".OkkKKKKKKKKKKKKKKKKkFFDO.",
    "OkkKKKKKKKKKKKKKKKKKKKKDDO",
    "OkKKKKKKKKKKKKKKKKKKKKKDDO",
    "OkKKKKKKKKKKKKKKKKKKKKKDDO",
    "OkKKKKKKKKKKKKKKKKKKKKKDDO",
    "OkKKKKKKKKKKKKKKKKKKKKKDDO",
    "OxqqqqqqqqqqqqqqqqqqqqqQQO",
    "OqqqxqqqqqqqqqqqqxqqqqqQQO",
    "OQQQQQQQQQQQQQQQQQQQQQQQQO",
    "OKKKKKKKKKKKKKKKKKKKKKKDDO",
    ".ODKKKKKKKKKKKKKKKKKKKDDO.",
    ".ODDDKKKKKKKKKKKKKKKDDDDO.",
    "..OODDDDDDDDDDDDDDDDDDOO..",
    "....OOOOOOOOOOOOOOOOOO....",
    ".....OkKDO......OkKDO.....",
    ".....OOOOO......OOOOO.....",
]
PEBBLET_FACE_TOP = 2
PEBBLET_TAGS = body_tags(PEBBLET, 8, 13)

# Glimmerock: the pebble has grown into a boulder that stands on its own feet, and its band into a
# crown of crystals that light up from inside at night. The band itself is still there, around its
# middle. It is polished and a little vain: one fist on its hip, the other hanging, and it looks out
# from under half-shut lids (GLIMMEROCK_EYES). Slate, quartz and the lilac of the crystals.
BOULDER = [
    ".......OOOOOOOOOO.......",
    "....OOOkkkkkkkKKKOOO....",
    "...OkFFkkkKKKKKKKKKDO...",
    "..OkFFkkKKKKKKKKKKKKDO..",
    ".OkFkkKKKKKKKKKKKKKKKDO.",
    ".OkFkKKKKKKKKKKKKKKKKDO.",
    "OkkkKKKKKKKKKKKKKKKKKDDO",
    "OkkKKKKKKKKKKKKKKKKKKDDO",
    "OkKKKKKKKKKKKKKKKKKKKDDO",
    "OkKKKKKKKKKKKKKKKKKKKDDO",
    "OkKKKKKKKKKKKKKKKKKKKDDO",
    "OxqqqqqqqqqqqqqqqqqqqQQO",
    "OqqqxqqqqqqqqqqqqxqqqQQO",
    "OQQQQQQQQQQQQQQQQQQQQQQO",
    "OKKKKKKKKKKKKKKKKKKKKDDO",
    ".OKKKKKKKKKKKKKKKKKKKDO.",
    ".ODKKKKKKKKKKKKKKKKKDDO.",
    "..ODDDKKKKKKKKKKKKDDDO..",
    "...OODDDDDDDDDDDDDDOO...",
    ".....OOOOOOOOOOOOOO.....",
]
CRYSTAL_TALL = ["..e..", ".ecC.", ".ecC."] + ["eccCC"] * 8
CRYSTAL_MID = [".e."] + ["ecC"] * 7
CRYSTAL_SHORT = [".e."] + ["ecC"] * 4
GLIMMEROCK_ARM_L = ["..OOO.", ".OkkKO", "OkKKDO", "OkKDO.", "OKKDO.", ".OKKDO", "..OKDO", "...OO."]  # on its hip
GLIMMEROCK_ARM_R = [".OO...", "OKDO..", "OKDO..", "OKKDO.", "OkKKDO", "OKKKDO", ".ODDO.", "..OO.."]
GLIMMEROCK_FOOT = ["..OOOOO.", ".OkKKKDO", "OkKKKKDO", "OOOOOOOO"]
GLIMMEROCK = overlay(["." * CANVAS] * CANVAS, narrow(narrow(BOULDER, 12), 12), (5, 9))
# The crown sits a little askew: the crystals on the right are longer
for part, (x, y) in ((CRYSTAL_TALL, (14, 0)), (CRYSTAL_MID, (10, 4)), (CRYSTAL_MID + ["ecC"], (20, 2)),
                     (CRYSTAL_SHORT, (6, 9)), (CRYSTAL_SHORT + ["ecC"], (24, 8)),
                     (GLIMMEROCK_ARM_L, (1, 16)), (GLIMMEROCK_ARM_R, (25, 17)),
                     (GLIMMEROCK_FOOT, (6, 28)), (GLIMMEROCK_FOOT, (18, 28))):
    GLIMMEROCK = behind(GLIMMEROCK, part, x, y)
# Breathing: the crystals twinkle, a spark moves from one tip to another
GLIMMEROCK_B = dots(GLIMMEROCK, {(16, 0): "c", (11, 4): "x", (7, 9): "c", (25, 8): "x"})
# Its spin is a show: the crystals flash (OWN_TRICKS in core/src/scene.ts)
GLIMMEROCK_SHINE = [r[:16].translate(str.maketrans("ecC", "xec")) + r[16:] if y < 14 else r
                    for y, r in enumerate(GLIMMEROCK)]
GLIMMEROCK_SHINE_B = [r[:16] + r[16:].translate(str.maketrans("ecC", "xec")) if y < 14 else r
                      for y, r in enumerate(GLIMMEROCK)]
GLIMMEROCK_FACE_TOP = 12
GLIMMEROCK_TAGS = species_tags([GLIMMEROCK, GLIMMEROCK_B], 19, 15, idle_ms=900)
# It walks, slow and heavy, as a boulder would
GLIMMEROCK_TAGS["walk"] = walk_tags(GLIMMEROCK, 19, range(6, 14), range(18, 26), 29, ms=(260, 160))
GLIMMEROCK_TAGS["shine"] = [(GLIMMEROCK_SHINE, 120), (GLIMMEROCK_SHINE_B, 120)]

# Bouldergrin: a cairn that came alive. The middle stone wears the quartz band and a wide, toothy
# grin; the stones at the bottom are its feet, two pebbles are its fists (one raised, as if it waved),
# and the little stone on top wears a cap of moss pulled to one side. It is easy-going and hard to
# upset. It wobbles: the top stone sways, but nothing ever falls. Slate, sandstone and moss.
CAIRN_TOP = [
    ".sssOO.",
    "sSsSbaO",
    "OSaaaAO",
    "OaaaaAO",
    ".OOOOO.",
]
CAIRN_MIDDLE = [
    "....OOOOOOOOOOOOOO....",
    "..OOkkkkKKKKKKKKKKOO..",
    ".OkFkkKKKKKKKKKKKKKDO.",
    "OkkKKKKKKKKKKKKKKKKKDO",
    "OkKKKKKKKKKKKKKKKKKKDO",
    "OkKKKKKKKKKKKKKKKKKKDO",
    "OkKKKKKKKKKKKKKKKKKKDO",
    "OkKKKKKKKKKKKKKKKKKKDO",
    "OkKKKKKKKKKKKKKKKKKKDO",
    "OkKKKKKKKKKKKKKKKKKKDO",
    "OkKKKKKKKKKKKKKKKKKKDO",
    "OxqqqqqqqqqqqqqqqqxqQO",
    "OQQQQQQQQQQQQQQQQQQQQO",
    ".ODDKKKKKKKKKKKKKKDDO.",
    "..OODDDDDDDDDDDDDDOO..",
    "....OOOOOOOOOOOOOO....",
]
CAIRN_FOOT = [
    "..OOOOOOO..",
    ".ObbaaaaAO.",
    "ObaaaaaaAAO",
    "OAaaaaaaAAO",
    ".OOOOOOOOO.",
]
CAIRN_FIST = [".OOO.", "ObbaO", "OaaAO", "OAAAO", ".OOO."]


def cairn(top_dx=0, lift=0, flipped=False):
    """Bouldergrin; the top stone shifted sideways by `top_dx` pixels, or lifted `lift` pixels and
    perhaps upside down (when it tosses it)."""
    grid = overlay(["." * CANVAS] * CANVAS, CAIRN_MIDDLE, (5, 12))
    for part, at in (((CAIRN_TOP[::-1] if flipped else CAIRN_TOP), (12 + top_dx, 8 - lift)),
                     (dots(CAIRN_FOOT, {(5, 2): "s", (6, 2): "S"}), (5, 27)), (CAIRN_FOOT, (16, 27)),
                     (CAIRN_FIST, (1, 13)), (CAIRN_FIST, (26, 20))):
        grid = behind(grid, part, *at)
    return grid


BOULDERGRIN, BOULDERGRIN_LEFT, BOULDERGRIN_RIGHT = cairn(), cairn(-1), cairn(1)
BOULDERGRIN_FACE_TOP = 2  # on the middle stone, above the band
BOULDERGRIN_TAGS = species_tags([BOULDERGRIN_LEFT, BOULDERGRIN, BOULDERGRIN_RIGHT, BOULDERGRIN], 18, 15,
                                idle_ms=500)
# It walks on its bottom stones
BOULDERGRIN_TAGS["walk"] = walk_tags(BOULDERGRIN, 18, range(5, 16), range(16, 27), 28, ms=(220, 140))
# Its flip: it tosses its top stone, which turns over in the air and lands back on top (OWN_TRICKS
# in core/src/scene.ts)
BOULDERGRIN_TAGS["toss_low"] = [(cairn(lift=4), 1000)]
BOULDERGRIN_TAGS["toss_high"] = [(cairn(lift=8, flipped=True), 1000)]

# ---------------------------------------------------------------- The fox line

# The pet that hatches from the fox egg: a fox cub, round as a slime. What its forms keep is the
# bushy tail that curls up to a white tip. The two colors of the tip are its own: the code
# recolors them on the child as a hint at the adult form (LURES in core/src/scene.ts).
FOX_PALETTE = {
    "o": (105, 38, 18),    # outline: dark russet instead of black
    "d": (205, 88, 36),    # shadow
    "b": (240, 128, 50),   # fur
    "l": (255, 170, 92),   # lit
    "h": (255, 218, 172),  # highlight
    "c": (255, 242, 220),  # cream: belly, the insides of the ears, cheek fluff
    "C": (225, 195, 160),
    "n": (70, 32, 22),     # the dark tips of the ears, the paws
    "t": (255, 255, 250),  # the white tip of the tail
    "T": (225, 225, 215),
    "G": (20, 95, 95),     # Roamtail's scarf, turquoise
    "g": (40, 150, 140),
    "j": (120, 215, 195),
    "K": (110, 65, 35),    # its walking stick of knotty wood
    "m": (195, 140, 85),
    "M": (230, 200, 120),
    "x": (38, 28, 44),     # Filchfox's bandit mask
    "X": (78, 62, 92),
}

# Baby: the baby slime with two pointed ears instead of the sprout, dark ear tips, a cream chest,
# and the right ear bent a little
FOX_BABY = [
    "..nn.......nn...",
    "..onn.....nno...",
    "..olbo....obdo..",
    "..olhboooobbdo..",
    ".ollhhlbbbbbbdo.",
    ".ollhbbbbbbbbdo.",
    ".olbbbbbbbbbbdo.",
    "olbbbbbbbbbbbddo",
    "olbbbbbccbbbbddo",
    "obbbbbccccbbbddo",
    "odbbbbccccbbdddo",
    "oddddddddddddddo",
    ".oooooooooooooo.",
]
FOX_BABY_TAGS = body_tags(FOX_BABY, 7, 8, flat_rows=3)

# Kitlet, the child: a fox cub as round as a slime, with ears, a cream belly that is its muzzle as
# well, paws, and a bushy tail behind it that curls up to a white tip. The face sits on the body,
# not between it and the tail (faceCenter "left": the tail stands apart from it). Column 9 is the
# one the poses get wider at; row 15 the one they get shorter at, below the face.
KITLET = [
    "..nn........nn..............",
    "..onn......nno.......otto...",
    "..olbo....obdo......otttTo..",
    "..olhbooooobddo....ottttTTo.",
    ".ollhhlbbbbbbbdo...obtttTbo.",
    ".ollhbbbbbbbbbbdo..obbbbbbdo",
    "ollhbbbbbbbbbbbbdo.obbbbbbdo",
    "olhbbbbbbbbbbbbbdo.obbbbbddo",
    "olbbbbbbbbbbbbbbddoobbbbbddo",
    "olbbbbbbbbbbbbbbbdo.obbbbddo",
    "obbbbbbbbbbbbbbbbddoobbbbddo",
    "obbbbbbccccccbbbbddoobbbddo.",
    "obbbbbccccccccbbbddobbbbddo.",
    "obbbbcccccccccCbbddbbbbddo..",
    "odbbbccccccccCCbbddbbbddo...",
    "odbbbbccccccCCbbbdddddoo....",
    "oddbbbbcccCCCbbbbddddo......",
    ".odddddddddddddddddoo.......",
    "..oooonnnooooonnnooo........",
    "....onnno....onnno..........",
    "....ooooo....ooooo..........",
]
KITLET_FACE_TOP = 5
KITLET_TAGS = body_tags(KITLET, 15, 9)

# The grown fox: the child's body, larger, with cheek fluff, and the tail behind it on the right.
FOX_ADULT = [
    ".nn..............nn..",
    ".nnn............nnn..",
    ".onnn..........nnno..",
    ".olcbo........obcdo..",
    ".olccbo......obccdo..",
    ".olhccboooooobccbddo.",
    "ollhhlbbbbbbbbbbbbddo",
    "olhhlbbbbbbbbbbbbbbdo",
    "olhbbbbbbbbbbbbbbbbdo",
    "olbbbbbbbbbbbbbbbbbdo",
    "olbbbbbbbbbbbbbbbbbdo",
] + ["obbbbbbbbbbbbbbbbbddo"] * 5 + [
    "obbbbbccccccbbbbbbddo",
    "obbbbccccccccbbbbbddo",
    "odbbbcccccccCbbbbbddo",
    "odbbbbcccccCCbbbbdddo",
    "oddbbbbcccCCbbbbdddo.",
    ".oddddddddddddddddoo.",
    "..oooonnnooonnnooo...",
    "....onnno...onnno....",
    "....ooooo...ooooo....",
]
FOX_TAIL = [
    "..otto..",
    ".otttTo.",
    "ottttTTo",
    "otttttTo",
    "obttttTo",
] + ["obbbbbdo"] * 3 + ["obbbbddo"] * 4 + ["obbbddo."] * 2 + ["bbbddo..", "bbddo...", "ddoo...."]
FOX_ADULT_H = 26  # the adults are drawn on a grid this tall and CANVAS wide, in columns 1–30


def fox_adult(parts):
    """An adult of the fox line: `parts` as (drawing, (x, y)), each one laid over the ones before."""
    grid = ["." * CANVAS] * FOX_ADULT_H
    for part, at in parts:
        grid = overlay(grid, part, at)
    return grid


def face_top(grid, row):
    """faceTop for a face that is to start at row `row`: counted, as the scene does
    (faceAnchor in core/src/sprites.ts), from the first row that is at least 8 pixels wide."""
    return row - next(y for y, r in enumerate(grid) if len(r) - r.count(".") >= 8)


# Roamtail: the fox that has seen the world. A turquoise scarf wraps round its neck, sags in the
# middle, and one end blows out behind it in the wind; in the paw on the front side a knotty
# walking stick with a ribbon of the scarf tied round it. No backpack: on a trip the game's own
# hangs at its lower back. Calm and friendly (ROAMTAIL_EYES). Russet, cream and turquoise.
ROAMTAIL_X = 4  # left edge of the body
ROAMTAIL_STICK = ["..oo..", ".ommo.", "omMmKo", "omMmKo", ".ommo.", ".GjgG.", ".GggG.", "..oMKo", "..Gg..",
                  "..omKo"] + ["..omKo"] * 12 + ["..ooo."]
ROAMTAIL_PAW = [".oooo..", "obbbbo.", "obhbbdo", "obbbddo", ".ooooo."]
SCARF_END = ["..GGGG.", ".GgjjgG", "GgggggG", "GgGgGG.", "G.G.G.."]
SCARF_END_B = ["..GGGG.", ".GgjjgG", "GgggggG", ".GgGgGG", ".G.G.G."]  # the fringe flutters


def roamtail(scarf_end=SCARF_END):
    x = ROAMTAIL_X
    grid = fox_adult([(FOX_TAIL, (x + 19, 3)), (FOX_ADULT, (x, 1)),
                      (["o.", "co", "oc", ".o"], (x - 1, 10)), ([".o", "oc", "co", "o."], (x + 20, 10))])
    # the scarf wraps round the neck, a little wider than the body, and sags in the middle
    rows = [list(r) for r in grid]
    for i in range(-1, 22):
        top = 14 + (2 if 6 <= i <= 14 else 1 if 3 <= i <= 17 else 0)
        rows[top][x + i] = "G"
        rows[top + 1][x + i] = "j" if 0 <= i < 4 or 7 <= i < 10 else "g"
        rows[top + 2][x + i] = "g"
        rows[top + 3][x + i] = "G"
    # the end that blows out behind it, and the stick, which leaves the white tip of the tail free
    return fox_adult([(["".join(r) for r in rows], (0, 0)), (scarf_end, (x - 3, 12)),
                      (ROAMTAIL_STICK, (x + 16, 1)), (ROAMTAIL_PAW, (x + 15, 13))])


ROAMTAIL, ROAMTAIL_B = roamtail(), roamtail(SCARF_END_B)
ROAMTAIL_FACE_TOP = face_top(ROAMTAIL, 9)  # the scarf right under its chin
ROAMTAIL_TAGS = species_tags([ROAMTAIL, ROAMTAIL_B], 21, 14, idle_ms=600)
# It walks: a fox on the road
ROAMTAIL_TAGS["walk"] = walk_tags(ROAMTAIL, 21, range(8, 13), range(16, 21), 24)

# Filchfox: the fox that has got up to mischief. A dark bandit mask with holes for the eyes, tied
# at the back with ends that flutter, an ear bent over and a ruffled tuft, scruffy cheeks, a ruffle
# on its flank and a ragged tip on its tail. Cheeky (FILCHFOX_EYES). Russet, cream and the mask.
FILCHFOX_X = 3  # left edge of the body
FILCHFOX_HEAD = [
    ".nn..................",
    ".nnn.......o.o.......",
    ".onnn.....obobo......",
    ".olcbo....obbbo.oo...",
    ".olccbo...obbo.obdoo.",
    ".olhccboooobbooobbdnno",
]
FILCHFOX_TAIL = [
    "o.o.o...",
    "otototo.",
    "ottttTo.",
    ".otttTTo",
    "otttttTo",
    "obttttTo",
    "obbbbbdo",
    ".obbbbdo",
    "obbbbbdo",
    "obbbbddo",
    ".obbbddo",
    "obbbbddo",
    "obbbbddo",
    "obbbddo.",
    "obbbddo.",
    "bbbddo..",
    "bbddo...",
    "ddoo....",
]
# The mask: two lobes round the eyes, joined over the nose; the holes show the fur, and the eyes
# of FILCHFOX_EYES sit in them (rows 11 and 12 of the grid)
BANDIT_MASK = [
    "XXXXXXXXXXXXXXXXXXXXX",
    "xxxxxxxxxxxxxxxxxxxxx",
    "xxxbbbbxxxxxxxbbbbxxx",
    "xxxbbbbxxxxxxxbbbbxxx",
    ".xxxxxxxx.xxxxxxxxxx.",
    "..xxxxxx...xxxxxxx...",
]
MASK_TIES = [(["xx..", "xXxx", ".xxX", "..xx"], (0, 8)), (["xx..", "Xxxo", "oxXx", "..ox"], (0, 12))]
MASK_TIES_B = [(["....", "xXxx", "xxxX", "..xx"], (0, 8)), (["xx..", "XxxX", "oxxx", "..o."], (0, 12))]


def filchfox(ties=MASK_TIES):
    x = FILCHFOX_X
    body = [r.ljust(22, ".") for r in FILCHFOX_HEAD + FOX_ADULT[6:]]
    return fox_adult([(FILCHFOX_TAIL, (x + 20, 2)), (body, (x, 1)),
                      ([".o", "oc", ".o", "oc", ".o"], (x - 1, 14)), (["o.", "co", "o.", "co", "o."], (x + 20, 14)),
                      (BANDIT_MASK, (x, 9))]
                     # the ties, a little shorter than drawn, so that it fits the frame
                     + [(part, (left + x - 2, top)) for part, (left, top) in ties]
                     + [(["xo", "xx"], (x - 1, 10)), (["l.l", ".l."], (x + 3, 17))])


FILCHFOX, FILCHFOX_B = filchfox(), filchfox(MASK_TIES_B)
FILCHFOX_FACE_TOP = face_top(FILCHFOX, 11)  # the eyes in the holes of the mask
FILCHFOX_TAGS = species_tags([FILCHFOX, FILCHFOX_B], 21, 13, idle_ms=500)
# It walks, a little sideways, as a fox does that is up to something
FILCHFOX_TAGS["walk"] = walk_tags(FILCHFOX, 21, range(7, 12), range(15, 20), 24, ms=(160, 100))

# ---------------------------------------------------------------- The cloud line

# The pet that hatches from the cloud egg: a lamb whose fleece is a cloud. What its forms keep is
# the fleece: white and fluffy on the child, a storm cloud or a fair-weather cloud on the adults.
# The two colors of the child's bell are its own: the code recolors them as a hint at the adult
# form (LURES in core/src/scene.ts).
CLOUD_PALETTE = {
    "o": (60, 88, 150),    # outline: dark sky blue instead of black
    "d": (110, 150, 215),  # shadow
    "b": (150, 190, 245),  # sky blue: the face, the baby
    "l": (190, 220, 255),  # lit
    "h": (230, 242, 255),  # highlight
    "f": (250, 252, 255),  # the cloud fleece
    "F": (205, 215, 240),  # its shadow
    "n": (80, 90, 130),    # the legs
    "r": (235, 95, 120),   # Nimbit's ribbon
    "y": (255, 215, 70),   # and its bell
    "Y": (215, 160, 40),
}

# Baby: the baby slime with a puff of cloud fleece on top instead of the sprout; the fringe hangs
# to the left, and two dark lamb's feet peek out underneath
CLOUD_BABY = [
    "....ff.fff......",
    "...fffffffff....",
    "..ffFfffffFff...",
    ".ffoFllbbFFofo..",
    ".fohhlbbbbbbdo..",
    ".ollhbbbbbbbbdo.",
    ".olbbbbbbbbbbdo.",
    "olbbbbbbbbbbbddo",
    "olbbbbbbbbbbbddo",
    "obbbbbbbbbbbbddo",
    "odbbbbbbbbbbdddo",
    "oddddddddddddddo",
    ".oonnooooooonno.",
]
CLOUD_BABY_TAGS = body_tags(CLOUD_BABY, 7, 8, flat_rows=3)

# Nimbit, the child: a lamb whose fleece is a cloud. The fleece covers its head and its back, the
# sky-blue face peeks out in front, the left ear flips up, four stubby legs, a puff of a tail on
# the right, and a yellow bell on a pink ribbon. Row 10 is the one the poses get shorter at, column
# 9 the one they get wider at.
NIMBIT = [
    ".......fff...fff.........",
    ".....ofhhff.fffffo.......",
    "....ofhhffffffffffo......",
    "...ofhfffffffffffFfo.....",
    "..offfffffffffffffFFo....",
    ".obbofffffffffffffFFfo...",
    "obllbbbbbbbbbbbbofffFFo..",
    "obhlbbbbbbbbbbbbbofffFfo.",
    ".oobbbbbbbbbbbbbbboffFFFo",
    "...obbbbbbbbbbbbbdbofFFfo",
    "...obbbbbbbbbbbbbddofffFo",
    "...obbbbbbbbbbbbbddoffFFo",
    "...obbbbbbbbbbbbddoffFFo.",
    "...oodbbbbbbbbbdddoffFFFo",
    "..offodddrrrrdddofffFFFo.",
    "..offFFoooryYrooffFFFFoo.",
    "..oFFFFFFFoYYoFFFFFFoo...",
    "...ooonnoooooooonnooo....",
    ".....onno......onno......",
    ".....oooo......oooo......",
]
NIMBIT_FACE_TOP = face_top(NIMBIT, 6)  # on the top row of its face, right under the fleece
NIMBIT_TAGS = body_tags(NIMBIT, 10, 9, flat_rows=3)

# Rumblefluff: Nimbit grown into a thundercloud ram. The fleece is a dark storm cloud piled high,
# light where the sun still catches its top, with a lock of it hanging over its brow; the face is
# a stern slate-blue ram's face with a pale muzzle. Its horns are two golden ram's curls that end
# in a zigzag bolt; the right one is bigger and forks, with a spark on top. Sturdy legs with dark
# hooves. It walks. Slate, storm gray and lightning gold.
RUMBLEFLUFF_PALETTE = {
    "o": (45, 52, 95),     # outline
    "f": (165, 175, 210),  # the storm cloud
    "F": (115, 125, 168),  # its underside
    "h": (215, 222, 242),  # where the light still catches it
    "b": (125, 150, 210),  # the face
    "l": (170, 195, 240),  # lit, the muzzle
    "d": (85, 105, 165),   # shadow
    "n": (40, 42, 70),     # legs and hooves
    "y": (255, 225, 60),   # the lightning horns
    "Y": (230, 150, 30),
    "w": (255, 255, 255),  # the spark
}
RUMBLEFLUFF = [
    "..............ooo...............",
    "............oohffoo.............",
    "...........ohhhhfffo............",
    "..........ohhhhhhfffoooo........",
    ".......ooohhhhhhhffhhhhho.......",
    ".....oohffhhhhhhhfhhhhhhow......",
    "....ohyyyyfhhhhhffhhhhfyyyy.....",
    "....oyyYYyyfhhhfhfhhhhyyYYyy....",
    "...oyyYhhYyffffffffohhyYfFYyy...",
    "...oyYhhfffffffbffbboffffFFYy...",
    "...oyYfdffoblhlbbbbbdofdfFFYyo..",
    "....yyYfdfobllbbbbbbdodffFYyyo..",
    "..oofyyYyfobbbbbbbbbdoffyYyyFFo.",
    "..offffyYfobbbbbbbbbdoffYyFFFYo.",
    ".offffyYffobbbbbbbbbdofffYyFFyo.",
    ".offfffYfffobbbbbbbdoffffYFYyo..",
    ".oFFFFFFFFFollllllldoFFFFFFFFo..",
    "..oFFFFFFFFolllllllddoFFFFFFFo..",
    "..oFFFFFFFFFoddddddoFFFFFFFFFo..",
    "...oFFFFFFFFFooooooFFFFFFFFFo...",
    "....oFFFFFFFFFFFFFFFFFFFFFFFo...",
    "....oFFFFFFFFFFFFFFFFFFFFFFFo...",
    ".....ooooooooooooooooooooooo....",
    ".......nn...nn.....nn...nn......",
    ".......nn...nn.....nn...nn......",
    "......oooo.oooo...oooo.oooo.....",
]
RUMBLEFLUFF_FACE_TOP = face_top(RUMBLEFLUFF, 11)  # the eyes under its brow
RUMBLEFLUFF_FACE_SHIFT = -1  # its bigger horn makes the row wider on the right than the head
RUMBLEFLUFF_TAGS = species_tags([RUMBLEFLUFF, dots(RUMBLEFLUFF, {(25, 5): "."})], 20, 16)  # the spark flickers
# It walks, heavily, as a ram does
RUMBLEFLUFF_TAGS["walk"] = walk_tags(RUMBLEFLUFF, 20, range(6, 15), range(18, 28), 23, ms=(240, 140))

# Prismist: Nimbit grown into an airy fair-weather ewe. The fleece is a light, sunlit cloud with
# a warm blush underneath; the face is Nimbit's sky blue, gentle, with lashes; a rainbow arches
# over its back, from a sparkle behind its head down to its tail. The ears hang, the right one
# lower; it still wears Nimbit's bell on its ribbon; dainty legs. It walks. White, sky blue and
# the rainbow.
PRISMIST_PALETTE = {
    "o": (70, 95, 160),    # outline
    "f": (252, 252, 255),  # the cloud
    "F": (220, 222, 245),  # its shadow
    "p": (255, 205, 220),  # the blush of evening underneath
    "b": (150, 190, 245),  # the face
    "l": (195, 222, 255),  # lit, the muzzle
    "h": (230, 242, 255),  # highlight
    "d": (110, 150, 215),  # shadow, the ears
    "n": (80, 90, 130),    # the legs
    "r": (235, 95, 120),   # ribbon
    "y": (255, 215, 70),   # bell
    "Y": (215, 160, 40),
    "w": (255, 255, 255),  # the sparkle
    "1": (240, 80, 90), "2": (255, 165, 60), "3": (255, 225, 80),  # the rainbow, from the outside in
    "4": (110, 210, 120), "5": (90, 160, 245), "6": (170, 120, 230),
}
PRISMIST = [
    "................................",
    ".........w......................",
    "........www...1111111...........",
    ".........w.1112222222111........",
    "...........12233333332211.......",
    "...........2334444444332211.....",
    ".........oof4445555544433211....",
    ".......oofffff56fff655543321....",
    "......offffffffooofff65543321...",
    "......offobffbbbbbofo.off43211..",
    ".....offoblhlbbbbbdofofffFF321..",
    ".....odfobllbbbbbbdofffffFF321..",
    ".....dffobbbbbbbbbdodffffFFF321.",
    ".....dffobbbbbbbbbdofdfffFFF321.",
    ".....offfobbbbbbbdoffdfffFFo....",
    ".....offfobllllbbdoffdfffFFo....",
    "....offfffolllldoffffffffFFFo...",
    "....offffffooooffffffffffFFFo...",
    "....offffffffffffffffffffFFFo...",
    "....oFFFFFrrrrrrrrFFFFFFFFFFo...",
    ".....oFFFFFFFyYFFFFFFFFFFFFo....",
    ".....oFFppppppYppppppppFFFo.....",
    "......oooooooooooooooooooo......",
    ".........nn..nn....nn..nn.......",
    ".........nn..nn....nn..nn.......",
    ".........oo..oo....oo..oo.......",
]
PRISMIST_FACE_TOP = face_top(PRISMIST, 11)  # the eyes
PRISMIST_FACE_SHIFT = -4  # its fleece and the rainbow behind it reach further right than the head
PRISMIST_TAGS = species_tags([PRISMIST, dots(PRISMIST, {(9, 1): ".", (8, 2): ".", (10, 2): ".", (9, 3): "."})], 18, 13)  # the sparkle twinkles
# It walks, lightly
PRISMIST_TAGS["walk"] = walk_tags(PRISMIST, 18, range(8, 16), range(18, 27), len(PRISMIST) - 3, ms=(180, 110))

# ---------------------------------------------------------------- Faces

FACE_PALETTE = {
    "w": (235, 245, 255),  # white of the eye
    "p": (25, 35, 85),     # pupil / closed eye
    "g": (255, 255, 255),  # highlight in the eye
    "d": (22, 150, 150),   # eyelid (body shadow)
    "m": (12, 80, 88),     # mouth
    "r": (175, 40, 70),    # inside of the open mouth
    "k": (255, 120, 150),  # rosy cheeks
}

# Eyes 4×5, as (left, right)
EYES = {
    "open": ([".ww.", "wgpw", "wppw", "wppw", ".ww."],) * 2,
    "closed": (["....", "....", "....", "pppp", "...."],) * 2,
    "happy": (["....", ".pp.", "p..p", "....", "...."],) * 2,
    "half": (["....", "....", "dddd", "wgpw", ".ww."],) * 2,
    "sad": (["p...", ".ww.", "wgpw", "wppw", ".ww."], ["...p", ".ww.", "wgpw", "wppw", ".ww."]),
    "cross": (["...p", "..pw", "wgpw", "wppw", ".ww."], ["p...", "wp..", "wgpw", "wppw", ".ww."]),
}
# Mouths 4×2 (center of the face)
MOUTHS = {
    "none": ["....", "...."],
    "small": ["m..m", ".mm."],
    "flat": ["....", ".mm."],
    "sad": [".mm.", "m..m"],
    "open": [".mm.", "mrrm"],
    "laugh": ["mmmm", "mrrm"],
    "chew": ["....", "mmmm"],
}
FACES = {  # name: (eyes, mouth, rosy cheeks)
    "normal": ("open", "small", False),
    "smile": ("open", "small", True),
    "blink": ("closed", "small", False),
    "happy": ("happy", "small", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("half", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
FACE_W, FACE_H = 16, 8

# Baby: eyes 3×3, face 10×5 (mouths as above)
BABY_EYES = {
    "open": ([".w.", "wgp", "wpp"],) * 2,
    "closed": (["...", "...", "ppp"],) * 2,
    "happy": (["...", ".p.", "p.p"],) * 2,
    "half": (["...", "ddd", "wpp"],) * 2,
    "sad": (["p..", "wgp", "wpp"], ["..p", "wgp", "wpp"]),
    "cross": (["..p", "wgp", "wpp"], ["p..", "wgp", "wpp"]),
}
BABY_W, BABY_H = 10, 5

# Dark faces for light bodies (Lumoth, the ember adults)
DARK_FACE_PALETTE = {"p": (55, 22, 20), "g": (255, 255, 255), "m": (55, 22, 20), "r": (190, 45, 60),
                     "k": (255, 120, 150), "d": (55, 22, 20), "w": (255, 255, 255)}

# Glimmerock: dark eyes (4×4) with a glint of crystal instead of a white one. It is polished and
# knows it: its normal look is from under half-shut lids, with a smug little smile on one side
# (mouths 6×2). Face 16×7.
GLIMMEROCK_EYES = {  # (left, right)
    "open": ([".pp.", "pcpp", "pppp", ".pp."], [".pp.", "ppcp", "pppp", ".pp."]),
    "proud": (["....", "pppp", "pcpp", ".pp."], ["....", "pppp", "ppcp", ".pp."]),
    "half": (["....", "....", "pppp", ".pp."],) * 2,
    "closed": (["....", "....", "....", "pppp"],) * 2,
    "happy": ([".pp.", "p..p", "....", "...."],) * 2,
    "sad": (["p...", ".pp.", "pcpp", ".pp."], ["...p", ".pp.", "ppcp", ".pp."]),
    "cross": (["...p", "..pp", "pcpp", ".pp."], ["p...", "pp..", "ppcp", ".pp."]),
}
GLIMMEROCK_MOUTHS = {
    "none": ["......", "......"],
    "smug": ["....m.", ".mmm.."],
    "small": ["m....m", ".mmmm."],
    "flat": ["......", ".mmmm."],
    "sad": [".mmmm.", "m....m"],
    "open": ["..mm..", ".mrrm."],
    "laugh": ["mmmmmm", ".mrrm."],
    "chew": ["......", "mmmmmm"],
}
GLIMMEROCK_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("proud", "smug", False),
    "smile": ("open", "small", True),
    "blink": ("closed", "smug", False),
    "happy": ("happy", "small", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert GLIMMEROCK_FACES.keys() == FACES.keys()
GLIMMEROCK_FACE_PALETTE = {"p": (45, 35, 75), "m": (45, 35, 75), "c": (215, 195, 255), "r": (190, 45, 60),
                           "k": (255, 130, 160)}

# Cyclopuff: one big eye (10×7) with an amber iris, a brow on top of it for the strong feelings,
# and its own mouths (6×3) with a snaggletooth. Face 16×11. Its normal look is relaxed, the lid
# halfway down; wide open is for when something good is coming.
CYCLOPS = {
    "open": ["..wwwwww..", ".wwwaaaww.", "wwwaAppaww", "wwwagppaww", "wwwaAppaww", ".wwwaaaww.", "..wwwwww.."],
    "relaxed": ["..........", "..........", "mmmmmmmmmm", "wwwagppaww", "wwwaAppaww", ".wwwaaaww.", "..wwwwww.."],
    "half": ["..........", "..........", "..........", "mmmmmmmmmm", "wwwaAppaww", ".wwwaaaww.", "..wwwwww.."],
    "closed": ["..........", "..........", "..........", "m........m", ".mm....mm.", "...mmmm...", ".........."],
    "happy": ["..........", "..........", "...mmmm...", ".mm....mm.", "m........m", "..........", ".........."],
    "sad": ["..........", ".wwwwwwww.", "wwwwwwwwww", "wwwaaawwww", "wwaAppawww", ".wagppaww.", "..wwwwww.."],
}
CYCLOPS_BROWS = {
    "none": ["..........", ".........."],
    "sad": ["...mmmm...", ".mm....mm."],
    "cross": [".m......m.", "..mmmmmm.."],
    "up": ["..mmmmmm..", ".........."],
}
CYCLOPS_MOUTHS = {
    "none": ["......", "......", "......"],
    "small": ["m....m", ".mmmm.", "..f..."],
    "flat": ["......", ".mmmm.", "..f..."],
    "sad": ["......", ".mmmm.", "m....m"],
    "open": [".mmmm.", "mfrrrm", ".mmmm."],
    "laugh": ["mmmmmm", "mfrrrm", ".mrrm."],
    "chew": ["......", "mmmmmm", "..f..."],
}
CYCLOPUFF_FACES = {  # name (as in FACES): (eye, brow, mouth, rosy cheeks)
    "normal": ("relaxed", "none", "small", False),
    "smile": ("open", "none", "small", True),
    "blink": ("closed", "none", "small", False),
    "happy": ("happy", "none", "small", True),
    "laugh": ("happy", "none", "laugh", True),
    "sad": ("sad", "sad", "sad", False),
    "tired": ("half", "none", "flat", False),
    "yawn": ("closed", "none", "open", False),
    "sick": ("half", "sad", "sad", False),
    "no": ("half", "cross", "flat", False),
    "eat_open": ("open", "up", "open", False),
    "eat_closed": ("happy", "none", "chew", False),
    "sleep": ("closed", "none", "none", False),
}
assert CYCLOPUFF_FACES.keys() == FACES.keys()
CYCLOPUFF_FACE_PALETTE = FACE_PALETTE | {"m": (60, 25, 90), "a": (245, 175, 60), "A": (200, 115, 40),
                                         "f": (250, 235, 205)}
# Flicker: cheeky eyes (4×5) – bored, it looks out from under half-shut lids; otherwise its brows
# go up at the outer ends. A crooked smirk, and it sticks its tongue out when it laughs or winks
# (6×4). Face 16×9.
FLICKER_EYES = {  # (left, right)
    "open": ([".p..", "pppp", "pgpp", "pppp", ".pp."], ["..p.", "pppp", "ppgp", "pppp", ".pp."]),
    "sly": (["....", "pppp", "pgpp", "pppp", "...."], ["....", "pppp", "ppgp", "pppp", "...."]),
    "half": (["....", "....", "pppp", "pgpp", ".pp."], ["....", "....", "pppp", "ppgp", ".pp."]),
    "closed": (["....", "....", "....", "pppp", "...."],) * 2,
    "happy": (["....", ".pp.", "p..p", "....", "...."],) * 2,
    "wink": ([".p..", "pppp", "pgpp", "pppp", ".pp."], ["....", "....", "pppp", "....", "...."]),
    "sad": (["..pp", "....", "pgpp", "pppp", ".pp."], ["pp..", "....", "ppgp", "pppp", ".pp."]),
    "cross": (["...p", "..pp", "pgpp", "pppp", ".pp."], ["p...", "pp..", "ppgp", "pppp", ".pp."]),
}
FLICKER_MOUTHS = {
    "none": ["......", "......", "......", "......"],
    "smirk": ["......", ".....p", "pp.pp.", "..p..."],
    "grin": ["......", "p....p", ".pppp.", "......"],
    "flat": ["......", "......", ".pppp.", "......"],
    "sad": ["......", "..pp..", ".p..p.", "......"],
    "open": ["......", "..pp..", ".prrp.", "..pp.."],
    "blep": ["......", "pppppp", "..kk..", "..kk.."],
    "chew": ["......", "......", ".pppp.", "......"],
}
FLICKER_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("sly", "smirk", False),
    "smile": ("open", "grin", False),
    "blink": ("closed", "smirk", False),
    "happy": ("happy", "grin", True),
    "laugh": ("wink", "blep", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert FLICKER_FACES.keys() == FACES.keys()
FLICKER_FACE_PALETTE = {"p": (30, 60, 70), "g": (255, 255, 255), "k": (255, 120, 150), "r": (200, 50, 70)}

# Lumoth: big, glossy dark moth eyes (4×5) with two highlights, set wide apart, and a little ω
# mouth (6×2). Face 16×7. It is the cuddly one: rosy cheeks whenever it is content.
LUMOTH_EYES = {  # (left, right)
    "open": ([".pp.", "pgpp", "pppp", "ppgp", ".pp."],) * 2,
    "half": (["....", "pppp", "pgpp", "pppp", ".pp."],) * 2,
    "closed": (["....", "....", "....", "p..p", ".pp."],) * 2,
    "happy": (["....", ".pp.", "p..p", "....", "...."],) * 2,
    "sad": (["p...", ".pp.", "pgpp", "pppp", ".pp."], ["...p", ".pp.", "ppgp", "pppp", ".pp."]),
    "cross": (["....", "p..p", ".pp.", ".pp.", "p..p"],) * 2,
}
LUMOTH_MOUTHS = {
    "none": ["......", "......"],
    "small": ["m.mm.m", ".m..m."],
    "flat": ["......", "..mm.."],
    "sad": ["..mm..", ".m..m."],
    "open": ["..mm..", ".mrrm."],
    "laugh": [".mmmm.", ".mrrm."],
    "chew": ["......", ".mmmm."],
}
LUMOTH_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("open", "small", True),
    "smile": ("open", "small", True),
    "blink": ("closed", "small", True),
    "happy": ("happy", "small", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", True),
    "sleep": ("closed", "none", False),
}
assert LUMOTH_FACES.keys() == FACES.keys()

# Angloop: the child's round eyes, and the wide mouth of an anglerfish with two little fangs
# (8×3). Face 16×8.
ANGLOOP_MOUTHS = {
    "none": ["........", "........", "........"],
    "grin": ["m......m", ".mmmmmm.", "..f..f.."],
    "small": ["........", "m......m", ".mmmmmm."],
    "flat": ["........", ".mmmmmm.", "..f..f.."],
    "sad": ["........", ".mmmmmm.", "m......m"],
    "open": [".mmmmmm.", "mfrrrrfm", ".mmmmmm."],
    "laugh": ["mmmmmmmm", "mfrrrrfm", ".mrrrrm."],
    "chew": ["........", "mmmmmmmm", "..f..f.."],
}
ANGLOOP_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("open", "grin", False),
    "smile": ("open", "grin", True),
    "blink": ("closed", "grin", False),
    "happy": ("happy", "small", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("half", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert ANGLOOP_FACES.keys() == FACES.keys()
ANGLOOP_FACE_PALETTE = FACE_PALETTE | {"f": (255, 255, 255)}

# Purrloop: cat eyes (5×5), amber with a slit; its normal look is the slow blink a cat gives the
# ones it loves. A pink nose over a little ω mouth (6×3). Face 16×8, rosy cheeks most of the time.
PURRLOOP_EYES = {  # (left, right)
    "content": ([".....", ".....", "ddddd", "aapaa", ".aaa."],) * 2,
    "open": ([".aaa.", "aapga", "aapaa", "aapaa", ".aaa."],) * 2,
    "half": ([".....", ".....", ".....", "ddddd", ".aaa."],) * 2,
    "closed": ([".....", ".....", "p...p", ".ppp.", "....."],) * 2,
    "happy": ([".....", "..p..", ".p.p.", "p...p", "....."],) * 2,
    "sad": (["p....", ".aaa.", "aapga", "aapaa", ".aaa."], ["....p", ".aaa.", "agpaa", "aapaa", ".aaa."]),
    "cross": (["p...p", ".p.p.", "..p..", ".p.p.", "p...p"],) * 2,
}
PURRLOOP_MOUTHS = {
    "none": ["..nn..", "......", "......"],
    "small": ["..nn..", "m.mm.m", ".m..m."],
    "flat": ["..nn..", "..mm..", "......"],
    "sad": ["..nn..", "..mm..", ".m..m."],
    "open": ["..nn..", ".mrrm.", "..mm.."],
    "laugh": ["..nn..", "mmrrmm", ".mrrm."],
    "chew": ["..nn..", ".mmmm.", "......"],
}
PURRLOOP_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("content", "small", True),
    "smile": ("open", "small", True),
    "blink": ("closed", "small", True),
    "happy": ("happy", "small", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", True),
    "sleep": ("closed", "none", False),
}
assert PURRLOOP_FACES.keys() == FACES.keys()
PURRLOOP_FACE_PALETTE = FACE_PALETTE | {"a": (245, 185, 60), "n": (255, 130, 170), "k": (255, 160, 190)}

# Gemperor: a hero's face – bright eyes (4×6) under brows set low at the inner ends, and a broad
# grin with one fang (8×3). Face 16×9. Its brows only lift when something good is coming.
GEMPEROR_EYES = {  # (left, right), brow in the top two rows
    "brave": (["mm..", "..mm", ".ww.", "wgpw", "wppw", ".ww."], ["..mm", "mm..", ".ww.", "wgpw", "wppw", ".ww."]),
    "open": (["....", ".mm.", ".ww.", "wgpw", "wppw", ".ww."],) * 2,
    "half": (["....", "....", "....", "dddd", "wppw", ".ww."],) * 2,
    "closed": (["....", "....", "....", "....", "pppp", "...."],) * 2,
    "happy": (["....", "....", ".pp.", "p..p", "....", "...."],) * 2,
    "sad": (["....", "...m", ".mm.", "wgpw", "wppw", ".ww."], ["....", "m...", ".mm.", "wgpw", "wppw", ".ww."]),
    "cross": (["mm..", "..mm", "....", "pppp", ".pp.", "...."], ["..mm", "mm..", "....", "pppp", ".pp.", "...."]),
}
GEMPEROR_MOUTHS = {
    "none": ["........", "........", "........"],
    "grin": ["m......m", ".mmmmmm.", "..f....."],
    "small": ["........", ".m....m.", "..mmmm.."],
    "flat": ["........", "..mmmm..", "..f....."],
    "sad": ["........", "..mmmm..", ".m....m."],
    "open": ["..mmmm..", ".mrrrrm.", "..mmmm.."],
    "laugh": [".mmmmmm.", ".mrrrrm.", "..mrrm.."],
    "chew": ["........", ".mmmmmm.", "..f....."],
}
GEMPEROR_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("brave", "grin", False),
    "smile": ("open", "grin", True),
    "blink": ("closed", "grin", False),
    "happy": ("happy", "small", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert GEMPEROR_FACES.keys() == FACES.keys()
GEMPEROR_FACE_PALETTE = FACE_PALETTE | {"f": (255, 255, 255)}

# Lanternling: calm and snug in its lantern – soft round eyes (4×4) with a big shine, a small
# content smile (6×2), and rosy cheeks whenever it is warm and well. Face 14×7.
LANTERNLING_EYES = {  # (left, right)
    "open": ([".pp.", "pwgp", "pppp", ".pp."],) * 2,
    "half": (["....", "pppp", "pwpp", ".pp."],) * 2,
    "closed": (["....", "....", "p..p", ".pp."],) * 2,
    "happy": (["....", ".pp.", "p..p", "...."],) * 2,
    "sad": (["...p", ".pp.", "pgpp", ".pp."], ["p...", ".pp.", "ppgp", ".pp."]),
    "cross": (["p..p", ".pp.", ".pp.", "p..p"],) * 2,
}
LANTERNLING_MOUTHS = {
    "none": ["......", "......"],
    "small": [".p..p.", "..pp.."],
    "flat": ["......", "..pp.."],
    "sad": ["..pp..", ".p..p."],
    "open": ["..pp..", ".prrp."],
    "laugh": [".pppp.", ".prrp."],
    "chew": ["......", ".pppp."],
    "o": ["..pp..", "..pp.."],
}
LANTERNLING_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("open", "small", True),
    "smile": ("open", "small", True),
    "blink": ("closed", "small", True),
    "happy": ("happy", "small", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "o", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", True),
    "sleep": ("closed", "none", True),
}
assert LANTERNLING_FACES.keys() == FACES.keys()
# Flarelet: fiery and eager – wide eyes (5×6) under brows that flick up at the outer ends, and a
# big grin with a fang (8×3) as its normal look. Face 16×9.
FLARELET_EYES = {  # (left, right)
    "open": (["pp...", ".....", "pppp.", "pwgpp", "ppppp", ".ppp."], ["...pp", ".....", ".pppp", "ppgwp", "ppppp", ".ppp."]),
    "half": (["pp...", ".....", ".....", "ppppp", "pwgpp", ".ppp."], ["...pp", ".....", ".....", "ppppp", "ppgwp", ".ppp."]),
    "closed": ([".....", ".....", ".....", ".....", "p...p", ".ppp."],) * 2,
    "happy": ([".....", ".....", ".ppp.", "p...p", ".....", "....."],) * 2,
    "sad": (["...pp", ".....", "pppp.", "pwgpp", "ppppp", ".ppp."], ["pp...", ".....", ".pppp", "ppgwp", "ppppp", ".ppp."]),
    "cross": ([".....", "p...p", ".p.p.", "..p..", ".p.p.", "p...p"],) * 2,
}
FLARELET_MOUTHS = {
    "none": ["........"] * 3,
    "grin": ["pppppppp", ".pwrrrp.", "..ppp..."],
    "flat": ["........", "........", "..pppp.."],
    "sad": ["........", "..pppp..", ".p....p."],
    "open": ["..pppp..", ".pwrrrp.", "..pppp.."],
    "chew": ["........", "........", ".pppppp."],
}
FLARELET_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("open", "grin", False),
    "smile": ("open", "grin", True),
    "blink": ("closed", "grin", False),
    "happy": ("happy", "grin", True),
    "laugh": ("happy", "open", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert FLARELET_FACES.keys() == FACES.keys()

# Sneezle: dragon eyes (5×5) with an amber iris and a slit pupil, nostrils, and a grin with two
# little fangs (8×3). Face 18×9. It is a cheerful dragon: its normal look is wide awake.
SNEEZLE_EYES = {  # (left, right)
    "open": ([".aaa.", "aapga", "aapaa", "aapaa", ".aaa."],) * 2,
    "half": ([".....", ".....", "mmmmm", "aapaa", ".aaa."],) * 2,
    "closed": ([".....", ".....", ".....", "mmmmm", "....."],) * 2,
    "happy": ([".....", ".mmm.", "m...m", ".....", "....."],) * 2,
    "sad": (["m....", ".maa.", "aapga", "aapaa", ".aaa."], ["....m", ".aam.", "aapga", "aapaa", ".aaa."]),
    "cross": (["....m", "..mm.", "mmpga", "aapaa", ".aaa."], ["m....", ".mm..", "mmpga", "aapaa", ".aaa."]),
}
SNEEZLE_MOUTHS = {
    "none": ["........", "........", "........"],
    "small": ["m......m", ".mmmmmm.", "..f..f.."],
    "flat": ["........", ".mmmmmm.", "..f..f.."],
    "sad": ["........", ".mmmmmm.", "m......m"],
    "open": [".mmmmmm.", "mfrrrrfm", ".mmmmmm."],
    "laugh": ["mmmmmmmm", "mfrrrrfm", "..mrrm.."],
    "chew": ["........", "mmmmmmmm", "..f..f.."],
}
SNEEZLE_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("open", "small", False),
    "smile": ("open", "small", True),
    "blink": ("closed", "small", False),
    "happy": ("happy", "small", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert SNEEZLE_FACES.keys() == FACES.keys()
SNEEZLE_FACE_PALETTE = {"a": (250, 190, 60), "p": (40, 25, 10), "g": (255, 255, 230), "m": (20, 85, 35),
                        "n": (20, 85, 35), "f": (250, 245, 225), "r": (200, 60, 70), "k": (255, 120, 150)}

# Grumpcap: golden toad eyes (6×4) with a sideways pupil, mostly under heavy lids, and a wide
# toad mouth (14×3). Face 20×8. Its normal look is a frown; a smile is a smirk at best, and only
# being petted makes it beam.
GRUMPCAP_EYES = {  # (left, right)
    "open": ([".ywyy.", "yyyyyy", "yppppy", ".yyyy."], [".yywy.", "yyyyyy", "yppppy", ".yyyy."]),
    "grumpy": (["GGGGGG", "mmmmmm", "yppppy", ".yyyy."],) * 2,
    "half": (["GGGGGG", "GGGGGG", "mmmmmm", "yppppy"],) * 2,
    "closed": (["......", "......", ".mmmm.", "m....m"],) * 2,
    "happy": (["......", ".mmmm.", "m....m", "......"],) * 2,
    "sad": (["GGm...", "mmyyyy", "yppppy", ".yyyy."], ["...mGG", "yyyymm", "yppppy", ".yyyy."]),
    "squint": (["GGGGGG", "GGGGGG", "mmmmmm", "......"],) * 2,
}
GRUMPCAP_MOUTHS = {
    "none": ["." * 14] * 3,
    "frown": ["..............", ".mmmmmmmmmmmm.", "m............m"],
    "smirk": ["............m.", ".mmmmmmmmmmm..", ".............."],
    "smile": ["..............", "m............m", ".mmmmmmmmmmmm."],
    "flat": ["..............", "mmmmmmmmmmmmmm", ".............."],
    "open": [".mmmmmmmmmmmm.", "mrrrrrrrrrrrrm", ".mmmmmmmmmmmm."],
    "laugh": ["mmmmmmmmmmmmmm", "mrrrrrrrrrrrrm", "..mrrrrrrrrm.."],
    "gulp": [".mmmmmmmmmmmm.", "mrrrrrttrrrrrm", ".mmmmmttmmmmm."],  # the tongue is out
    "chew": ["..............", "..mmmmmmmmmm..", ".............."],
}
GRUMPCAP_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("grumpy", "frown", False),
    "smile": ("grumpy", "smirk", False),
    "blink": ("closed", "frown", False),
    "happy": ("happy", "smile", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "frown", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "frown", False),
    "no": ("squint", "flat", False),
    "eat_open": ("open", "gulp", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert GRUMPCAP_FACES.keys() == FACES.keys()
GRUMPCAP_FACE_PALETTE = {"w": (255, 250, 220), "y": (240, 190, 50), "p": (30, 40, 20), "G": (80, 125, 50),
                         "m": (45, 75, 35), "r": (200, 70, 80), "t": (255, 130, 150), "k": (255, 120, 150)}
# Baby and child of the ember line: eyes and mouth glow
EMBER_FACE_PALETTE = {"w": (255, 255, 255), "p": (255, 225, 120), "g": (255, 255, 255), "d": (120, 30, 20),
                      "m": (255, 200, 90), "r": (255, 240, 170), "k": (255, 140, 60)}
# Baby and child of the stone line: eyelids and mouth in slate
STONE_FACE_PALETTE = FACE_PALETTE | {"d": (115, 128, 152), "m": (70, 82, 108)}
# Bouldergrin: round dark eyes (4×4) and a wide, toothy grin (8×3), which is its normal look.
# Face 16×8.
BOULDERGRIN_EYES = {  # (left, right)
    "open": ([".pp.", "pgpp", "pppp", ".pp."],) * 2,
    "half": (["....", "....", "pppp", ".pp."],) * 2,
    "closed": (["....", "....", "....", "pppp"],) * 2,
    "happy": (["....", ".pp.", "p..p", "...."],) * 2,
    "sad": (["p...", ".pp.", "pgpp", ".pp."], ["...p", ".pp.", "pgpp", ".pp."]),
    "cross": (["...p", "..pp", "pgpp", ".pp."], ["p...", "pp..", "pgpp", ".pp."]),
}
BOULDERGRIN_MOUTHS = {
    "none": ["........", "........", "........"],
    "grin": ["mmmmmmmm", "mwwwwwwm", ".mmmmmm."],
    "flat": ["........", ".mmmmmm.", "........"],
    "sad": ["........", ".mmmmmm.", "m......m"],
    "open": ["..mmmm..", ".mrrrrm.", "..mmmm.."],
    "laugh": ["mmmmmmmm", "mrrrrrrm", ".mrrrrm."],
    "chew": ["........", "mmmmmmmm", "........"],
}
BOULDERGRIN_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("open", "grin", False),
    "smile": ("open", "grin", True),
    "blink": ("closed", "grin", False),
    "happy": ("happy", "grin", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert BOULDERGRIN_FACES.keys() == FACES.keys()
BOULDERGRIN_FACE_PALETTE = {"p": (50, 40, 35), "g": (255, 255, 255), "m": (50, 40, 35), "w": (255, 250, 235),
                            "r": (190, 45, 60), "k": (255, 130, 160)}
# Baby and child of the fox line: eyelids in the shade of the fur, mouth in its outline, and the
# child gets a dark button nose (fox_face_grid)
FOX_FACE_PALETTE = FACE_PALETTE | {"d": (205, 88, 36), "m": (105, 38, 18), "n": (70, 32, 22)}
FOX_BABY_FACE_PALETTE = FOX_FACE_PALETTE | {"w": (240, 128, 50)}  # no whites: the beady eyes of a cub
# The adults: dark eyes with a white glint, a dark nose, the mouth in the outline of the fur
FOX_ADULT_FACE_PALETTE = {"p": (55, 28, 22), "g": (255, 255, 255), "n": (55, 28, 22), "m": (105, 38, 18),
                          "d": (205, 88, 36), "r": (190, 45, 60), "w": (255, 250, 235), "k": (255, 130, 160)}
# Roamtail: calm and friendly – round dark eyes (4×4), its normal look under lids lowered in peace,
# a button nose and a gentle smile (5×2). Face 15×7, on the scarf.
ROAMTAIL_EYES = {  # (left, right)
    "open": ([".pp.", "pgpp", "pppp", ".pp."],) * 2,
    "calm": (["....", "mmmm", "pgpp", ".pp."],) * 2,
    "half": (["....", "....", "dddd", ".pp."],) * 2,
    "closed": (["....", "....", "....", "pppp"],) * 2,
    "happy": ([".pp.", "p..p", "....", "...."],) * 2,
    "sad": (["p...", ".pp.", "pgpp", ".pp."], ["...p", ".pp.", "pgpp", ".pp."]),
    "cross": (["...p", "..pp", "pgpp", ".pp."], ["p...", "pp..", "pgpp", ".pp."]),
}
ROAMTAIL_MOUTHS = {
    "none": [".....", "....."],
    "smile": ["m...m", ".mmm."],
    "flat": [".....", ".mmm."],
    "sad": [".mmm.", "m...m"],
    "open": [".mmm.", ".mrm."],
    "laugh": ["mmmmm", ".mrm."],
    "chew": [".....", "mmmmm"],
}
ROAMTAIL_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("calm", "smile", False),
    "smile": ("open", "smile", True),
    "blink": ("closed", "smile", False),
    "happy": ("happy", "smile", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert ROAMTAIL_FACES.keys() == FACES.keys()
# Filchfox: its eyes look out of the holes of the mask (4×2 each; "." shows the fur in the hole),
# under it a dark nose and a sly grin with a fang (6×2). Its normal look is cheeky: one eye
# narrowed, the other with a glint. Face 15×6.
FILCHFOX_EYES = {  # (left, right)
    "open": ([".pg.", ".pp."],) * 2,
    "sly": (["....", "ppp."], [".pg.", ".pp."]),
    "half": (["pppp", ".pp."],) * 2,
    "closed": (["....", "pppp"],) * 2,
    "happy": ([".pp.", "p..p"],) * 2,
    "sad": (["p.p.", ".pp."], [".p.p", ".pp."]),
    "cross": (["..pp", "pp.."], ["pp..", "..pp"]),
}
FILCHFOX_MOUTHS = {
    "none": ["......", "......"],
    "grin": ["m....m", ".mmwm."],
    "flat": ["......", ".mmmm."],
    "sad": [".mmmm.", "m....m"],
    "open": ["..mm..", ".mrrm."],
    "laugh": ["mmmmmm", ".mrrm."],
    "chew": ["......", "mmmmmm"],
}
FILCHFOX_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("sly", "grin", False),
    "smile": ("open", "grin", False),
    "blink": ("closed", "grin", False),
    "happy": ("happy", "grin", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert FILCHFOX_FACES.keys() == FACES.keys()
# Baby and child of the cloud line: the slime's faces, with the eyelids in the shade of the face
# and the mouth in its outline
CLOUD_FACE_PALETTE = FACE_PALETTE | {"d": (110, 150, 215), "m": (60, 88, 150), "p": (50, 60, 110)}
# Rumblefluff: stern – small eyes under heavy brows that slant down to its nose, nostrils on the
# muzzle and a grumpy mouth that is a little crooked (5×2). Even happy it only smiles a little.
# Face 9×7.
RUMBLEFLUFF_EYES = {  # (left, right), 3×3
    "stern": (["pp.", "wgp", "wpp"], [".pp", "pgw", "ppw"]),
    "open": ([".p.", "wgp", "wpp"], [".p.", "pgw", "ppw"]),
    "half": (["...", "ppp", "wpp"], ["...", "ppp", "ppw"]),
    "closed": (["...", "...", "ppp"],) * 2,
    "happy": (["...", ".p.", "p.p"],) * 2,
    "sad": (["..p", "wgp", "wpp"], ["p..", "pgw", "ppw"]),
    "cross": (["ppp", ".pp", "wgp"], ["ppp", "pp.", "pgw"]),
}
RUMBLEFLUFF_MOUTHS = {
    "none": [".....", "....."],
    "grumble": [".....", ".mmmm"],
    "small": ["m...m", ".mmm."],
    "flat": [".....", ".mmm."],
    "sad": [".mmm.", "m...m"],
    "open": [".mmm.", ".mrm."],
    "laugh": ["mmmmm", ".mrm."],
    "chew": [".....", "mmmmm"],
}
RUMBLEFLUFF_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks)
    "normal": ("stern", "grumble", False),
    "smile": ("open", "small", False),
    "blink": ("closed", "grumble", False),
    "happy": ("happy", "small", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert RUMBLEFLUFF_FACES.keys() == FACES.keys()
RUMBLEFLUFF_FACE_PALETTE = {"p": (35, 38, 70), "g": (255, 255, 255), "w": (240, 245, 255), "m": (45, 52, 95),
                            "n": (45, 52, 95), "r": (190, 45, 60), "k": (255, 130, 160)}
# Prismist: gentle – round eyes with a lash at the outer corner (3×3), a small smile; its normal
# look is a kind one. Face 10×6.
PRISMIST_EYES = {  # the left eye; the right one is its mirror image
    "open": ["p..", ".wp", ".pp"],
    "kind": ["p..", ".pp", ".wp"],
    "half": ["p..", "...", ".pp"],
    "closed": ["...", "p..", ".pp"],
    "happy": ["...", "..p", ".p."],
    "sad": ["..p", ".wp", ".pp"],
    "cross": ["...", "pp.", ".wp"],
}
PRISMIST_FACES = {  # name (as in FACES): (eyes, mouth, rosy cheeks); mouths as in MOUTHS
    "normal": ("kind", "small", True),
    "smile": ("open", "small", True),
    "blink": ("closed", "small", True),
    "happy": ("happy", "small", True),
    "laugh": ("happy", "laugh", True),
    "sad": ("sad", "sad", False),
    "tired": ("half", "flat", False),
    "yawn": ("closed", "open", False),
    "sick": ("half", "sad", False),
    "no": ("cross", "flat", False),
    "eat_open": ("open", "open", False),
    "eat_closed": ("happy", "chew", False),
    "sleep": ("closed", "none", False),
}
assert PRISMIST_FACES.keys() == FACES.keys()
PRISMIST_FACE_PALETTE = {"p": (50, 60, 110), "w": (255, 255, 255), "m": (70, 95, 160), "r": (235, 95, 120),
                         "k": (255, 170, 200)}


def face_grid(eyes, mouth, blush):
    left, right = EYES[eyes]
    rows = [list("." * FACE_W) for _ in range(FACE_H)]
    for y in range(5):
        for x in range(4):
            rows[y][2 + x] = left[y][x]
            rows[y][10 + x] = right[y][x]
    for y in range(2):
        for x in range(4):
            rows[6 + y][6 + x] = MOUTHS[mouth][y][x]
    if blush:
        for x in (0, 1, 14, 15):
            rows[5][x] = "k"
    return ["".join(r) for r in rows]


def lanternling_face_grid(eyes, mouth, blush):
    rows = [list("." * 14) for _ in range(7)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(LANTERNLING_EYES[eyes][0], 1, 0)
    put(LANTERNLING_EYES[eyes][1], 9, 0)
    put(LANTERNLING_MOUTHS[mouth], 4, 5)
    if blush:
        put(["kk..........kk"], 0, 4)
    return ["".join(r) for r in rows]


def flarelet_face_grid(eyes, mouth, blush):
    rows = [list("." * 16) for _ in range(9)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(FLARELET_EYES[eyes][0], 1, 0)
    put(FLARELET_EYES[eyes][1], 10, 0)
    put(FLARELET_MOUTHS[mouth], 4, 6)
    if blush:
        put(["kk............kk"], 0, 6)
    return ["".join(r) for r in rows]


def cyclops_face_grid(eye, brow, mouth, blush):
    rows = [list("." * 16) for _ in range(11)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(CYCLOPS[eye], 3, 1)
    put(CYCLOPS_BROWS[brow], 3, 0)
    put(CYCLOPS_MOUTHS[mouth], 5, 8)
    if blush:
        put(["kk..........kk"], 1, 7)
    return ["".join(r) for r in rows]


def flicker_face_grid(eyes, mouth, blush):
    rows = [list("." * 16) for _ in range(9)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(FLICKER_EYES[eyes][0], 2, 0)
    put(FLICKER_EYES[eyes][1], 10, 0)
    put(FLICKER_MOUTHS[mouth], 5, 5)
    if blush:
        put(["kk............kk"], 0, 5)
    return ["".join(r) for r in rows]


def lumoth_face_grid(eyes, mouth, blush):
    rows = [list("." * 16) for _ in range(7)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(LUMOTH_EYES[eyes][0], 2, 0)
    put(LUMOTH_EYES[eyes][1], 10, 0)
    put(LUMOTH_MOUTHS[mouth], 5, 5)
    if blush:
        put(["kk............kk"], 0, 5)
    return ["".join(r) for r in rows]


def angloop_face_grid(eyes, mouth, blush):
    rows = [list("." * 16) for _ in range(8)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(EYES[eyes][0], 2, 0)
    put(EYES[eyes][1], 10, 0)
    put(ANGLOOP_MOUTHS[mouth], 4, 5)
    if blush:
        put(["kk............kk"], 0, 4)
    return ["".join(r) for r in rows]


def purrloop_face_grid(eyes, mouth, blush):
    rows = [list("." * 16) for _ in range(8)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(PURRLOOP_EYES[eyes][0], 1, 0)
    put(PURRLOOP_EYES[eyes][1], 10, 0)
    put(PURRLOOP_MOUTHS[mouth], 5, 5)
    if blush:
        put(["kk............kk"], 0, 5)
    return ["".join(r) for r in rows]


def gemperor_face_grid(eyes, mouth, blush):
    rows = [list("." * 16) for _ in range(9)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(GEMPEROR_EYES[eyes][0], 1, 0)
    put(GEMPEROR_EYES[eyes][1], 11, 0)
    put(GEMPEROR_MOUTHS[mouth], 4, 6)
    if blush:
        put(["kk............kk"], 0, 6)
    return ["".join(r) for r in rows]


def glimmerock_face_grid(eyes, mouth, blush):
    rows = [list("." * 16) for _ in range(7)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(GLIMMEROCK_EYES[eyes][0], 2, 0)
    put(GLIMMEROCK_EYES[eyes][1], 10, 0)
    put(GLIMMEROCK_MOUTHS[mouth], 5, 5)
    if blush:
        put(["kk............kk"], 0, 4)
    return ["".join(r) for r in rows]


def sneezle_face_grid(eyes, mouth, blush):
    rows = [list("." * 18) for _ in range(9)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(SNEEZLE_EYES[eyes][0], 2, 0)
    put(SNEEZLE_EYES[eyes][1], 11, 0)
    put(["n..n"], 7, 5)  # nostrils
    put(SNEEZLE_MOUTHS[mouth], 5, 6)
    if blush:
        put(["kk..............kk"], 0, 4)
    return ["".join(r) for r in rows]


def grumpcap_face_grid(eyes, mouth, blush):
    rows = [list("." * 20) for _ in range(8)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(GRUMPCAP_EYES[eyes][0], 1, 0)
    put(GRUMPCAP_EYES[eyes][1], 13, 0)
    put(GRUMPCAP_MOUTHS[mouth], 3, 5)
    if blush:
        put(["kk................kk"], 0, 4)
    return ["".join(r) for r in rows]


def bouldergrin_face_grid(eyes, mouth, blush):
    rows = [list("." * 16) for _ in range(8)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(BOULDERGRIN_EYES[eyes][0], 2, 0)
    put(BOULDERGRIN_EYES[eyes][1], 10, 0)
    put(BOULDERGRIN_MOUTHS[mouth], 4, 5)
    if blush:
        put(["kk............kk"], 0, 4)
    return ["".join(r) for r in rows]


def fox_face_grid(eyes, mouth, blush):
    """The child's face, with a button nose above the mouth."""
    rows = [list(r) for r in face_grid(eyes, mouth, blush)]
    rows[5][7] = rows[5][8] = "n"
    return ["".join(r) for r in rows]


def roamtail_face_grid(eyes, mouth, blush):
    rows = [list("." * 15) for _ in range(7)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(ROAMTAIL_EYES[eyes][0], 0, 0)
    put(ROAMTAIL_EYES[eyes][1], 11, 0)
    put(["n"], 7, 4)
    put(ROAMTAIL_MOUTHS[mouth], 5, 5)
    if blush:
        put(["kk...........kk"], 0, 4)
    return ["".join(r) for r in rows]


def filchfox_face_grid(eyes, mouth, blush):
    rows = [list("." * 15) for _ in range(6)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(FILCHFOX_EYES[eyes][0], 0, 0)  # in the holes of the mask
    put(FILCHFOX_EYES[eyes][1], 11, 0)
    put(["n"], 6, 3)  # under the bridge of the mask
    put(FILCHFOX_MOUTHS[mouth], 4, 4)
    if blush:
        put(["kk...........kk"], 0, 4)
    return ["".join(r) for r in rows]


def rumblefluff_face_grid(eyes, mouth, blush):
    rows = [list("." * 9) for _ in range(7)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(RUMBLEFLUFF_EYES[eyes][0], 0, 0)
    put(RUMBLEFLUFF_EYES[eyes][1], 6, 0)
    put(["n.n"], 3, 4)  # nostrils on the muzzle
    put(RUMBLEFLUFF_MOUTHS[mouth], 2, 5)
    if blush:
        put(["k.......k"], 0, 3)
    return ["".join(r) for r in rows]


def prismist_face_grid(eyes, mouth, blush):
    rows = [list("." * 10) for _ in range(6)]

    def put(part, left, top):
        for y, line in enumerate(part):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[top + y][left + x] = ch

    put(PRISMIST_EYES[eyes], 0, 0)
    put([r[::-1] for r in PRISMIST_EYES[eyes]], 7, 0)
    put(MOUTHS[mouth], 3, 4)
    if blush:
        put(["kk......kk"], 0, 3)
    return ["".join(r) for r in rows]


def baby_face_grid(eyes, mouth, blush):
    left, right = BABY_EYES[eyes]
    rows = [list("." * BABY_W) for _ in range(BABY_H)]
    for y in range(3):
        for x in range(3):
            rows[y][1 + x] = left[y][x]
            rows[y][6 + x] = right[y][x]
    for y in range(2):
        for x in range(4):
            rows[3 + y][3 + x] = MOUTHS[mouth][y][x]
    if blush:
        rows[3][0] = rows[3][9] = "k"
    return ["".join(r) for r in rows]


# ---------------------------------------------------------------- Items

ITEM_PALETTE = {
    "B": (235, 95, 95), "b": (190, 50, 62), "D": (120, 30, 45),         # bowl
    "f": (240, 180, 75), "F": (200, 120, 40),                           # food
    "P": (150, 90, 40), "p": (195, 130, 65), "q": (105, 58, 25),        # poop
    "a": (255, 125, 45), "A": (195, 70, 25), "s": (255, 225, 170),      # ball
    "u": (235, 70, 95), "U": (150, 30, 65), "w": (255, 215, 225), "k": (210, 170, 120),  # umbrella
    "c": (200, 212, 230), "C": (135, 148, 178),                         # cloud
    "e": (240, 232, 205), "E": (196, 184, 150), "h": (255, 255, 240),   # egg
    "K": (210, 150, 80), "j": (165, 105, 50), "n": (90, 50, 30),         # cookie with chocolate chips
    "i": (255, 190, 215), "I": (225, 140, 180), "z": (215, 170, 95), "Z": (170, 120, 60),  # ice cream
    "g": (110, 200, 70), "R": (225, 45, 55), "Q": (160, 25, 40), "W": (255, 190, 190),     # apple
    "t": (40, 200, 188), "o": (150, 135, 100), "x": (110, 85, 55),
    "Y": (245, 212, 90), "O": (200, 160, 55), "L": (175, 230, 250),    # sponge with soap bubbles
    "S": (165, 165, 180), "T": (110, 110, 130),                         # stone
    "l": (110, 200, 90), "G": (60, 140, 70),                            # bush
}

EGG = [
    "....oooo....",
    "...ohheeo...",
    "..oheeeeeo..",
    "..oeetteeo..",
    ".oeetteeeeo.",
    ".oeeeeeetEo.",
    ".oeeeeeeeEo.",
    ".oetteeeeEo.",
    ".oetteeeeEo.",
    ".oeeeeeeEEo.",
    "..oeeeetEo..",
    "..oEeeeeEo..",
    "...oEEEEo...",
    "....oooo....",
]


def lean(grid, direction, rows=6):
    """Tilt the upper part by one pixel (wobble)."""
    def shift(r):
        return "." + r[:-1] if direction > 0 else r[1:] + "."
    return [shift(r) if i < rows else r for i, r in enumerate(grid)]


def crack(grid):
    rows = [list(r) for r in grid]
    for x, y in ((3, 6), (4, 7), (5, 6), (6, 7), (7, 6), (8, 7)):
        rows[y][x] = "x"
    return ["".join(r) for r in rows]


def egg_tags(egg):
    cracked = crack(egg)
    return {
        "egg": [(egg, 1000)],
        "egg_wobble": [(lean(egg, -1), 150), (egg, 150), (lean(egg, 1), 150), (egg, 150)],
        "egg_crack": [(cracked, 1000)],
        "egg_open": [(cracked[:7] + ["." * len(egg[0])] + cracked[7:], 1000)],  # the lid lifts
    }


EGG_TAGS = egg_tags(EGG)
# The cloud egg is sky blue, and its speckles are little clouds drifting across it
CLOUD_EGG = [
    "....oooo....",
    "...ohheeo...",
    "..oheeeeeo..",
    "..oetttteo..",
    ".otttttteeo.",
    ".oeeeeeeeEo.",
    ".oeeeeeeeEo.",
    ".oeeeetttEo.",
    ".oeeeetttto.",
    ".oeeeeeeEEo.",
    "..ottteeEo..",
    "..otttteEo..",
    "...oEEEEo...",
    "....oooo....",
]
EGG_GRIDS = {"cloud": CLOUD_EGG}  # lines whose egg is not the usual one in other colors
# Rare eggs are the same egg in other colors: "<line>_egg", "<line>_egg_wobble", ...
# The ember egg is a cooled crust with spots that glow.
RARE_EGG_PALETTES = {
    "ember": {"o": (95, 22, 14), "e": (160, 45, 30), "E": (120, 30, 20), "h": (195, 70, 40), "t": (255, 190, 50),
              "x": (255, 240, 170)},
    # The stone egg is a river pebble with specks of quartz.
    "stone": {"o": (70, 82, 108), "e": (170, 182, 202), "E": (125, 138, 162), "h": (225, 232, 245),
              "t": (250, 244, 222), "x": (90, 100, 125)},
    # The fox egg: a russet shell with cream speckles, like a fox's chest.
    "fox": {"o": (105, 38, 18), "e": (235, 120, 48), "E": (190, 82, 32), "h": (255, 180, 110), "t": (255, 240, 215),
            "x": (70, 32, 22)},
    # The cloud egg: a pale sky with white clouds (CLOUD_EGG), and a crack of dark blue.
    "cloud": {"o": (60, 88, 150), "e": (165, 200, 245), "E": (120, 155, 215), "h": (220, 236, 255),
              "t": (255, 255, 255), "x": (40, 60, 120)},
}


# ---------------------------------------------------------------- The leaf, duck, hippo and beak lines

# Four more lines, each with its egg (EGG_GRIDS), baby, child and two adults. What every form of a
# line keeps: the seed shell (leaf: the baby's cap, the child's helmet, the adults' pot), the curl
# (duck), the towel (hippo) and the red crest (beak; only the beak changes between its adults).
# The child carries the colors the code recolors as a hint at its adult form (LURES in
# core/src/scene.ts): the leaves of the sprout, the curl, the towel's stripe, the goggles.

def face_place(grid, eye_row, left, width):
    """faceTop and faceShift for a face `width` wide whose top row is `eye_row` and whose left
    edge is column `left` of the grid, as faceAnchor (core/src/sprites.ts) places it."""
    xs = [x for x, ch in enumerate(grid[eye_row]) if ch != "."]
    return face_top(grid, eye_row), left + width / 2 - (xs[0] + xs[-1] + 1) / 2


# The eggs: a seed with an acorn cap and little leaves; a cream egg floating in a pond; a lavender
# egg caked with mud at the bottom; a robin-blue bird's egg with brown freckles.
LEAF_EGG = [
    "....oooo....",
    "...okKkKo...",
    "..oKkKkKko..",
    "..okKkKkKo..",
    ".oooooooooo.",
    ".oeeeeeeeEo.",
    ".oeetteeeEo.",
    ".oeeetteeEo.",
    ".oeeeeeeeEo.",
    ".oeeeeetteo.",
    "..oeeetteo..",
    "..oEeeeeEo..",
    "...oEEEEo...",
    "....oooo....",
]
DUCK_EGG = [
    "....oooo....",
    "...ohheeo...",
    "..oheeeeeo..",
    "..oeeeeeeo..",
    ".oeeeeeeeeo.",
    ".oeeeeeeeEo.",
    ".oeeeeeeeEo.",
    ".oeeeeeeeEo.",
    ".oettetteEo.",
    ".otteetteto.",
    "..otttttTo..",
    "..otTtttTo..",
    "...oTTTTo...",
    "....oooo....",
]
HIPPO_EGG = [
    "....oooo....",
    "...ohheeo...",
    "..oheeeeeo..",
    "..oeeteeeo..",
    ".oeeeeeeeeo.",
    ".oeeeeeteEo.",
    ".oeteeeeeEo.",
    ".oeeeeeeeEo.",
    ".omeemeemEo.",
    ".ommmmmmmMo.",
    "..ommmmmMo..",
    "..omMmmmMo..",
    "...oMMMMo...",
    "....oooo....",
]
BEAK_EGG = [
    "....oooo....",
    "...ohheeo...",
    "..ohetteeo..",
    "..oeetteto..",
    ".oteeeeeeeo.",
    ".oeeeteeeEo.",
    ".oeeeeeeteo.",
    ".otteeeeeEo.",
    ".otteeteeEo.",
    ".oeeeeeeeEo.",
    "..oeteeeEo..",
    "..oEeeetEo..",
    "...oEEEEo...",
    "....oooo....",
]
EGG_GRIDS |= {"leaf": LEAF_EGG, "duck": DUCK_EGG, "hippo": HIPPO_EGG, "beak": BEAK_EGG}
RARE_EGG_PALETTES |= {
    "leaf": {"o": (70, 48, 26), "e": (215, 185, 130), "E": (170, 135, 85), "h": (240, 220, 175), "t": (95, 175, 60),
             "x": (60, 40, 20), "k": (140, 95, 50), "K": (105, 70, 35)},
    "duck": {"o": (90, 80, 55), "e": (250, 240, 200), "E": (215, 200, 150), "h": (255, 255, 235), "t": (90, 170, 230),
             "T": (55, 120, 190), "x": (60, 50, 35)},
    "hippo": {"o": (70, 55, 85), "e": (190, 170, 210), "E": (150, 130, 175), "h": (225, 210, 240), "t": (240, 150, 175),
              "m": (130, 90, 60), "M": (95, 62, 40), "x": (50, 35, 60)},
    "beak": {"o": (40, 85, 105), "e": (130, 205, 220), "E": (90, 165, 185), "h": (200, 240, 245), "t": (110, 70, 45),
             "x": (30, 55, 70)},
}

# Shared by the adults of these lines: eyes 4×3 and the slime's mouths. A face: the two eyes
# `gap` apart, rosy cheeks on their outer sides, the mouth `mouth_row` rows below the top,
# centered (none for a beak or a bill: that is part of the body).
KIT_EYES = {  # (left, right)
    "open": (["wwpp", "wpgp", "wppp"],) * 2,
    "closed": (["....", "....", "pppp"],) * 2,
    "happy": (["....", ".pp.", "p..p"],) * 2,
    "half": (["....", "dddd", "wppp"],) * 2,
    "sad": (["p...", "wwpp", "wpgp"], ["...p", "wwpp", "wpgp"]),
    "cross": (["..pp", "wwpp", "wpgp"], ["pp..", "wwpp", "wpgp"]),
}


def kit_face(gap, mouth_row=3, single=False):
    """A face grid function for one of these adults; `single`: one eye, seen from the side."""
    width = 1 + (4 if single else gap + 4) + 1
    height = max(3, mouth_row + 2)

    def grid(eyes, mouth, blush):
        rows = [list("." * width) for _ in range(height)]
        left, right = KIT_EYES[eyes]
        for y in range(3):
            for x in range(4):
                rows[y][1 + x] = left[y][x]
                if not single:
                    rows[y][1 + gap + x] = right[y][x]
        if mouth_row:
            mx = (width - 4) // 2
            for y in range(2):
                for x in range(4):
                    rows[mouth_row + y][mx + x] = MOUTHS[mouth][y][x]
        if blush:
            rows[2][0] = "k"
            if not single:
                rows[2][width - 1] = "k"
        return ["".join(r) for r in rows]
    grid.width = width
    return grid


def kit_faces(**changes):
    """FACES with some of them changed; a form with a beak has no mouth of its own."""
    return FACES | changes


BEAKED_FACES = {name: (eyes, "none", blush) for name, (eyes, mouth, blush) in FACES.items()}

# ---- The leaf line: a seed that grows up into a plant with a pot of its own

LEAF_PALETTE = {
    "o": (25, 80, 35),     # outline
    "d": (60, 140, 55),    # shadow
    "b": (95, 190, 75),    # leaf green
    "l": (150, 225, 110),  # lit
    "h": (210, 250, 180),  # highlight
    "k": (160, 110, 60),   # the seed shell
    "K": (115, 75, 40),
    "x": (70, 45, 25),
    "g": (130, 220, 90),   # the sprout's leaves (the hint)
    "G": (60, 150, 50),
    "s": (85, 130, 45),    # its stem
}
# Baby: the baby slime wearing the top of its seed as a cap, a little askew, a sprout on top
LEAF_BABY = [
    "........G.g.....",
    "........Ggsg....",
    "......xxxxsxxx..",
    "....xxkkKkkkKkx.",
    "..xxkKkkkKkkkxx.",
    ".oKKKKKKKKKKKKo.",
    ".olhbbbbbbbbbdo.",
    "olbbbbbbbbbbbddo",
    "olbbbbbbbbbbbddo",
    "obbbbbbbbbbbbddo",
    "odbbbbbbbbbbdddo",
    "oddddddddddddddo",
    ".oooooooooooooo.",
]
LEAF_BABY_TAGS = body_tags(LEAF_BABY, 8, 8, flat_rows=3)
# Sproutlet, the child: a seedling with its seed shell pulled down to the eyes like a helmet; the
# sprout has grown into a small leaf and a big one that flops to the right; two roots for feet
SPROUTLET = [
    "..............gggg......",
    ".....gg.....ggggggg.....",
    "....gGgg...gGGggggGg....",
    ".....gGgs.gGgggggGg.....",
    "........sGgggGgg........",
    ".........s..............",
    "......xxxxsxxxxx........",
    "....xxkkKkkkKkkkxx......",
    "...xkkKkkkKkkkKkkkx.....",
    "..xkKkkkKkkkKkkkKkkx....",
    ".oKKKKKKKKKKKKKKKKKKKo..",
    ".olhhbbbbbbbbbbbbbbbdo..",
    "olhbbbbbbbbbbbbbbbbbbdo.",
    "olbbbbbbbbbbbbbbbbbbbdo.",
    "obbbbbbbbbbbbbbbbbbbbdo.",
    "obbbbbbbbbbbbbbbbbbbddo.",
    "obbbbbbbbbbbbbbbbbbbddo.",
    "odbbbbbbbbbbbbbbbbbdddo.",
    ".odbbbbbbbbbbbbbbbdddo..",
    "..oddddddddddddddddoo...",
    "...ooKKooooooooKKoo.....",
    "....KK.K......K.KK......",
]
SPROUTLET_FACE_TOP, SPROUTLET_FACE_SHIFT = face_place(SPROUTLET, 11, 3, FACE_W)
SPROUTLET_TAGS = body_tags(SPROUTLET, 14, 11, flat_rows=3)
LEAF_ADULT_PALETTE = {
    "o": (25, 60, 30), "g": (150, 225, 110), "G": (95, 190, 75), "v": (55, 140, 55),  # leaves
    "T": (150, 105, 65), "U": (105, 70, 40), "t": (190, 145, 95),  # bark
    "k": (175, 125, 70), "K": (125, 85, 45),  # the pot: the seed shell, grown and woven
    "m": (120, 160, 70), "M": (85, 120, 50),  # moss
    "r": (110, 75, 45),  # roots
    "s": (215, 245, 190),  # the cactus' spines
    "p": (255, 150, 190), "P": (220, 90, 140), "y": (255, 225, 90),  # its flower
}
# Twiggle: an old bonsai master that walks around in its pot. Pads of leaves like clouds, one
# reaching far to the right; a gnarled trunk with a calm old face and a beard of moss; the pot
# stands on its roots. It walks, slowly.
TWIGGLE = [
    "........oooooo.......ooooo......",
    "......ooggggGGoo...ooggggGoo....",
    ".....ogggGGGGGGGo.ogggGGGGGGooo.",
    "....ogggGGGGGGGGvoogGGGGGGGGgGGo",
    "...oggGGGGGGGGGvvvGGGGGGGGGGGGvo",
    "...oGGGGGGGGGGvvvvGGGGGGGGGGvvo.",
    "....oovvvGGvvvvoovvvvvvvvvvvoo..",
    "......oooovvoooUUoooooooooo.....",
    "..........oUUooUUo..............",
    "...........oUUUUo...............",
    "...........oTTTTTTTTTTTUUo......",
    "..........oTTtTTTTTTTTTTUo......",
    "..........oTtTTTTTTTTTTTUo......",
    "..........oTtTTTTTTTTTTTUo......",
    "..........oTTTTTTTTTTTTTUo......",
    "..........oTTTTTTTTTTTTTUo......",
    "..........oTTmmmmmmmmmmTUo......",
    "........ooooommMmmmmMmmooooo....",
    ".......oKkKkKkKmmMmmmMKkKkKko...",
    "......oKkkKkkKkkKkkKkkKkkKkkKo..",
    "......okKkkKkkKkkKkkKkkKkkKkko..",
    ".......okKkkKkkKkkKkkKkkKkkKo...",
    "........oKKKKKKKKKKKKKKKKKKo....",
    ".........ooooooooooooooooooo....",
    "..........rr.r..........r.rr....",
    ".........r....r........r....r...",
]
TWIGGLE_FACE_TOP, TWIGGLE_FACE_SHIFT = face_place(TWIGGLE, 12, 12, 13)
TWIGGLE_TAGS = species_tags([TWIGGLE, drop_rows(TWIGGLE, 13)], 13, 18, idle_ms=900)
TWIGGLE_TAGS["walk"] = walk_tags(TWIGGLE, 13, range(9, 15), range(23, 30), 24, ms=(260, 160))
# Needlenub: a round cactus that wants to be petted. Its little arms are always up for a hug, the
# one flower on its head opens when it is happy (closed, the code colors it as a bud); it sits in
# the same seed-shell pot and hops.
NEEDLENUB = [
    "...............pp...............",
    ".............pPyPp..............",
    "..............pPp...............",
    "...........ooooGooooo...........",
    ".........ooGGsGGGGsGGoo.........",
    "........oGGgGGGGGGGGGsvo........",
    ".......oGgsGGGGGGsGGGGGvo.......",
    "..oo..oGgGGGGGGGGGGGGGsGvo..oo..",
    ".oGso.oGsGGGGGGGGGGGGGGGvo.osGo.",
    ".oGGo.oGgGGGGGGGGGGGGGGGvo.oGvo.",
    ".oGGvooGGGGGGGGGGGGGGGGsvooGvvo.",
    "..oGGvoGsGGGGGGGGGGGGGGGvoGvvo..",
    "...oGGGGGGGGGGGGGGGGGGGGGGvvo...",
    "....ooGGGGGsGGGGGGGGsGGGvvoo....",
    "......oGGGGGGGGGGGGGGGGGvo......",
    "......ovGGGGsGGGGGGsGGGvvo......",
    ".....ooooooooooooooooooooo......",
    "....oKkKkKkKkKkKkKkKkKkKkKko....",
    "....okkKkkKkkKkkKkkKkkKkkKko....",
    ".....okKkkKkkKkkKkkKkkKkko......",
    ".....oKkKkkKkkKkkKkkKkkKko......",
    "......oKKKKKKKKKKKKKKKKKo.......",
    ".......ooooooooooooooooo........",
    "........rr.r.......r.rr.........",
]
NEEDLENUB_FACE_TOP, NEEDLENUB_FACE_SHIFT = face_place(NEEDLENUB, 8, 10, 13)
NEEDLENUB_TAGS = species_tags([NEEDLENUB, drop_rows(NEEDLENUB, 14)], 14, 16)

# ---- The duck line: a duckling that never quite leaves the water

DUCK_PALETTE = {
    "o": (120, 85, 15),    # outline
    "d": (225, 175, 35),   # shadow
    "b": (255, 215, 70),   # duckling yellow
    "l": (255, 235, 140),  # lit
    "h": (255, 250, 210),  # highlight
    "a": (250, 140, 40),   # feet and bill
    "A": (200, 95, 25),
    "q": (245, 185, 40),   # the curl (the hint)
    "Q": (210, 140, 30),
    "e": (250, 240, 200),  # the eggshell
    "E": (215, 200, 150),
}
# Baby: a yellow slime with a curl of down on top and orange webbed feet
DUCK_BABY = [
    "........dd......",
    ".......d..d.....",
    "..........d.....",
    ".....oobbdo.....",
    "...oolhllbboo...",
    "..olhhlbbbbbdo..",
    ".ollhbbbbbbbbdo.",
    ".olbbbbbbbbbbdo.",
    "olbbbbbbbbbbbddo",
    "olbbbbbbbbbbbddo",
    "obbbbbbbbbbbbddo",
    "odbbbbbbbbbbdddo",
    "oddddddddddddddo",
    ".oaAaooooooaAao.",
]
DUCK_BABY = [row.replace("d", "q") if y < 3 else row for y, row in enumerate(DUCK_BABY)]
DUCK_BABY_TAGS = body_tags(DUCK_BABY, 9, 8, flat_rows=3)
# Paddlet, the child: a duckling that still sits in the bottom half of its eggshell and paddles it
# like a little boat, its webbed feet sticking out underneath; a bill instead of a mouth
PADDLET = [
    "...........qq...........",
    "..........q..q..........",
    ".............Q..........",
    "........oooobQoo........",
    "......oolhhlbbbboo......",
    ".....olhhlbbbbbbbbdo....",
    "....olhlbbbbbbbbbbbdo...",
    "...olhbbbbbbbbbbbbbbdo..",
    "...olbbbbbbbbbbbbbbbdo..",
    "..olbbbbbbbbbbbbbbbbbdo.",
    "..obbbbbbbbbbbbbbbbbbdo.",
    ".odbbbbbbbbbbbbbbbbbbddo",
    "oddbbbbbbbbbbbbbbbbbbddo",
    "odEbeEbeEbeEbeEbeEbeEddo",
    ".oeeEeeeEeeeEeeeEeeeEEo.",
    ".oeeeeeeeeeeeeeeeeeeeEo.",
    "..oeeeeeeeeeeeeeeeeeEo..",
    "...oEEEeeeeeeeeeeeEEo...",
    "....ooEEEEEEEEEEEEoo....",
    "......oaAao..oaAao......",
    ".....aAaAa....aAaAa.....",
]
PADDLET_FACE_TOP, PADDLET_FACE_SHIFT = face_place(PADDLET, 5, 4, FACE_W)
PADDLET_TAGS = body_tags(PADDLET, 9, 12, flat_rows=3)
DUCK_ADULT_PALETTE = {
    "o": (40, 40, 30),
    "G": (40, 150, 90), "g": (90, 200, 130), "v": (20, 95, 60),  # a mallard's green
    "b": (255, 215, 70), "l": (255, 235, 140), "d": (225, 175, 35),  # the duckling's yellow
    "a": (250, 140, 40), "A": (200, 95, 25),  # bill and feet
    "w": (120, 200, 120), "W": (70, 140, 80),  # the dragon's wing
    "f": (255, 170, 60), "F": (255, 90, 40),  # a puff of flame
    "n": (35, 45, 90), "N": (60, 75, 135), "y": (255, 210, 80), "s": (255, 255, 250),  # the cap
    "B": (90, 160, 225), "r": (215, 50, 50),  # sailor collar and scarf
}
# Drakwing: a duck that is a little dragon (a drake is a male duck). A mallard-green head whose
# curl has become a horn, a wide bill that puffs flames, small bat wings and a spiky tail; the
# belly stays duckling yellow. It walks, waddling.
DRAKWING = [
    "..............oo................",
    ".............ogo................",
    "...............go...............",
    "...........ooooogoo.............",
    ".........oogggGGGGGoo.....o....o",
    "........ogggGGGGGGGGvo...oWo..oW",
    ".......oggGGGGGGGGGGGvo.oWwWooWw",
    ".......ogGGGGGGGGGGGGvooWwwwWWww",
    ".......oGGGGGGGGGGGGGvooWwwwwwww",
    "..F....oGGGGGGGGGGGGGvooWwwwwwWo",
    ".FfF..oaaaaaaaaaaaaaaaoooWwWwWo.",
    "..FfFoaAAAAAAAAAAAAAAAAo.o.o.o..",
    "....ooaaaaaaaaaaaaaaaaao........",
    "......oovvGGGGGGGGGGGGvo........",
    ".......ovlbbbbbbbbbbbdvo........",
    "......ovlbbbbbbbbbbbbbdvo.ooo...",
    "......ovbbbbbbbbbbbbbbdvo...gg..",
    "......ovbbbbbbbbbbbbbddvoo.ogGo.",
    "......ovdbbbbbbbbbbbbddvoggGGo..",
    ".......ovddbbbbbbbbbdddvGGGo....",
    "........ovvddddddddddvvvoo......",
    ".........ooovvvvvvvvvooo........",
    "............aAa...aAa...........",
    "...........aAaAa.aAaAa..........",
]
DRAKWING_FACE_TOP, DRAKWING_FACE_SHIFT = face_place(DRAKWING, 7, 9, 13)
DRAKWING_TAGS = species_tags([DRAKWING, dots(DRAKWING, {(1, 10): ".", (2, 9): ".", (3, 10): "f"})], 16, 15)
DRAKWING_TAGS["walk"] = walk_tags(DRAKWING, 16, range(11, 15), range(18, 22), 22, ms=(180, 110))
# Captain Quill: an old sea duck in a captain's cap with the curl sticking out under it, a
# sailor collar with a red scarf. It walks, rolling like a sailor.
QUILL = [
    "...........b....................",
    "..........bobooooooo............",
    ".........oonnnnnnnnnnoo.........",
    "........onnnnnyyynnnnnno........",
    "........onnnnnynynnnnnno........",
    ".......oNNNNNNNNNNNNNNNNo.......",
    "......osssssssssssssssssso......",
    "......oyyyyyyyyyyyyyyyyyyo......",
    "......olllllllllllllllldo.......",
    "......olllllllllllllllldo.......",
    "......olllllllllllllllldo.......",
    "......olllllllllllllllldo.......",
    ".....oaaaaaaaaaaaaaaaaaaao......",
    ".....oaAAAAAAAAAAAAAAAAAAo......",
    "......oaaaaaaaaaaaaaaaaaoA......",
    ".....oBBsBBBBrrrrrrBBBBsBBo.....",
    "....oBBBsBBBBrrrrrrBBBsBBBBo....",
    "....olsBBBBBlbrrrrblBBBBBsdo....",
    "....olllbbbbbbbrrbbbbbbbbbdo....",
    "....olbbbbbbbbbbbbbbbbbbbbdo....",
    "....odbbbbbbbbbbbbbbbbbbbddo....",
    ".....odbbbbbbbbbbbbbbbbbddo.....",
    "......oddddddddddddddddddo......",
    ".......ooooooooooooooooooo......",
    "..........aAa......aAa..........",
    ".........aAaAa....aAaAa.........",
]
QUILL_FACE_TOP, QUILL_FACE_SHIFT = face_place(QUILL, 8, 9, 13)
QUILL_TAGS = species_tags([QUILL, drop_rows(QUILL, 19)], 19, 16)
QUILL_TAGS["walk"] = walk_tags(QUILL, 19, range(9, 15), range(18, 24), 24, ms=(220, 130))

# ---- The hippo line: a hippo that loves its bath

HIPPO_PALETTE = {
    "o": (70, 55, 85),     # outline
    "d": (135, 115, 160),  # shadow
    "b": (175, 155, 200),  # lavender
    "l": (205, 190, 225),  # lit
    "h": (235, 225, 245),  # highlight
    "I": (240, 150, 175),  # inside the ears
    "m": (225, 195, 210),  # muzzle
    "M": (190, 160, 180),
    "n": (90, 60, 80),     # nostrils
    "w": (250, 245, 240),  # the towel
    "W": (210, 200, 205),
    "T": (240, 130, 160),  # its stripe (the hint)
}
# Baby: a round lavender baby with two little ears and a big pale muzzle
HIPPO_BABY = [
    "...oo......oo...",
    "..oIIooooooIIo..",
    "...olhllbbbbo...",
    "..olhhlbbbbbdo..",
    ".ollhbbbbbbbbdo.",
    ".olbbbbbbbbbbdo.",
    "olbbbbbbbbbbbddo",
    "obbbmmmmmmmmbbdo",
    "obmmmmmmmmmmmmdo",
    "obmmnmmmmmmnmMdo",
    "odmmmmmmmmmmMMdo",
    "oddMMMMMMMMMMddo",
    ".oooooooooooooo.",
]
HIPPO_BABY_TAGS = body_tags(HIPPO_BABY, 6, 8, flat_rows=3)
# Soakling, the child: a young hippo on its way to the bath, a striped towel folded on its head
# with the little ears poking out under it
SOAKLING = [
    "......oooooooooooo......",
    ".....owwwwwwwwwwwwo.....",
    "....owTTTTTTTTTTTTwo....",
    "....owwwwwwwwwwwwwWo....",
    "..oo.oWWWWWWWWWWWWWo.oo.",
    ".oIIooolhhlbbbbbbbbooIIo",
    "..oolhhlbbbbbbbbbbbbdoo.",
    "..olhhbbbbbbbbbbbbbbbdo.",
    ".olhbbbbbbbbbbbbbbbbbbdo",
    ".olbbbbbbbbbbbbbbbbbbbdo",
    "olbbbbbbbbbbbbbbbbbbbbdo",
    "obbbbbbbbbbbbbbbbbbbbbdo",
    "obbbmmmmmmmmmmmmmmmbbbdo",
    "obmmmmmmmmmmmmmmmmmmmbdo",
    "obmmmnnmmmmmmmmmnnmmMbdo",
    "obmmmmmmmmmmmmmmmmmMMbdo",
    "odbMMmmmmmmmmmmmmMMMbddo",
    "oddbMMMMMMMMMMMMMMMbdddo",
    ".oddddddddddddddddddddo.",
    "..obbdo..........obbdo..",
    "..ooooo..........ooooo..",
]
SOAKLING_FACE_TOP, SOAKLING_FACE_SHIFT = face_place(SOAKLING, 6, 4, FACE_W)
SOAKLING_TAGS = body_tags(SOAKLING, 10, 12, flat_rows=3)
HIPPO_ADULT_PALETTE = HIPPO_PALETTE | {
    "o": (70, 45, 75), "d": (175, 120, 165), "b": (215, 160, 200), "l": (235, 195, 220), "h": (250, 225, 240),
    "m": (245, 205, 215), "M": (215, 165, 185), "n": (110, 55, 85),  # Steamo: pink from the heat
    "s": (235, 240, 250), "S": (195, 205, 225),  # steam
    "e": (175, 155, 200), "E": (135, 115, 160), "u": (205, 190, 225),  # Lillypot: still lavender
    "P": (90, 170, 120), "p": (140, 210, 150), "q": (55, 120, 85),  # lily pads
    "L": (250, 170, 200), "Y": (255, 220, 100),  # the lotus
}
# Steamo: the sauna master. Pink from the heat, eyes closed in bliss, a towel wound round its head
# like a turban and one round its middle, steam rising off it. It walks.
STEAMO = [
    "....s.......oooooooooo..........",
    "...sSs....oowwwwwwwwwwoo...s....",
    "....s....owTTwwwwwwwTTwwo.sSs...",
    ".........owwwwTTTTTTwwwwo..s....",
    "........oWwwwwwwwwwwwwwWWo......",
    "......oo.oWWWWWWWWWWWWWWo.oo....",
    ".....oIIooolhhlbbbbbbbbbooIIo...",
    "......oolhhlbbbbbbbbbbbbbdoo....",
    "......olhhbbbbbbbbbbbbbbbbdo....",
    ".....olhbbbbbbbbbbbbbbbbbbdo....",
    ".....olbbbbbbbbbbbbbbbbbbbbdo...",
    "....olbmmmmmmmmmmmmmmmmmmmbdo...",
    "..s.obmmmmnnmmmmmmmmmnnmmmmbdo..",
    ".sSsobmmmmmmmmmmmmmmmmmmmmMbdo..",
    "..s.odmmmmmmmmmmmmmmmmmmmMMbdo..",
    "....odbMMmmmmmmmmmmmmmmMMMbddo..",
    "....oddbMMMMMMMMMMMMMMMMMbdddo..",
    "....owwwwwwwwwwwwwwwwwwwwwwwwo..",
    "....owTTwwwwwwwwwwwwwwwwwTTwwo..",
    "....oWWwwwwwwwwwwwwwwwwwwwwWWo..",
    "....oddbbbbbbbbbbbbbbbbbbbbddo..",
    ".....oddddddddddddddddddddddo...",
    "......obbdo............obbdo....",
    "......ooooo............ooooo....",
]
STEAMO_FACE_TOP, STEAMO_FACE_SHIFT = face_place(STEAMO, 7, 10, 15)
STEAMO_TAGS = species_tags([STEAMO, dots(STEAMO, {(4, 0): ".", (3, 1): ".", (5, 1): ".", (4, 2): ".", (27, 1): ".",
                                                  (26, 2): ".", (28, 2): ".", (27, 3): ".", (4, 1): "s"})], 10, 16)
STEAMO_TAGS["walk"] = walk_tags(STEAMO, 10, range(6, 11), range(23, 28), 22, ms=(240, 140))
# Lillypot: a pond hippo. Lily pads grow on its back like a coat, a lotus is tucked into the
# towel folded on its head, and a lily leaf sticks out on the right. It walks.
LILLYPOT = [
    "...............LL...............",
    "..............LhYL..............",
    "...........oooLLLLooo...........",
    "..........owwwwwwwwwwo..........",
    ".........owTTTTTTTTTTwo.........",
    ".........oWWWWWWWWWWWWo.........",
    "......oo.oeeeeeeeeeeeeo.oo......",
    ".....oIeooeuuueeeeeeeeeooeIo....",
    "......ooueuueeeeeeeeeeeeeEoo....",
    "......oueeeeeeeeeeeeeeeeeEo.ppp.",
    ".....oueeeeeeeeeeeeeeeeeeeEopqqp",
    "....oPPppeemmmmmmmmmmmmeePPPopq.",
    "...oPpppPpmmmmmmmmmmmmmmPppPPo..",
    "..oPpPPpPPmmnnmmmmmmnnmmPPpppPo.",
    "..oPpppPPpmmmmmmmmmmmmmmPpPppPo.",
    "..oPPpPpqpmMmmmmmmmmmmMmpqPpPPo.",
    "..oqPPpPqqpMMMMMMMMMMMMMpPPqPPo.",
    "...oqqPPPPpppPPPpppPPPpppPPqqo..",
    "....oqqqqqqqqqqqqqqqqqqqqqqqo...",
    ".....oEEeeeeeeeeeeeeeeeeeEEo....",
    "......oEEEEEEEEEEEEEEEEEEEo.....",
    "......oeeEo...........oeeEo.....",
    "......ooooo...........ooooo.....",
]
LILLYPOT_FACE_TOP, LILLYPOT_FACE_SHIFT = face_place(LILLYPOT, 8, 11, 13)
LILLYPOT_TAGS = species_tags([LILLYPOT, drop_rows(LILLYPOT, 12)], 12, 16)
LILLYPOT_TAGS["walk"] = walk_tags(LILLYPOT, 12, range(6, 11), range(22, 27), 21, ms=(240, 140))

# ---- The beak line: a bird whose crest stays and whose beak decides what it becomes

BEAK_PALETTE = {
    "o": (60, 45, 40),     # outline
    "d": (120, 95, 80),    # shadow
    "b": (165, 135, 110),  # downy grey-brown
    "l": (200, 175, 150),  # lit
    "h": (230, 215, 195),  # highlight
    "c": (235, 225, 205),  # the belly
    "r": (230, 90, 60),    # the crest
    "R": (170, 55, 40),
    "a": (230, 175, 70),   # beak and legs
    "A": (175, 120, 40),
    "L": (150, 220, 240),  # the lenses of the goggles (the hint)
    "G": (95, 70, 50),     # their frame
}
# Baby: a fluffy chick with a lighter belly and a crest of three feathers
BEAK_BABY = [
    "......r.r.r.....",
    "......rRrRr.....",
    ".....oooRooo....",
    "...oolhllbboo...",
    "..olhhlbbbbbdo..",
    ".ollhbbbbbbbbdo.",
    ".olbbbbbbbbbbdo.",
    "olbbbbccccbbbddo",
    "olbbbccccccbbddo",
    "obdbbccccccbdbdo",
    "odbdbbccccbdbddo",
    "odbdbdbbbbdbdddo",
    ".oooooooooooooo.",
]
BEAK_BABY_TAGS = body_tags(BEAK_BABY, 8, 8, flat_rows=3)
# Crestling, the child: a round young bird. The crest has grown into three feathers, and it wears
# flying goggles pushed up on its head: it wants to fly long before it can. Little wings, thin legs.
CRESTLING = [
    "........r...r...r.......",
    "........rr..r..rr.......",
    ".........rRrRrRr........",
    ".......oooRRRRRooo......",
    ".....oolhhlbbbbbbboo....",
    "....oGGGGGGGGGGGGGGGo...",
    "...oGGLLLGGbbbbGGLLLGGo.",
    "..olGGLhLGGbbbbGGLhLGGdo",
    "..olhGGGGGbbbbbbGGGGGbdo",
    ".olbbbbbbbbbbbbbbbbbbbdo",
    ".olbbbbbbbbbbbbbbbbbbbdo",
    "lobbbbbbbbbbbbbbbbbbbbol",
    "ldobbbbbbbbbbbbbbbbbbodl",
    ".ddobbbbbbbbbbbbbbbbodd.",
    "..dobbbbbccccccbbbbbod..",
    "...obbbbccccccccbbbbo...",
    "...odbbbccccccccbbbdo...",
    "....oddbbccccccbbddo....",
    ".....oooooooooooooo.....",
    "........aa....aa........",
    ".......aAa...aAa........",
    "......aa.a..aa.a........",
]
CRESTLING_FACE_TOP, CRESTLING_FACE_SHIFT = face_place(CRESTLING, 9, 4, FACE_W)
CRESTLING_TAGS = body_tags(CRESTLING, 10, 12, flat_rows=3)
BEAK_ADULT_PALETTE = {
    "o": (35, 30, 45), "r": (230, 70, 55), "R": (165, 40, 35),  # the crest
    "a": (240, 185, 70), "A": (185, 125, 40),  # Rapierre's beak and legs
    "g": (60, 190, 140), "G": (30, 130, 110), "v": (20, 85, 85),  # a hummingbird's green
    "q": (140, 90, 200), "Q": (95, 55, 150), "c": (235, 230, 215),  # its purple collar, the belly
    "S": (190, 200, 210),  # the blur of its wings
    "s": (250, 250, 250), "n": (45, 70, 120), "N": (70, 100, 160), "y": (255, 215, 80),  # the post
    "e": (250, 240, 215), "E": (210, 195, 160),  # letters
    "p": (245, 160, 60), "P": (205, 115, 35),  # the pelican's bill and feet
    "z": (235, 200, 140), "Z": (170, 120, 70),  # the mail bag
}
# Rapierre: a hummingbird fencer. Slim and green, a long needle beak held like a rapier, the crest
# swept back like a musketeer's plume, its wings a blur. It never walks: it hovers.
RAPIERRE = [
    ".............rr.................",
    "...........rrRr.................",
    "..........rRRr..................",
    "...........ooooo................",
    ".........oogggggoo..............",
    "........ogggGGGGGvo.............",
    ".......oggGggggGGvo.............",
    ".......ogGgggggGGvoaaaaaaaaaaaaa",
    ".......oggGggggGGvoAAAAAAAAAAAA.",
    "..S.....ogGGGGGGvo..............",
    ".S.S.S...ooqqqqqoo..............",
    "S.S.S.S.oqQqqqqQqo..............",
    ".S.S.S.oqqcccccqQqo.............",
    "..S.S.oqqcccccccqQo.............",
    ".......oqqccccccccqQo...........",
    ".......oGqqccccccqqGo...........",
    "........oGGqqqqqqqGGo...........",
    ".........oGGGGGGGGvo............",
    "..........oovGGGvoo.............",
    "...........oaoGGoao.............",
    "............o.oGGo..............",
    "..............oGvGo.............",
    ".............oGo.oGo............",
    ".............oo...oo............",
]
RAPIERRE_FACE_TOP, RAPIERRE_FACE_SHIFT = face_place(RAPIERRE, 6, 10, 6)
RAPIERRE_TAGS = species_tags([RAPIERRE, dots(RAPIERRE, {(x, y): ("S" if RAPIERRE[y][x] == "." else ".")
                                                     for y in range(9, 14) for x in range(0, 7)
                                                     if RAPIERRE[y][x] in ".S"})], 13, 13, idle_ms=90)
# Parcelbeak: a pelican mail carrier. A postman's cap with the crest sticking through it, a huge
# bill with a throat pouch full of letters, a mail bag across its chest, big webbed feet. It walks.
PARCELBEAK = [
    ".............r.r.r..............",
    "..............rRr...............",
    "..........oooonRnoooo...........",
    ".........onnnnnnnnnnnno.........",
    "........oNNNNNyyNNNNNNNo........",
    "........oooooooooooooooo........",
    "........osssssssssssssso........",
    "........osssssssssssssso........",
    "........osSsssssssssssSo........",
    ".....ooooopppppppppppppppppppo..",
    "....oPPPPPPPPPPPPPPPPPPPPPPPPo..",
    ".....ooPpppppppppppppppppppoo...",
    ".......oPeeeeEeeeeeeePo.........",
    "......oPeesseeRReesseePo........",
    "......oPeeeeeeRReeeeeePo........",
    ".......oPeeEeeeeeeeEePo.........",
    "........ooPPPPPPPPPPoo..........",
    ".......ossoooooooooosso.........",
    "......ossssSSsssssSSsssso.......",
    ".....osssssZZsssssssssSSso......",
    ".....osSssssSZZZZZZZsssSso......",
    ".....osSsssssZnnyynnZsSSso......",
    "......oSsssssZnnnnnnZsSso.......",
    ".......oSSssssZZZZZZsSSo........",
    "........oooooooooooooo..........",
    ".........ppPp....ppPp...........",
    "........pPpPpp..pPpPpp..........",
]
PARCELBEAK_FACE_TOP, PARCELBEAK_FACE_SHIFT = face_place(PARCELBEAK, 6, 11, 12)
PARCELBEAK_TAGS = species_tags([PARCELBEAK, drop_rows(PARCELBEAK, 19)], 19, 15)
PARCELBEAK_TAGS["walk"] = walk_tags(PARCELBEAK, 19, range(8, 14), range(16, 23), 24, ms=(220, 130))

# Faces. Babies: the slime's baby faces, mouths in the line's colors. Children: the child's
# face; the duckling and the young bird have a bill or a beak instead of a mouth.
LEAF_FACE_PALETTE = FACE_PALETTE | {"d": (60, 140, 55), "m": (25, 80, 35)}
DUCK_FACE_PALETTE = FACE_PALETTE | {"d": (225, 175, 35), "m": (250, 140, 40), "a": (250, 140, 40),
                                    "A": (200, 95, 25), "r": (175, 40, 70)}
HIPPO_FACE_PALETTE = FACE_PALETTE | {"d": (135, 115, 160), "m": (90, 60, 80), "p": (50, 40, 70)}
BEAK_FACE_PALETTE = FACE_PALETTE | {"d": (120, 95, 80), "m": (230, 175, 70), "a": (230, 175, 70),
                                    "A": (175, 120, 40), "p": (45, 35, 35)}
BILL_SHUT = ["aaaaaa", ".AAAA."]
BILL_OPEN = ["aaaaaa", "ArrrrA", ".AAAA."]
BEAKLET_SHUT = ["aaaa", ".AA."]
BEAKLET_OPEN = ["aaaa", "ArrA", ".AA."]


def billed_face_grid(shut, open_):
    def grid(eyes, mouth, blush):
        rows = [list(r) for r in face_grid(eyes, "none", blush)] + [list("." * FACE_W)]
        bill = open_ if mouth in ("open", "laugh") else shut
        left = (FACE_W - len(bill[0])) // 2
        for y, line in enumerate(bill):
            for x, ch in enumerate(line):
                if ch != ".":
                    rows[6 + y][left + x] = ch
        return ["".join(r) for r in rows]
    return grid


duck_face_grid = billed_face_grid(BILL_SHUT, BILL_OPEN)
beak_face_grid = billed_face_grid(BEAKLET_SHUT, BEAKLET_OPEN)

# The adults' faces (kit_face): each its own set and palette
twiggle_face_grid = kit_face(7)
TWIGGLE_FACES = kit_faces(normal=("half", "small", False))  # calm, wise, a little sleepy
TWIGGLE_FACE_PALETTE = {"w": (245, 240, 225), "p": (55, 35, 20), "g": (255, 255, 255), "d": (105, 70, 40),
                        "m": (60, 40, 22), "r": (170, 60, 50), "k": (230, 140, 120)}
needlenub_face_grid = kit_face(7)
NEEDLENUB_FACES = kit_faces(normal=("open", "small", True))  # always hoping for a cuddle
NEEDLENUB_FACE_PALETTE = {"w": (240, 250, 235), "p": (25, 50, 30), "g": (255, 255, 255), "d": (55, 140, 55),
                          "m": (25, 60, 30), "r": (200, 60, 90), "k": (255, 150, 190)}
drakwing_face_grid = kit_face(7, mouth_row=0)
DRAKWING_FACE_PALETTE = {"w": (240, 250, 235), "p": (20, 40, 30), "g": (255, 255, 255), "d": (20, 95, 60),
                         "k": (255, 130, 110)}
quill_face_grid = kit_face(7, mouth_row=0)
QUILL_FACE_PALETTE = {"w": (255, 255, 255), "p": (35, 45, 90), "g": (255, 255, 255), "d": (225, 175, 35),
                      "k": (255, 150, 150)}
steamo_face_grid = kit_face(9, mouth_row=6)
STEAMO_FACES = kit_faces(normal=("closed", "small", True), smile=("closed", "small", True),
                         blink=("closed", "small", True))  # its eyes closed in bliss
STEAMO_FACE_PALETTE = {"w": (255, 250, 252), "p": (110, 55, 85), "g": (255, 255, 255), "d": (175, 120, 165),
                       "m": (110, 55, 85), "r": (200, 70, 100), "k": (245, 120, 150)}
lillypot_face_grid = kit_face(7, mouth_row=6)
LILLYPOT_FACE_PALETTE = {"w": (245, 245, 255), "p": (50, 40, 70), "g": (255, 255, 255), "d": (135, 115, 160),
                         "m": (90, 60, 80), "r": (200, 80, 110), "k": (250, 170, 200)}
rapierre_face_grid = kit_face(0, mouth_row=0, single=True)
RAPIERRE_FACE_PALETTE = {"w": (240, 255, 250), "p": (20, 40, 40), "g": (255, 255, 255), "d": (20, 85, 85),
                         "k": (255, 130, 140)}
parcelbeak_face_grid = kit_face(6, mouth_row=0)
PARCELBEAK_FACE_PALETTE = {"w": (255, 255, 255), "p": (35, 30, 45), "g": (255, 255, 255), "d": (190, 200, 210),
                           "k": (255, 160, 160)}
# ---------------------------------------------------------------- Special forms

# The secret third adult of a line (docs/pets.md): the most impressive of the three. Drawn from shapes
# with an outline and a light from the top left, the faces from kit_face.

# Salamber (ember): a fire salamander of glowing crust. A crest of flames runs over its head, its
# tail curls up into a torch, glowing spots dot its back, and it sits on a lump of cooling lava.
SALAMBER_PALETTE = {
    "o": (70, 22, 18), "b": (125, 48, 38), "d": (255, 120, 30), "l": (120, 78, 60), "h": (92, 32, 28),
    "m": (255, 150, 50), "e": (255, 220, 90), "y": (255, 200, 60), "r": (255, 210, 90), "t": (165, 75, 52),
    "w": (255, 200, 90), "s": (255, 250, 220), "g": (255, 140, 40),
}
SALAMBER = [
    "..........d...dded....d.........",
    "..........d..dddedd...d.........",
    "...w.....deddddeeddd.ded........",
    ".........dedddeeeedd.ded....d...",
    "........deedoooooooddeed....d.w.",
    ".......deoootbbbbbboooeed..ddd..",
    ".......dotbyybbbbbbbyyoed..ded..",
    "......ootbbyybbbbbbbyyboo.dded..",
    ".w...otbbbbbbbbbbbbbbbbbbodeedd.",
    "....otyybbbbbbbbbbbbbbbbyyoeeedd",
    "....obyybbbbbbbbbbbbbbbbyyoeeedd",
    "...otbbbbbbbbbbbbbbbbbbbbbhosedd",
    "...obbbbbbbbbbbbbbbbbbbbbbhoeddd",
    "...obbbbbbbbbbbbbbbbbbbbbbhoddd.",
    "...obbbbbbbbbbbbbbbbbbbbbhhoddho",
    "...obbbbbbbbbbbbbbbbbbbbbhhobhho",
    "....oyybbbbbbbbbbbbbbbbbhyybhhho",
    "....oyybbbbbbbbbbbbbbbbbbyyhhho.",
    ".....obbbbbbbmmmmmbbbbbbbobhho..",
    "....otbbbbbbmmmmmmmbbbbbbboho...",
    "...otbbbbbbmmmrrrmmmbbbbbbboo...",
    "..otbbbbbbmmmrrrrrmmmbbbbbbbo...",
    ".otbbbbbbbmmrrrrrrrmmbbbbbbbho..",
    ".obbyybbbbmmrrrrrrrmmbbbbbyyho..",
    ".obbyybbbbbmmrrrrrmmbbbbbbyyho..",
    "..obbhhbbbbbmmrrrmmbhhbbbhhholo.",
    ".olohhhoohbbbmmmmmhhhhoohhholllo",
    ".ollooolgooohhhhhhhooohhooollllo",
    "..ollllllllloooooooloooollllllo.",
    "...oollllllllllllllllllllllloo..",
]
SALAMBER_FACE_TOP, SALAMBER_FACE_SHIFT = face_place(SALAMBER, 10, 7, 16)
SALAMBER_TAGS = species_tags([SALAMBER, drop_rows(SALAMBER, 12)], 12, 15)

# Lunarock (stone): a stone giant with a geode for a heart. Its chest has cracked open, and in a ring
# of amethyst sits a moonstone that waxes and wanes with the real moon (the code darkens it, MOON_PHASE
# in core/src/scene.ts). Big fists, and little stones circling it like moons.
LUNAROCK_PALETTE = {
    "o": (62, 64, 95), "b": (150, 156, 172), "d": (108, 114, 132), "l": (196, 200, 214), "h": (150, 110, 210),
    "m": (248, 246, 215), "e": (180, 205, 255), "y": (205, 175, 245), "r": (100, 70, 160),
}
LUNAROCK = [
    "....e...........................",
    ".............ooooooo............",
    "...........oollllllloo.......ll.",
    "..........olllbbbbbbblo......ll.",
    "..ll.....ollbbbbbbbbbbbo........",
    "..ll....ollbbbbbbbbbbbbbo.......",
    ".......ollbbbbbbbbbbbbbbbo......",
    "......ollbbbbbbbbbbbbbbbddo.....",
    ".....ollbbbbbbbbbbbbbbbdbddo....",
    ".....olbbbbbbbbbbbbbbbbbbbde....",
    "...oooldbbbbbbbbobbbbbbbbbbooo..",
    "..ollllbdbbbbbbohobbbbbbbbbbllo.",
    ".ollbbbbbbboooohyhoooobbbbbbbbdo",
    "ollbbbbbbbbohhheeehrhobbbbbbbbdd",
    "llbbbbbbbbboyhemmmmhyobbbbbbbddd",
    "lbdbbbbbbbbohemmmmmehobbbbbbbbdd",
    "lbbbbbbbbbohhemmmmmehhobbbbbbbdd",
    "lbbbbbbbbohyhemmmmmehyhobbbbbddd",
    "obbbdbbbbbboohemmmmhrobbdbbbdddd",
    ".oddddbbbbbborheeehhobbddddddddo",
    "..odddobbbbbooyhohyoobbdddodddo.",
    "...ooo.obbbbbohbbbhobbbddo.ooo..",
    ".......olbbbbobbbbbobbbddd......",
    ".......olbbbbbbbbbbbbbbddo......",
    ".......olbbbdddddbbbbbbddo....dd",
    ".e.....olbbbddddddbbbbbddo....dd",
    ".......oddddddoooooddddddo......",
    ".......oddddddo...oddddddo......",
]
LUNAROCK_FACE_TOP, LUNAROCK_FACE_SHIFT = face_place(LUNAROCK, 5, 9, 15)
LUNAROCK_TAGS = species_tags([LUNAROCK, drop_rows(LUNAROCK, 22)], 22, 16)

# Foxfire (fox): a white fox spirit with three tails, a blue fox fire burning at the tip of each, and
# red marks round its eyes.
FOXFIRE_PALETTE = {
    "o": (95, 85, 140), "b": (250, 246, 240), "d": (228, 224, 240), "l": (110, 200, 255), "h": (255, 236, 214),
    "m": (205, 200, 215), "e": (180, 175, 200), "y": (220, 245, 255), "r": (255, 255, 255), "t": (225, 60, 70),
    "w": (225, 205, 190),
}
FOXFIRE = [
    "....l..........lll.........l....",
    "....l.......yolllllo.......l....",
    "...lll......olllylldo.....lll...",
    "...lll......ollyyyldo.....lll...",
    ".ollllloo..ordllyldddoo.olllllo.",
    "olllylloro.odddllddddomolllylleo",
    "ollyyylobbooddddddddormollyyyleo",
    "rdllyldobbbodddddddorbmodllyldee",
    "rddllddobtbbooooooorbtboddllddee",
    "rddddddobttbbbbbbbbbttboddddddee",
    "odddddorbttbbbbbbbbbttbmoddddeeo",
    "odddddobbbbbbbbbbbbbbbbmoddeeeeo",
    ".oodddobbbbbbbbbbbbbbbbbodeeeoo.",
    "...oddobbbbbbbbbbbbbbbbboeeeo...",
    "....oorbbbbbbbbbbbbbbbbbmoeo....",
    ".....obbbbbbbbbbbbbbbbbbboo.....",
    ".y...obbbbbbbbbbbbbbbbbbbo......",
    "....orbbbbbbbbbbbbbbbbbbbmo.....",
    "....obbbbbbbbbbbbbbbbbbbbmo...y.",
    "....obbbbbbbbbbbbbbbbbbbbmo.....",
    "....obbbbhhhhhhhhhhhhbbbbmo.....",
    "....obbbhhhhhhhhhhhhhhbbmmo.....",
    "....obbhhhhhwhhhhwhhhhhmmmo.....",
    ".....obbhhhhhhhhhhhhhhbmmo......",
    "......obbhhhhhhhhhhhhbmmo.......",
    "......ommmbbbbbbbbbbmmmmo.......",
    ".......mmmmbbbbbbbbmmmmo........",
    "........oobbbbbbbmmmmoo.........",
    "..........oommmmmmmoo...........",
    "............ooooooo.............",
]
FOXFIRE = dots(FOXFIRE, {(7, 14): "t", (7, 15): "t", (22, 14): "t", (22, 15): "t"})
FOXFIRE_FACE_TOP, FOXFIRE_FACE_SHIFT = face_place(FOXFIRE, 14, 7, 16)
FOXFIRE_TAGS = species_tags([FOXFIRE, drop_rows(FOXFIRE, 18)], 18, 15)

# Flurrbleat (cloud): a snow cloud that has become a sheep. Curly cloud wool, a dark sheep's face with
# curled horns like Rumblefluff's, a knitted scarf, and under it it always snows a little: its legs are
# falling snow, as the cloud line's are rain.
FLURRBLEAT_PALETTE = {
    "o": (40, 45, 72), "b": (246, 249, 255), "d": (88, 92, 120), "l": (255, 255, 255), "h": (222, 64, 74),
    "m": (206, 216, 236), "e": (160, 36, 52), "y": (240, 200, 160), "r": (165, 182, 215), "t": (200, 150, 110),
    "w": (250, 236, 220), "s": (62, 66, 92),
}
FLURRBLEAT = [
    "..........oooo...oooo...........",
    "........oobbbboooobbbboo........",
    "......oobbbbmbbbbbbmbbbboo......",
    ".....obbbmbbbbbbbbbbbbbmbbo.....",
    "....obbbbbbbbbbbbbbbbbbbbbbo....",
    "...obbmbbbooooooooooobbbmbbbo...",
    "..oytobbbodddddddddddobbbboyto..",
    ".oyttyobodddddddddddddobboyytto.",
    ".oytoyomodddddddddddddomoyoytto.",
    ".oyyoobbodddddddddddddobbooyyyo.",
    "..oo.obbodddddddddddddobbo.ooo..",
    "....obbboddddddddddddobbmbo.....",
    "...obbbbmosddddddddsombbbbbo....",
    "..ombbbboohhhhhhhhhhhhobbbbmo...",
    "..obbbbbohwhhwhhwhhwhhhobbbbbo..",
    "..ombbbbboeeeeeeeeeeehhhobbbmo..",
    "...ombbbbbbbbbbbbbbboehehobmo...",
    "....oormrrrmrrrrrmrroeheoroo....",
    "......oooooooooooooooeho.oo.....",
    "........l....l....l..oo.l.......",
    ".......lll..l.l..lll...lll......",
    "........l....l....l.....l.......",
    "...........l....l....l..........",
    "..........lll..lll..lll.........",
    "...........l....l....l..........",
]
FLURRBLEAT_FACE_TOP, FLURRBLEAT_FACE_SHIFT = face_place(FLURRBLEAT, 7, 10, 12)
FLURRBLEAT_TAGS = species_tags([FLURRBLEAT, drop_rows(FLURRBLEAT, 11)], 11, 15)

# Sakurin (leaf): a cherry tree in full bloom. A cloud of blossom for a crown, a painted fan in one
# hand, a red lacquer pot with a gold band (the line's seed shell), and petals drifting round it.
SAKURIN_PALETTE = {
    "o": (105, 38, 70), "b": (245, 165, 195), "d": (125, 80, 55), "l": (165, 40, 55), "h": (250, 240, 230),
    "m": (240, 200, 80), "e": (255, 215, 230), "y": (85, 52, 38), "r": (205, 110, 155), "t": (190, 35, 45),
    "w": (255, 255, 255), "s": (160, 110, 75),
}
SAKURIN = [
    "...........ooeeeeeeeoo..........",
    "..........oebbbbbbbbbbo.........",
    ".....oooooebbbbbbbbbbbbooooo....",
    "...ooebbbbbbbbwrbbbbbbbbbbbboo..",
    "..oebbbbbbbbbbbbbbbbbbbbbbbbbbo.",
    ".oebbbbbbbbbbbbbbbbbbbwrbbbbbbro",
    ".obbbbwrbbbbbbbbbbbbbbbbbbbbbbro",
    "oebbbbbbbbbbbbbbbbbbbbbbbbbbbbrr",
    "obbbbbbbbbbbbbbbbbbbbbbbbbbbbbrr",
    "obbbbbbbbbbbbbbbbbbwrbbbbbbwrbrr",
    ".obbbbbbbbbbbbbbbbbbbbbbbbbbooro",
    ".obbbbbbbbwooooooooooobbbbbobboo",
    "..obooobboosddddddddddoobbobbbbo",
    "..oohhhoosddddddddddddddoobbbbbb",
    ".ohhhhhthoddddddddddddddoobbbbbb",
    "ohthbhhthhoddddddddddddddodbbbbo",
    "ohhthhthhodddddddddddddddddybbo.",
    "hhhthhthoddddddddddddddddyyyyo..",
    "hhbetthoddddddddddddddddyyyoo...",
    "hhhhhtodddddddddddddddddyyo.....",
    "ooooooddddddddddddddddddyo......",
    "....oyoodddddddddddddddyyo...be.",
    ".....o.odddddddddddddddyyo......",
    ".be..ooooooooooooooooooooooo....",
    "....olllllllllllllllllllllllo...",
    ".....ommmmmmmmmmmmmmmmmmmmmo....",
    ".....olllllllllllllllllllllo..be",
    "...be.olllblllllblllllblllo.....",
    "......olllllllllllllllllllo.....",
    ".......olllllllllllllllllo......",
]
SAKURIN_FACE_TOP, SAKURIN_FACE_SHIFT = face_place(SAKURIN, 15, 8, 16)
SAKURIN_TAGS = species_tags([SAKURIN, drop_rows(SAKURIN, 17)], 17, 15)

# Bubblehelm (duck): a deep-sea diver. A brass helmet with three portholes (the duck looks out of the
# front one), an air hose, a canvas suit, lead boots and a lantern; bubbles rise from its valve.
BUBBLEHELM_PALETTE = {
    "o": (75, 55, 30), "b": (215, 160, 60), "d": (110, 125, 150), "l": (255, 215, 70), "h": (95, 105, 140),
    "m": (150, 100, 35), "e": (150, 210, 235), "y": (220, 245, 255), "r": (245, 140, 40), "t": (255, 240, 150),
    "w": (250, 210, 110), "s": (120, 105, 85), "g": (75, 85, 110), "n": (200, 100, 30), "p": (255, 255, 255),
    "k": (150, 165, 190),
}
BUBBLEHELM = [
    ".............oommmoo.y.....y.y..",
    "...........oowbmmmbbyoy.yy..y...",
    ".........oowbbbbbbbbbyoy..y.....",
    "........owbbbbbbbbbbbbbyo.y.....",
    ".......owbbbbbbbbbbbbbbbyy......",
    "......owbbbbbbooooobbbbbbbo.....",
    "......obbbbbooeeeeeoobbbbbo.....",
    ".....owbbbboppllllleeobbbbbo....",
    "...s.obbbboeellllllleeobbbbo....",
    "...soooobboellllllllleobboooo...",
    "...sooeoooellllllllllleoooeoo...",
    "...soeeeooellllllllllleooeeeo...",
    "..s.ooeoooellrrrrrrllleoooeoo...",
    "..s.ooooboelrrrrrrrrlleoboooo...",
    "..s.obbbbbollnnnnnnlllobbbmmo...",
    "...soobbbboellllllllleobbmmooo..",
    "..osdobbbbboellllllleobbbmmoddo.",
    ".okdsdobbbbboollllloobbbmmodddgo",
    "okdddsobbbbbbbooooobbbbbmmodddgg",
    "oddddddobbbbbbbbbbbbbbbbmoooooog",
    "oddddddobwbbwbbwbbwbbwbbwobbbbbo",
    "oddddddobbbbbbbbbbbbbbbmmobtttbo",
    ".odddddommmmmmmmmmmmmmmmmobtttbo",
    "..ogddddoooooooooooooooooobtptbo",
    "...ooodddddddddddddddddddobtttbo",
    "......oddddddddddddddddddobtttbo",
    "......oddddddddddddddddddobbbbbo",
    "......ohhhhhhhdddddhhhhhhhooooo.",
    "......ohhhhhhhggggghhhhhhho.....",
    "......ohhhhhhhooooohhhhhhho.....",
]
BUBBLEHELM_FACE_TOP, BUBBLEHELM_FACE_SHIFT = face_place(BUBBLEHELM, 9, 10, 12)
BUBBLEHELM_TAGS = species_tags([BUBBLEHELM, drop_rows(BUBBLEHELM, 24)], 24, 16)

# Hippula (hippo): an eloquent vampire count. A cape with a high collar and red lining, slicked-back
# hair, a monocle on a chain, a waistcoat with a bow, two little fangs and a glass of berry juice. The
# line's towel hangs over its arm like a waiter's napkin.
HIPPULA_PALETTE = {
    "o": (55, 20, 60), "b": (190, 160, 205), "d": (95, 45, 105), "l": (225, 185, 205), "h": (146, 116, 165),
    "m": (70, 35, 85), "e": (190, 30, 50), "y": (250, 248, 240), "r": (222, 200, 232), "t": (240, 200, 80),
    "w": (250, 240, 235), "s": (210, 230, 245), "g": (150, 20, 50), "n": (110, 15, 40), "p": (230, 120, 140),
}
HIPPULA = [
    "......o...................o.....",
    ".....odo.oo...........oo.odo....",
    ".....oddorro..ooooo..orhoddo....",
    "....odeorrmmmmmmmmmmmmmhhoedo...",
    "....odeorbmmmmmmmmmmmmmhhoedo...",
    "....odeeobbbmmmmmmmmmbhhoeedo...",
    "....oddeorbbbbmmmmmbttbhoeddo...",
    "...odddeorbbbbbbmbbtbbthoedddo..",
    "...ododorrbbbbbbbbtbbbbthododo..",
    "....oodorbbbbbbbbbtbbbbthodoo...",
    ".....odorbbbblllllltbbtthodo....",
    "....oddorbbllllllllltththoddo...",
    "....oddorblllllllllllllhosssso..",
    "....odddolllllllllllllllosggso..",
    "....odddollllllllllllllloggggo..",
    "....odddollllllllllllllloonno...",
    "...odddorrlllllllllllllbhooodo..",
    "...oddbbbbblllllllllllbbbboodo..",
    "...odbbbbbbbbleeleelbbbbbbbooo..",
    "...odbbbbbbbbyyeeeyybbbbbbbddo..",
    "..odwwwwbbbbbbeeyeebbbbbbbbdddo.",
    "..odwppwbbbbbbyyyyybbbbbbbodddo.",
    "..odwwwwbbbbbbbyyybbbbhhhoddddo.",
    "..oddwworbbbbbbyyybbbhhhhoddddo.",
    "..odddddobbbbbbbybbbhhhhodddddo.",
    ".odddddddohbbbbbybhhhhhodddddddo",
    ".oddddddddohhhhhhhhhhhoddddddddo",
    ".odddddddddoohhhhhhhoodddddddddo",
]
HIPPULA = dots(HIPPULA, {(14, 14): "y", (17, 14): "y"})
HIPPULA_FACE_TOP, HIPPULA_FACE_SHIFT = face_place(HIPPULA, 7, 9, 14)
HIPPULA_TAGS = species_tags([HIPPULA, drop_rows(HIPPULA, 14)], 14, 16)

# Acewing (beak): a swift who flies stunts. Its wings held out stiff like a little plane's, a leather
# flying cap with the goggles pushed up, an open flying jacket, and a long white scarf streaming behind.
# The red crest of the line sticks out of the cap.
ACEWING_PALETTE = {
    "o": (35, 45, 100), "b": (140, 85, 45), "d": (60, 80, 140), "l": (245, 242, 235), "h": (55, 70, 125),
    "m": (250, 248, 240), "e": (210, 210, 220), "y": (225, 50, 60), "r": (150, 220, 240), "t": (250, 190, 60),
    "w": (100, 125, 185), "s": (245, 150, 40), "g": (215, 140, 40),
}
ACEWING = [
    "..............y.y.y.............",
    "...............yyy..............",
    "................y...............",
    ".............bbbbbbb............",
    "...........bbbbbbbbbbb..........",
    "..........ooooobbooooob.........",
    ".........borrrooorrrrobb........",
    ".........booooobbooooobb........",
    "........bbbbbbbbbbbbbbbbb.......",
    "........bbbbbbbbbbbbbbbbb.......",
    ".......obbbdddddddddddbbbo......",
    ".......obbbdddddddddddbbbo......",
    ".......obbbdddddddddddbbbo......",
    ".......obbbdddddddddddbbbo......",
    ".......obbbdddttttddddbbbo......",
    "....ooowbbbddddggdddddbbbdooo...",
    ".ooowdddodddddddddddddhhoddddooo",
    "owdddddddommmmmmmmmmmmdoddddddhh",
    ".odddddddomeeeeeeeeeemmmmddddhho",
    ".oddddddowbbbblllllbmeemmmddhhho",
    "..ohhhhhodbbbblllllbbbmmmmhhhho.",
    "...oooooodbbbblllllbbbbhoooooo..",
    "........odbbbblllllbbbbho.......",
    "........oddbbblllllbbbhho.......",
    "........oddbbblllllbbbhho.......",
    ".........odbbblllllbbbho........",
    ".........odbbblllllbbbho........",
    "..........oddblllllbhho.........",
    "...........ohhhlllhhho..........",
    "............osshsshoo...........",
]
ACEWING_FACE_TOP, ACEWING_FACE_SHIFT = face_place(ACEWING, 10, 9, 14)
ACEWING_TAGS = species_tags([ACEWING, drop_rows(ACEWING, 22)], 22, 16)

# Their faces
salamber_face_grid = kit_face(10)
SALAMBER_FACE_PALETTE = {"w": (255, 250, 235), "p": (60, 20, 15), "g": (255, 255, 255), "d": (125, 48, 38),
                         "m": (255, 170, 60), "r": (200, 60, 40), "k": (255, 140, 90)}
lunarock_face_grid = kit_face(9)
LUNAROCK_FACE_PALETTE = {"w": (240, 245, 255), "p": (40, 42, 70), "g": (255, 255, 255), "d": (108, 114, 132),
                         "m": (55, 58, 85), "r": (190, 80, 100), "k": (255, 170, 190)}
foxfire_face_grid = kit_face(10)
FOXFIRE_FACE_PALETTE = {"w": (255, 255, 255), "p": (40, 30, 60), "g": (255, 255, 255), "d": (205, 200, 215),
                        "m": (60, 40, 70), "r": (220, 80, 100), "k": (255, 170, 190)}
flurrbleat_face_grid = kit_face(6, mouth_row=4)
FLURRBLEAT_FACE_PALETTE = {"w": (240, 245, 255), "p": (25, 25, 45), "g": (255, 255, 255), "d": (88, 92, 120),
                           "m": (230, 200, 210), "r": (200, 70, 90), "k": (240, 140, 170)}
sakurin_face_grid = kit_face(10)
SAKURIN_FACE_PALETTE = {"w": (255, 250, 240), "p": (55, 30, 20), "g": (255, 255, 255), "d": (125, 80, 55),
                        "m": (60, 35, 22), "r": (190, 60, 70), "k": (255, 160, 190)}
bubblehelm_face_grid = kit_face(6, mouth_row=0)
BUBBLEHELM_FACE_PALETTE = {"w": (255, 255, 255), "p": (40, 40, 70), "g": (255, 255, 255), "d": (225, 175, 35),
                           "k": (255, 150, 150)}
hippula_face_grid = kit_face(8, mouth_row=5)
HIPPULA_FACES = kit_faces(normal=("half", "small", False))  # a count looks at you from under heavy lids
HIPPULA_FACE_PALETTE = {"w": (255, 250, 255), "p": (60, 25, 60), "g": (255, 255, 255), "d": (146, 116, 165),
                        "m": (90, 30, 60), "r": (190, 30, 50), "k": (240, 150, 190)}
acewing_face_grid = kit_face(8, mouth_row=0)
ACEWING_FACE_PALETTE = {"w": (255, 255, 255), "p": (25, 30, 60), "g": (255, 255, 255), "d": (60, 80, 140),
                        "k": (255, 140, 150)}
SPECIAL_FORMS = (("salamber", FACES), ("lunarock", FACES), ("foxfire", FACES), ("flurrbleat", FACES),
                 ("sakurin", FACES), ("bubblehelm", BEAKED_FACES), ("hippula", HIPPULA_FACES),
                 ("acewing", BEAKED_FACES))

# ---------------------------------------------------------------- The garden lines

# Four more lines, each with its egg, baby, child, a basic adult, a second one and a secret one,
# drawn after the drafts like the special forms. What every form of a line keeps: the pink pompoms
# on the feelers (caterpillar), the floppy ear and the pricked one (dog), the four wings (dragonfly,
# wherever they have gone) and the buck teeth (beaver). The child carries the colors the code may
# recolor as a hint at its adult form: the pompoms, the ears, the goggles' frame, the pencil.

# The eggs: a leaf-green egg in soft rings with a bite out of its top; a cream egg with a brown
# patch and a paw print; a glassy blue egg with a shimmer of green, blue and violet across it; an
# egg of wood with growth rings and gnaw marks bitten into one side.
CATERPILLAR_EGG = [
    "....o..o....",
    "...ohe.eo...",
    "..oheeooeo..",
    "..oeeeeeeo..",
    ".orrrrrrrro.",
    ".oeeeeeeeEo.",
    ".oeeeeeeeEo.",
    ".orrrrrrrro.",
    ".oeeeeeeeEo.",
    ".oeeeeeeeEo.",
    "..orrrrrro..",
    "..oEeeeeEo..",
    "...oEEEEo...",
    "....oooo....",
]
DOG_EGG = [
    "....oooo....",
    "...ottheo...",
    "..otttteeo..",
    "..otTtteeo..",
    ".otTttteeeo.",
    ".otttteeeEo.",
    ".ottteeeeEo.",
    ".oteeeepepo.",
    ".oeeeeeeeEo.",
    ".oeeeeppeEo.",
    "..oeeepppo..",
    "..oEeeeeEo..",
    "...oEEEEo...",
    "....oooo....",
]
DRAGONFLY_EGG = [
    "....oooo....",
    "...ohheeo...",
    "..oheeeeeo..",
    "..oeeeeggo..",
    ".oeeeeggbbo.",
    ".oeeeggbbvo.",
    ".oeeggbbvEo.",
    ".oeggbbvveo.",
    ".oggbbvveEo.",
    ".obbvveeeEo.",
    "..ovveeeEo..",
    "..oEeeeeEo..",
    "...oEEEEo...",
    "....oooo....",
]
BEAVER_EGG = [
    "....oooo....",
    "...ohheeo...",
    "..oheerreo..",
    "..oerreero..",
    ".oerreeerro.",
    ".oereerreEo.",
    ".oereereo...",
    ".oereerew...",
    ".oereereo...",
    ".oerreerreo.",
    "..oerrreEo..",
    "..oEeeeeEo..",
    "...oEEEEo...",
    "....oooo....",
]
EGG_GRIDS |= {"caterpillar": CATERPILLAR_EGG, "dog": DOG_EGG, "dragonfly": DRAGONFLY_EGG, "beaver": BEAVER_EGG}
RARE_EGG_PALETTES |= {
    "caterpillar": {"o": (40, 80, 35), "e": (170, 220, 110), "E": (120, 180, 75), "h": (225, 250, 185),
                    "r": (140, 200, 90), "x": (30, 60, 25)},
    "dog": {"o": (85, 60, 40), "e": (250, 235, 205), "E": (215, 195, 160), "h": (255, 250, 235), "t": (160, 105, 60),
            "T": (125, 80, 45), "p": (110, 75, 45), "x": (70, 45, 30)},
    "dragonfly": {"o": (30, 60, 95), "e": (120, 190, 230), "E": (80, 145, 195), "h": (215, 245, 255),
                  "g": (120, 225, 170), "b": (90, 150, 245), "v": (180, 130, 235), "x": (20, 40, 70)},
    "beaver": {"o": (70, 45, 25), "e": (200, 150, 95), "E": (160, 110, 65), "h": (235, 195, 140), "r": (150, 100, 55),
               "w": (245, 225, 190), "x": (50, 30, 15)},
}


def buck_teeth(face, rows):
    """A face grid function with two buck teeth, `rows` long, under the middle of its bottom row."""
    def grid(eyes, mouth, blush):
        out = [list(r) for r in face(eyes, mouth, blush)]
        width = len(out[0])
        for _ in range(rows):
            out.append(list("." * width))
            out[-1][width // 2 - 1] = out[-1][width // 2] = "W"
        return ["".join(r) for r in out]
    grid.width = getattr(face, "width", None)
    return grid


def nosed(face, nose):
    """A face grid function with a nose between the eyes (and what sits under it), from their bottom row."""
    def grid(eyes, mouth, blush):
        out = [list(r) for r in face(eyes, mouth, blush)]
        for y, line in enumerate(nose):
            left = (len(out[0]) - len(line)) // 2
            for x, ch in enumerate(line):
                out[2 + y][left + x] = ch
        return ["".join(r) for r in out]
    grid.width = face.width
    return grid


# ---- The caterpillar line: a caterpillar that becomes a moth or a butterfly

CATERPILLAR_PALETTE = {
    "o": (35, 85, 40),     # outline
    "d": (80, 160, 60),    # shadow
    "b": (130, 205, 85),   # leaf green
    "l": (180, 235, 130),  # lit
    "h": (225, 250, 190),  # highlight
    "r": (75, 150, 50),    # the rings
    "p": (245, 110, 170),  # the pompoms on the feelers (the hint)
    "P": (200, 70, 130),
    "w": (250, 248, 240),  # the bib
    "W": (215, 210, 205),
    "k": (240, 125, 175),  # its rim
}
# Baby: a plump green slime in rings, two feelers with pink pompoms, a row of little feet
CATERPILLAR_BABY = [
    "....pp....pp....",
    "....Pp....Pp....",
    ".....o....o.....",
    "......o..o......",
    "...oolhllbboo...",
    "..olhhlbbbbbdo..",
    ".ollhbbbbbbbbdo.",
    ".olbbbbbbbbbbdo.",
    "orrrrrrrrrrrrrro",
    "olbbbbbbbbbbbddo",
    "obbbbbbbbbbbbddo",
    "orrrrrrrrrrrrrro",
    "oddddddddddddddo",
    ".oo.oo.oo.oo.oo.",
]
CATERPILLAR_BABY_TAGS = body_tags(CATERPILLAR_BABY, 6, 8, flat_rows=3)
# Munchlet, the child: a fat caterpillar, its head in front and two rings of its body behind it,
# a bib on (it never stops eating), the feelers grown long, a row of stubby feet
MUNCHLET = [
    "............pp.........pp.....",
    "............pPp.......pPp.....",
    ".............o.........o......",
    "..............o.......o.......",
    "...............o.....o........",
    "...............oooooooo.......",
    "............ooolllllbbbooo....",
    "...........ohlllllllbbbbbbo...",
    "..........olllbbbbbbbbbbbbdo..",
    ".........ollllbbbbbbbbbbbbddo.",
    "........olllllbbbbbbbbbbbbdddo",
    "...oooooobbbbbbbbbbbbbbbbbdddo",
    ".oollbboobbbbbbbbbbbbbbbbbdddo",
    ".olbbbolobbbbbbbbbbbbbbbbbdddo",
    "ollbbbobobbbbbbbbbbbbbbbbbdddo",
    "obbbbbobobbbbbbbbbbbbbbbbbdddo",
    "obbbbbobobbbbbbbbbbbbbbbbbdddo",
    "obbbbbobboddddddddddddddddddo.",
    "obbbbboddoddddkkkkkkkkkkddddo.",
    "oddddddoooooookwwwwwwwwkoooo..",
    ".ooooooooo.oo.okwwwwwwkoo.oo..",
    "................kWWWWk........",
]
MUNCHLET_FACE_TOP, MUNCHLET_FACE_SHIFT = face_place(MUNCHLET, 9, 11, FACE_W)
MUNCHLET_TAGS = body_tags(MUNCHLET, 15, 19, flat_rows=3)
# Mothmuff: a ball of fur with feathery feelers, its wings hanging round it like a cloak with an
# eye spot on each side; sleepy eyes, a fur ruff under its chin. It hops.
MOTHMUFF_PALETTE = {
    "o": (55, 42, 52), "b": (190, 175, 185), "l": (215, 205, 212), "h": (240, 235, 238), "d": (150, 135, 148),  # fur
    "w": (130, 110, 120), "x": (165, 145, 150), "X": (100, 82, 92), "e": (245, 205, 120), "E": (90, 60, 55),  # wings
    "c": (250, 246, 238), "C": (220, 212, 205),  # the ruff
    "p": (245, 110, 170), "P": (200, 70, 130), "f": (120, 100, 90),  # the feelers
}
MOTHMUFF = [
    "........pp...........pp.......",
    "........Pp...........Pp.......",
    "........fff.........fff.......",
    "..........f.........f.........",
    ".........fff.......fff........",
    "...........f.......f..........",
    "..........fff.....fff.........",
    "............o.o.o.f...........",
    "...........fooooooff..........",
    "........o.oolllllboo.o........",
    "......oooollllllbbbboooo......",
    "....oowohllllllbbbbbbboxoo....",
    "...oxwwollllllbbbbbbbboxxxo...",
    "..oxwwollllllbbbbbbbbbboxwwo..",
    "..oxwwolllllbbbbbbbbbbboxwwo..",
    "..owwwollllbbbbbbbbbbbdowwwo..",
    ".oxwwwolllbbbbbbbbbbbddowwwwo.",
    ".oxwwwollbbbbbbbbbbbdddowwwwo.",
    ".owwwwolbbbbbbbbbbbddddowwwwo.",
    "oxEEEEoCCCCCCCCCCCCCCCCoEEEEXo",
    "owEeeEobCccccccccccccCdoEeeEXo",
    "owEeEEXoCcccccccccccCCowEeEEXo",
    "owEEEEXoCccccccccCCCCCowEEEEXo",
    "owwwwXXXoCCCCCCCCCCCCowwwwXXXo",
    "owwwwXXXc.ocbdcddcoocowwwwXXXo",
    "owwwXXXXo...oooooo...owwwXXXXo",
    ".owwXXXXo.oo......oo.owwwXXXo.",
    ".oooooooo.oo......oo.oooooooo.",
]
MOTHMUFF_FACE_TOP, MOTHMUFF_FACE_SHIFT = face_place(MOTHMUFF, 12, 9, 12)
MOTHMUFF_TAGS = species_tags([MOTHMUFF, drop_rows(MOTHMUFF, 15)], 15, 15)
# Sunflutter: its head is the middle of a sunflower and its wings a ring of petals round it; the
# feelers poke out through the petals, and it stands on two leaves. It hops.
SUNFLUTTER_PALETTE = {
    "o": (110, 70, 20), "y": (255, 215, 50), "Y": (240, 170, 30), "z": (255, 240, 140),  # petals
    "n": (130, 80, 35), "N": (95, 55, 25), "m": (160, 105, 45),  # the seeds
    "g": (90, 170, 60), "G": (55, 120, 40), "q": (140, 210, 90), "s": (70, 120, 40),  # stem and leaves
    "p": (245, 110, 170), "P": (200, 70, 130),
}
SUNFLUTTER = [
    ".......pp.........pp......",
    ".......Pp...oooo..Pp......",
    ".......oooo.ozyyo.o.......",
    "......ozzoyozyyyooooo.....",
    "....ooozyyooyyyYozzyyo....",
    "...ozyoyyyooooooozyyyo....",
    "..ozyyyooommmmmnooyyYoo...",
    "..oyyyyommmNmmnnnnoYozyoo.",
    "..oyyyommmmmmnnNnnnozyyyo.",
    ".oooyommNmmmnnnnnnnnoyyyo.",
    "ozzyoommmmmnnnnnnnnnoyyYo.",
    "ozyyyommmmnnnnnnnnNnoyYoo.",
    "oyyyYommmnnnnnnnnnnNoooyyo",
    "oyyYYommnnnnnnnnnnNNozyyyo",
    ".ooooomnnnnnnnnnnNNNoyyyYo",
    ".ozyyonnnnnnnnnnNNNNooyYYo",
    ".oyyyonnnnnnnnnNNNNNoyooo.",
    ".oyyyYonnnnnnnNNNNNoyyyo..",
    ".ooyYozonNnnnNNNNNoyyyyo..",
    "...oozyyoonnNNNNoooyyyYo..",
    "....oyyyYoooooooyyyoyYo...",
    "....oyyYYozyyyoyyyYooo....",
    ".....oooooyyyYoyyYYo......",
    ".........oysYo.sooo.......",
    "..........osoo.s..........",
    ".......ssss.....sss.......",
    "....sssggss....sqqgsss....",
    "....sgggsss....sssggs.....",
    ".....sss..........sss.....",
]
SUNFLUTTER_FACE_TOP, SUNFLUTTER_FACE_SHIFT = face_place(SUNFLUTTER, 10, 8, 12)
SUNFLUTTER_TAGS = species_tags([SUNFLUTTER, drop_rows(SUNFLUTTER, 13)], 13, 13)
# Jesterwing (secret): a harlequin butterfly. Tall red wings with diamonds, a jester's cap in red and
# violet with a bell on each tip, a broad grin. Confetti falling round it would be the scene's.
JESTERWING_PALETTE = {
    "o": (45, 25, 50), "b": (250, 232, 210), "l": (255, 245, 232), "h": (255, 255, 250), "d": (220, 190, 165),
    "r": (225, 50, 75), "R": (165, 30, 55), "k": (55, 40, 75),  # the wings and their diamonds
    "v": (130, 75, 200), "V": (90, 50, 150), "y": (255, 215, 60), "Y": (215, 165, 30),  # the cap and its bells
}
JESTERWING = [
    "....yY.....................yY...",
    "...oYy....................oYy...",
    "...oroo..................ooro...",
    "...orrooo..............ooorro...",
    "..orrrorrooo........ooovvorro...",
    "..orrrrorrrrooo..ooovvvvorrrro..",
    "..orrrrorrrrrRRoovvvvvvvorkrro..",
    ".okkrrrkorrrRRRoovvvvvvorkkkro..",
    ".okrrrrrorRRRRRoovvvvVVorrkrrro.",
    ".orrrrrrroooooooooooooorrrrrrro.",
    "orrrrrrrrrolllllbbbbborrrrrrrro.",
    "orrrrrrrrohllllbbbbbbborrrrrrrRo",
    "orkrrrrrkollllbbbbbbbborrrkrrRRo",
    "okkkrrrkkolllbbbbbbbbborrkkkrRo.",
    ".okrrrrrkolllbbbbbbbbdorrrkrRRo.",
    ".orrrrrrrollbbbbbbbbddorrrrrRRo.",
    ".orrrrrrrolbbbbbbbbdddorrrrRRo..",
    "..orrrrrRobbbbbbbbddddorrrRRRo..",
    "..orrrrrkobbbbbbbbddddorrrkRRo..",
    "..okrrrkooobbbbbbddddooorkkko...",
    "...orrro...obbbbddddo...oRkRo...",
    "...orro...oooooooooooo...oRRo...",
    "...oro.....obbbbbbbbo.....oo....",
    "....o.......obbbbbdo.......o....",
    ".............oooooo.............",
]
JESTERWING_FACE_TOP, JESTERWING_FACE_SHIFT = face_place(JESTERWING, 12, 11, 12)
JESTERWING_TAGS = species_tags([JESTERWING, drop_rows(JESTERWING, 15)], 15, 16, idle_ms=500)

# ---- The dog line: a puppy with one ear up and one ear down

DOG_PALETTE = {
    "o": (85, 55, 30),     # outline
    "d": (185, 135, 85),   # shadow
    "b": (225, 180, 125),  # tan
    "l": (240, 210, 165),  # lit
    "h": (250, 235, 210),  # highlight
    "t": (130, 85, 45),    # the ears and the tail (the hint)
    "T": (95, 60, 30),
}
# Baby: a tan puppy slime, one ear pricked up and one floppy ear hanging down its side, a wagging tail
DOG_BABY = [
    ".................oo...",
    "...ooooo........otto..",
    "..otttTto......otTto..",
    ".otttttTohllbbooTTto..",
    ".ottttttolbbbbbdTTto..",
    ".ottttttbbbbbbbbdoto..",
    "..otTttbbbbbbbbbdoo.o.",
    "...oTtbbbbbbbbbbddooto",
    "...olbbbbbbbbbbbddoto.",
    "...obbbbbbbbbbbbddoo..",
    "...odbbbbbbbbbbdddo...",
    "...oddddddddddddddo...",
    "....oooooooooooooo....",
]
DOG_BABY_TAGS = body_tags(DOG_BABY, 9, 10, flat_rows=3)
# Pupplet, the child: a puppy chasing its own tail; the tail curls round behind it, the ears have grown
PUPPLET = [
    "......................oo.....",
    ".....................otto....",
    "...oooooo...........otTto....",
    "..otttttTo.........otTTto....",
    ".otttttTTooooooooootTTTto....",
    "otttttttTolllllbbbotTTTto....",
    "ottttttttolllllbbbbbTTTto....",
    "ottttttttbbbbbbbbbbbbdTto....",
    "otttttttlbbbbbbbbbbbbddoo....",
    ".ottTTtllbbbbbbbbbbbbddo...oo",
    "..ooTTbbbbbbbbbbbbbbbdddo.oto",
    "...obbbbbbbbbbbbbbbbbdddootTo",
    "...obbbbbbbbbbbbbbbbbdddotto.",
    "...obbbbbbbbbbbbbbbbbdddoTo..",
    "...obbbbbbbbbbbbbbbbbdddoo...",
    "...obbbbbbbbbbbbbbbbbdddo....",
    "....oddddddddddddddddddo.....",
    "....oddddddddddddddddddo.....",
    "....oddddddddddddddddddo.....",
    ".....oooooooooooooooooo......",
    "........obbo....obbo.........",
    "........oooo....oooo.........",
]
PUPPLET_FACE_TOP, PUPPLET_FACE_SHIFT = face_place(PUPPLET, 9, 6, FACE_W)
PUPPLET_TAGS = body_tags(PUPPLET, 13, 13, flat_rows=3)
DOG_ADULT_PALETTE = DOG_PALETTE | {"o": (75, 45, 25)}
# Digby: a garden grows on its back. A bed of earth with sprouts, two flowers and a carrot behind its
# head, earth on its nose (its face) and on its paws. It walks.
DIGBY_PALETTE = DOG_ADULT_PALETTE | {
    "e": (120, 80, 45), "E": (85, 55, 30),  # earth
    "g": (100, 190, 70), "G": (60, 135, 45), "q": (160, 230, 110),  # sprouts
    "r": (245, 130, 40), "R": (200, 90, 25), "f": (250, 120, 160),  # the carrot, flowers
}
DIGBY = [
    "............g.g...........",
    "...........gGqGg..........",
    "............gGg...........",
    "........gGq..r...gGq......",
    "....f....G..rRr...G....f..",
    "...gGq..oGooooooooG.oogGq.",
    "....GoooeGeeeeeeeeGottoG..",
    "..ooooooeGeeeeeeeeotTtoG..",
    ".otttttToooooooooeotTTtoo.",
    "otttttTTollllllbbooTTTtoeo",
    "ottttttTolllllbbbbbTTttoEo",
    "ottttttolllllbbbbbbbTttoEo",
    "otttttollllbbbbbbbbbbttoEo",
    "otTTtollllbbbbbbbbbbbboEo.",
    ".oooollllbbbbbbbbbbbbdoo..",
    "...olllbbbbbbbbbbbbbddo...",
    "...ollbbbbbbbbbbbbddddo...",
    "...olbbbbbbbbbbbbdddddo...",
    "....obbbbbbbbbbbdddddo....",
    "....oobbbbbbbbddddddoo....",
    "...ollobbbbbbddddddobbo...",
    "...ollloobbbdddddoobbdo...",
    "...ollbbboooooooobbdddo...",
    "...olbbbbbbbbbbbbdddddo...",
    "....obbbbbbbbbbddddddo....",
    ".....obbbbbbbbddddddo.....",
    "......oobbbbddddddoo......",
    "....oEEooooooooooooEEo....",
    "....oooo..........oooo....",
]
DIGBY_FACE_TOP, DIGBY_FACE_SHIFT = face_place(DIGBY, 12, 7, 12)
DIGBY_TAGS = species_tags([DIGBY, drop_rows(DIGBY, 16)], 16, 13)
DIGBY_TAGS["walk"] = walk_tags(DIGBY, 16, range(4, 8), range(18, 22), 27, ms=(220, 130))
# Barrelbard: a big shaggy St Bernard like a snowy mountain, the brown mask round its eyes,
# snowflakes caught in its fur and a little barrel under its chin. It hops, heavily.
BARRELBARD_PALETTE = DOG_ADULT_PALETTE | {
    "b": (245, 240, 230), "l": (255, 252, 245), "h": (255, 255, 255), "d": (205, 195, 185),  # white fur
    "t": (165, 85, 40), "T": (120, 55, 25),  # the brown patches
    "k": (175, 115, 60), "K": (125, 80, 40), "x": (95, 95, 105), "s": (200, 230, 255),  # barrel, snow
}
BARRELBARD = [
    ".......................oo.......",
    "......................otto......",
    ".....oooooo..........otTto......",
    "....otttttTo.oooooo..otTTto.....",
    "...otttttTToolllllloooTTTto.....",
    "...ottttttTolllllbbbbbTTtto.....",
    "...ottttttolllllbbbbbbtTtto.....",
    "...otttttotllllbbbbbbbttoto.....",
    "...otTTtottllbbbbbbbbbtto.......",
    "....ooootttlbbbbbbbbbbttto......",
    "......ottttbbbbbbbbbbbtddo......",
    "......ottttbbbbbbbbbbbdddo......",
    ".....oottttbbbbbbbbbbddddo......",
    "....ollobbbbbbbbbbbdddddobo.....",
    "...olllobbbbbbbbbbddddddobbo....",
    "..olllllobbbbbbbbddddddobbbbo...",
    "..ollllllobbbbbbddddddobbbbbbo..",
    "..ollllllbooobdddddooobbbsbbbo..",
    ".ollllllbbbbboooooobbbbbbbbbdo..",
    ".ollllbbbbbboxxxxxxobbbbbbddddo.",
    ".olsbbbbbbbbokKkKkKobbbbddddddo.",
    ".obbbbbbbbbbokKkKkKobbddddddddo.",
    ".obbbbbbbbbboxxxxxxoddddddddsdo.",
    "obbbbbbbbbbbboooooodddddddddddo.",
    "obbbbbbbbbbbbbbbbddddddddddddddo",
    "obbbbbbsbbbbbbbddddddddddddddddo",
    "obboobboobbooddoodsooddooddooddo",
    ".oo..oo..oo..oo..oo..oo..oo..oo.",
]
BARRELBARD_FACE_TOP, BARRELBARD_FACE_SHIFT = face_place(BARRELBARD, 7, 10, 13)
BARRELBARD_TAGS = species_tags([BARRELBARD, drop_rows(BARRELBARD, 15)], 15, 15)
# Pawdini (secret): a circus dog. It stands on a big striped ball, balances a small one on its nose,
# wears a frilled collar and grins. The stars that glitter round it would be the scene's.
PAWDINI_PALETTE = DOG_ADULT_PALETTE | {
    "c": (250, 250, 255), "C": (200, 200, 225),  # the collar
    "r": (230, 60, 80), "R": (170, 35, 55), "u": (70, 130, 230), "U": (45, 90, 180), "y": (255, 215, 60),  # balls
}
PAWDINI = [
    "...........oo.........",
    "..........ouyo....oo..",
    "..........oUuo...otto.",
    "..oooooo...oo...otTto.",
    ".otttttTooooooo.otTTto",
    "otttttTTolllllbootTTto",
    "ottttttTollllbbbbbTtto",
    "ottttttolllbbbbbbbbtto",
    "otttttolllbbbbbbbbbboo",
    "otTTtollbbbbbbbbbbbdo.",
    ".oooollbbbbbbbbbbbddo.",
    "...olbbbbbbbbbbbbdddo.",
    "...obbbbbbbbbbbdddddo.",
    "....obbbbbbbbbdddddo..",
    "....oobbbbbbddddddoo..",
    "...ollooobbddddooobbo.",
    "...oocCcocCcocCcocCco.",
    "...ocCcCcCcCcCcCcCcCc.",
    "...oocbcobocbcodocdco.",
    "....obbbbbbbbddddddo..",
    ".....oobbbbddddddoo...",
    ".....oboooooooooobo...",
    ".......orrrccrrro.....",
    "......ocrrrrccrrro....",
    ".....orccrrrrccrrro...",
    ".....orrccrrrrccrro...",
    ".....orrrccrrrrccRo...",
    ".....orrrrccrrrRcco...",
    ".....ocrrrrccrRRRco...",
    "......ocrrrrccRRRo....",
    ".......ocrrRRccRo.....",
    "........oooooooo......",
]
PAWDINI_FACE_TOP, PAWDINI_FACE_SHIFT = face_place(PAWDINI, 7, 6, 12)
PAWDINI_TAGS = species_tags([PAWDINI, drop_rows(PAWDINI, 11)], 11, 11)

# ---- The dragonfly line: a dragonfly whose four wings become something else

DRAGONFLY_PALETTE = {
    "o": (25, 60, 100),    # outline
    "d": (60, 130, 200),   # shadow
    "b": (100, 175, 235),  # sky blue
    "l": (160, 215, 250),  # lit
    "h": (215, 240, 255),  # highlight
    "w": (210, 245, 245),  # the wings
    "W": (150, 210, 240),
    "v": (185, 160, 245),
    "g": (150, 235, 200),
    "G": (240, 200, 90),   # the goggles' frame (the hint)
    "D": (235, 252, 255),  # their lenses, dew drops
    "q": (170, 230, 250),
}
# Baby: a sky-blue slime with two pairs of shimmering wings spread out sideways
DRAGONFLY_BABY = [
    ".........oo......oo.........",
    ".ooooo...oolhllbboo...ooooo.",
    "owwwgWo.olhhlbbbbbdo.oWgwwwo",
    "oWwvwWWollhbbbbbbbbdoWWwvwWo",
    ".ooooooolbbbbbbbbbbdooooooo.",
    "owwgWWolbbbbbbbbbbbddoWWgwwo",
    ".oooooolbbbbbbbbbbbddoooooo.",
    "......obbbbbbbbbbbbddo......",
    "......odbbbbbbbbbbdddo......",
    "......oddddddddddddddo......",
    ".......oooooooooooooo.......",
]
DRAGONFLY_BABY_TAGS = body_tags(DRAGONFLY_BABY, 8, 13, flat_rows=2)
# Nymphlet, the child: a dragonfly larva, its long body in segments behind it, two wing stubs on its
# back that can't fly yet, goggles of dew drops pushed up on its head, six little legs
NYMPHLET = [
    "...............ooo...........",
    "..........ooo.owwWo..........",
    ".........owwWGGGGvo.GGGG.....",
    ".........oWwGDqqDGGGDqqDG....",
    "..........ooGqDqqGlGqDqqG....",
    "............oGGGGlllGGGGbo...",
    "...........ollbbbbbbbbbbbdo..",
    ".......oooolllbbbbbbbbbbbddo.",
    "..ooooollollllbbbbbbbbbbbdddo",
    ".ollbolbbobbbbbbbbbbbbbbbdddo",
    "olbbbobbbobbbbbbbbbbbbbbbdddo",
    "obbbbobbbobbbbbbbbbbbbbbbdddo",
    "obbbbobbbobbbbbbbbbbbbbbbdddo",
    "obbbbodddobbbbbbbbbbbbbbbdddo",
    "oddddooooobbbbbbbbbbbbbbbdddo",
    "oooooooo..oddddddddddddddddo.",
    "..........oddddddddddddddddo.",
    "..........oooooooooooooooooo.",
    "..........o.o.o........o.o.o.",
]
NYMPHLET_FACE_TOP, NYMPHLET_FACE_SHIFT = face_place(NYMPHLET, 8, 11, FACE_W)
NYMPHLET_TAGS = body_tags(NYMPHLET, 11, 18, flat_rows=3)
# Rotorfly: a dragonfly that is a little helicopter. Its head is a glass cockpit with the face behind
# the glass, its tail a tail boom with a small rotor, skids for legs, and its four wings have become
# the rotor blades on top, which turn all the time. It hovers.
ROTORFLY_PALETTE = DRAGONFLY_PALETTE | {
    "q": (175, 235, 245), "Q": (120, 195, 220), "D": (240, 255, 255),  # the glass
    "g": (215, 245, 245), "G": (150, 205, 225),  # the blades
    "y": (250, 205, 60), "Y": (205, 150, 35), "k": (70, 80, 95), "K": (45, 50, 60),  # hubs, mast, skids
}
ROTORFLY = [
    "...oooo...........oooo.........",
    "oooggggoooooooooooggggooooo....",
    "oooggggooooyYoooooggggooooo....",
    "...oooo....oo.....oooo.........",
    "............k..................",
    "............k..................",
    "........oooooooo...............",
    "......oooqqqqqqooo..........oo.",
    ".....ooqqDqqqqqqqoo.........oo.",
    "....ooqqDqqqqqqqqqoo........oo.",
    "....ooqDqqqqqqqqqqoo.......oggo",
    "...oloqqqqqqqqqqqQoboo......oo.",
    "...oloqqqqqqqqqQQQoboloooooooo.",
    "...oloqqqqqqqqQQQQodobbdbbdooo.",
    "...olloqqqqqqQQQQoddobodoodooo.",
    "...olbbooqqQQQQoodddoo......oo.",
    "...obbbbboooooodddddo.......oo.",
    "....obbbbbbbbbdddddo.......oggo",
    "....obbbbbbbbddddddo........oo.",
    ".....obbbbbbddddddo.........oo.",
    "......oobbbdddddoo..........oo.",
    ".......Koooooooo.K.............",
    "......K...........K............",
    "......K...........K............",
    "k....K.............K....k......",
    ".kkkkkkkkkkkkkkkkkkkkkkk.......",
]
ROTORFLY_B = [
    ".......ooo.....oooo............",
    ".....oogggoooooggggoo..........",
    ".....oogggoyYoogggGoo..........",
    ".......ooo.oo..oooo............",
    "............k..................",
    "............k..................",
    "........oooooooo...............",
    "......oooqqqqqqooo.............",
    ".....ooqqDqqqqqqqoo............",
    "....ooqqDqqqqqqqqqoo........oo.",
    "....ooqDqqqqqqqqqqoo........oo.",
    "...oloqqqqqqqqqqqQoboo.....oggo",
    "...oloqqqqqqqqqQQQobolooooo.oo.",
    "...oloqqqqqqqqQQQQodobbdbbd.oo.",
    "...olloqqqqqqQQQQoddobodood.oo.",
    "...olbbooqqQQQQoodddoo......oo.",
    "...obbbbboooooodddddo.......oo.",
    "....obbbbbbbbbdddddo........oo.",
    "....obbbbbbbbddddddo........oo.",
    ".....obbbbbbddddddo.........oo.",
    "......oobbbdddddoo..........oo.",
    ".......Koooooooo.K.............",
    "......K...........K............",
    "......K...........K............",
    "k....K.............K....k......",
    ".kkkkkkkkkkkkkkkkkkkkkkk.......",
]
ROTORFLY_FACE_TOP, ROTORFLY_FACE_SHIFT = face_place(ROTORFLY, 10, 7, 12)
ROTORFLY_TAGS = species_tags([ROTORFLY, ROTORFLY_B], 17, 12, idle_ms=90)
# Jewelwing: an upright knight. Its body is plate armour in jewel green, its wings hang behind it
# like two red banners with swallow tails, and it holds a lance with a pennant. It walks.
JEWELWING_PALETTE = DRAGONFLY_PALETTE | {
    "m": (60, 190, 140), "M": (30, 130, 95), "n": (150, 240, 200), "N": (220, 255, 240), "x": (20, 70, 55),  # armour
    "r": (210, 50, 70), "R": (150, 30, 50), "y": (250, 205, 60), "Y": (205, 150, 35),  # the banners
    "k": (150, 105, 60), "s": (220, 225, 235), "S": (160, 165, 180),  # the lance
}
JEWELWING = [
    "...............x.............ss",
    "..............Mxn............sS",
    "............xxxxxx...........sS",
    "..........xxnnnnnmxx..........k",
    ".........xnnnnnmmmmmx.....yyyyk",
    "........xnnnnnmmmmmmmx....yYy.k",
    "xxxxxxxxxnnnnmmmmmmmmxxxxxyyxk.",
    "xrrrrrrrxnnnmmmmmmmmmxrrrrrrrk.",
    "xrrrrrrxnnmmmmmmmmmmMMxrrrrrrk.",
    "xyyyyyyyxmmmmmmmmmmMMxyyyyyyyk.",
    "xrrrrrrrxmmmmmmmmmMMMxrrrrrrrk.",
    "xrrrrrrrxmmmmmmmmMMMMxrrrrrrrk.",
    "xrrrrrrrxxmmmmmMMMMMxxrrrrrrrk.",
    "xrrryrrrx.xxmmMMMMxx.xrrryrrrk.",
    "xrryYyrrx.xNxxxxxxmx.xrryYyrrk.",
    "xrrryrrrxxNnnnnnmmmmxxrrryrrrk.",
    "xrrrrrrrxxMMMMMMMMMMxxrrrrrrkx.",
    "xrrrrrrRxNnnnnmmmmmmmxrrrrrrkx.",
    "xrrrrrrRxnnnnmmmmmmmmxrrrrrrkx.",
    "xrrrrrrRxnnnmmmmmmmmmxrrrxorkx.",
    "xrrrrrRRxMMMMMMMMMMMMxrrroxRkx.",
    "xrrrrrRRxnnmmmmmmmmMMxrrrrrRkx.",
    "xrrrrRRRxnmmmmmmmmMMMxrrrrRRkx.",
    "xrrrrRRRxmmmmmmmmMMMMxrrrrRRkx.",
    "xrrrxRRRxMMMMMMMMMMMMxrrrxRRkx.",
    "xrrx.xRRxxmmmmmmMMMMxxrrx.xRkx.",
    "xrx...xRxxmmmmmMMMMMxxrx...kRx.",
    "xx.....xx.xmmmMMMMMx.xx....kxx.",
    "x.......x..xxxxxxxx..x.....k.x.",
    "..........xxxx...xxxx......k...",
    "..........xMMx...xMMx......k...",
    "...........................k...",
]
JEWELWING_FACE_TOP, JEWELWING_FACE_SHIFT = face_place(JEWELWING, 7, 10, 12)
JEWELWING_TAGS = species_tags([JEWELWING, drop_rows(JEWELWING, 18)], 18, 15)
JEWELWING_TAGS["walk"] = walk_tags(JEWELWING, 18, range(10, 14), range(17, 21), 29, ms=(220, 130))
# Prismfly (secret): a body of glass, wings of prism shards in pink, cyan, yellow and violet, a long
# glass tail, a twinkle above its head. It hovers. The rainbow light its wings throw would be the
# scene's.
PRISMFLY_PALETTE = DRAGONFLY_PALETTE | {
    "o": (70, 120, 170), "g": (225, 250, 255), "G": (170, 225, 245), "D": (255, 255, 255),  # glass
    "y": (250, 230, 90), "u": (90, 160, 245), "v": (175, 110, 240), "p": (255, 180, 220), "c": (170, 250, 240),
}
PRISMFLY = [
    "...............D..............",
    "o.............DuD............o",
    "oo.............D............oo",
    "oDo........................oyo",
    ".oDo.......oooooooo.......oyo.",
    ".oDpo.....oDDDDDDggo....ooyyo.",
    ".opppoo..oDDDDDDggggo..oyyyyo.",
    ".opppppooDDDDDDggggggooyyyyyo.",
    ".opppppoDDDDDgggggggggoyyyyyo.",
    "..oppppoDDDDggggggggggoyyyyo..",
    "..opooooDDDggggggggggGooooyo..",
    "..oo...oDDggggggggggGGo...oo..",
    ".......oDggggggggggGGGo.......",
    ".......ogggggggggGGGGGo.......",
    ".....oooogggggggGGGGGoooo.....",
    ".oooocccoogggggGGGGGooDvvoooo.",
    "oDccccco..ogggGGGGGo..ovvvvvvo",
    ".ooccco....oooooooo....ovvvoo.",
    "...oco.......oDDo.......ovo...",
    "....o.......oDDggo.......o....",
    "............oGGGGG............",
    "............oDgggo............",
    "............oggggo............",
    "...........oDGGGGGo...........",
    "............oggggo............",
    "............ogggGo............",
    "............oGGGGG............",
    "............oggGGo............",
    ".............ogGo.............",
    ".............oooo.............",
]
PRISMFLY_FACE_TOP, PRISMFLY_FACE_SHIFT = face_place(PRISMFLY, 10, 9, 12)
PRISMFLY_TAGS = species_tags([PRISMFLY, dots(PRISMFLY, {(15, 0): ".", (14, 1): ".", (16, 1): ".", (15, 2): ".",
                                                        (15, 1): "D"})], 11, 15, idle_ms=600)  # the twinkle

# ---- The beaver line: a builder with buck teeth and a pencil behind its ear

BEAVER_PALETTE = {
    "o": (60, 35, 20),     # outline
    "d": (120, 75, 40),    # shadow
    "b": (160, 105, 60),   # brown
    "l": (195, 145, 95),   # lit
    "h": (225, 185, 140),  # highlight
    "e": (90, 55, 30),     # inside the ears
    "y": (245, 200, 60),   # the pencil (the hint)
    "Y": (200, 150, 40),
    "k": (60, 50, 45),     # its lead
    "p": (240, 160, 150),  # its eraser
    "t": (75, 55, 40),     # the flat tail
    "T": (55, 40, 30),
}
# Baby: a brown slime with round ears, a pencil behind one ear and a flat tail; buck teeth (its faces)
BEAVER_BABY = [
    "...........k........",
    "..oo......oYk.......",
    ".oeeoooooooyYo......",
    "..oolhllbbbyoo......",
    "..olhhlbbbbbdo......",
    ".ollhbbbbbbbbdo.....",
    ".olbbbbbbbbbbdo.....",
    "olbbbbbbbbbbbddo....",
    "olbbbbbbbbbbbddo....",
    "obbbbbbbbbbbbddottt.",
    "odbbbbbbbbbbdddoTtTt",
    "oddddddddddddddotTtT",
    ".oooooooooooooo.oooo",
]
BEAVER_BABY_TAGS = body_tags(BEAVER_BABY, 7, 8, flat_rows=3)
# Gnawlet, the child: a young beaver, the pencil still behind its ear, the buck teeth grown, the flat
# crosshatched tail behind it
GNAWLET = [
    "...................k.......",
    "..................oY.......",
    ".................oyY.......",
    "..oo............oyYo.......",
    "..oeo..oooooooooyYoo.......",
    "...o.oolllllbbbpyoo........",
    "...oolllllllbbboooo........",
    "..ohllbbbbbbbbbbbbdo.......",
    ".ollllbbbbbbbbbbbbddo......",
    ".ollllbbbbbbbbbbbbddo......",
    "olllllbbbbbbbbbbbbdddo.....",
    "obbbbbbbbbbbbbbbbbdddo.....",
    "obbbbbbbbbbbbbbbbbdddo.....",
    "obbbbbbbbbbbbbbbbbdddooooo.",
    "obbbbbbbbbbbbbbbbbdddotTtTo",
    "obbbbbbbbbbbbbbbbbdddoTtTto",
    "obbbbbbbbbbbbbbbbbdddotTtTo",
    ".oddddddddddddddddddotTtTto",
    ".oddddddddddddddddddoooooo.",
    ".oddddddddddddddddddo......",
    "..oooooooooooooooooo.......",
]
GNAWLET_FACE_TOP, GNAWLET_FACE_SHIFT = face_place(GNAWLET, 9, 3, FACE_W)
GNAWLET_TAGS = body_tags(GNAWLET, 12, 10, flat_rows=3)
# Dambert: half beaver, half dam. It carries its dam on its back like a shell of logs with branches
# poking out (one has a leaf), a little stream trickles out under it, and its tail is a trowel. It hops.
DAMBERT_PALETTE = BEAVER_PALETTE | {
    "t": (150, 100, 55), "T": (105, 65, 35), "r": (200, 160, 110),  # the logs
    "s": (175, 180, 190), "S": (120, 125, 140), "q": (215, 220, 230),  # the trowel
    "u": (90, 170, 230), "U": (60, 120, 190), "g": (100, 170, 70),
}
DAMBERT = [
    "...............T...............",
    "........T......T..........T....",
    ".........T......T.g.g....T.....",
    ".........T..ooooToog....T......",
    "..........Torrrrrrrtoo.T.......",
    "........ooTTTTTTTTTTTTTo.......",
    ".......orrrrrrrrtttttttro......",
    "..oo..orrrrroortttttttttto.....",
    ".obdoooooooobdoTTTTTTTTTTo...TT",
    "...oolllllboottttttttttttro.T..",
    "..ollllllbbbbotttttttttttTTT...",
    ".ollllllbbbbbboTTTTTTTTTTTo....",
    ".ollllbbbbbbbbottttttttTTro....",
    "ollllbbbbbbbbbbotttttTTTTTo....",
    "olllbbbbbbbbbbdoTTTTTTTTTTo....",
    "ollbbbbbbbbbbddotttTTTTTro.....",
    "olbbbbbbbbbbdddottTTTTTTTo.....",
    ".obbbbbbbbddddoTTTTTTTTTo......",
    ".obbbbbbbdddddoTTTTTTroo.......",
    "..obbbbbdddddoTTTTTToo....oo...",
    "..ooobbddddooooooooodo...oqso..",
    "..obboooooobbbdddddddo..oqssso.",
    "...obbbbbbbbbdddddddoTTTTsssso.",
    "....obbbbbbbdddddddo....ossso..",
    ".....oobbbdddddddoo......oso...",
    ".......oooooooooo.........o....",
    "....oddo...oddo................",
    "..........uUuuUuu..............",
]
DAMBERT_FACE_TOP, DAMBERT_FACE_SHIFT = face_place(DAMBERT, 13, 3, 12)
DAMBERT_TAGS = species_tags([DAMBERT, drop_rows(DAMBERT, 14)], 14, 14)
# Timberjack: broad and bearded, the plaid of a lumberjack's shirt grown into its fur, and its flat
# tail ends in an axe blade. It walks.
TIMBERJACK_PALETTE = BEAVER_PALETTE | {
    "r": (200, 60, 55), "R": (140, 35, 35), "x": (60, 30, 30),  # plaid
    "e": (120, 75, 45), "E": (85, 50, 30),  # the beard
    "s": (200, 205, 215), "S": (140, 145, 160), "q": (240, 245, 250),  # the blade
}
TIMBERJACK = [
    "....oo.............oo.........",
    "...obdo.oooooooo..obdo........",
    "......oollllllbboo............",
    ".....ohllllllbbbbbo...........",
    "....ohlllllbbbbbbbbo..........",
    "....olllllbbbbbbbbbo..........",
    "...olllllbbbbbbbbbbbo.........",
    "...ollllbbbbbbbbbbbdo.........",
    "...ollbbbbbbbbbbbdddo.........",
    "...olbbbbbbbbbbbddddo.........",
    "....oooooooooooooooo..........",
    "...ooeeeeeeeeeeeeeeoo.........",
    "..oRoeeeeeeeeeeeeeorro........",
    ".oRxRoeeeeeeeeeeeeoRRRo.......",
    ".orRroeeeeeeeeeeeeorrro.......",
    "orrRroeeeeeeeeeeeeorrrro......",
    "orrRroeeeeeeeeeeeeorrrRo...oo.",
    "orrRroeeeeeeeeeeeoRrrRRo..oqo.",
    "oRRxRRoeeeeeeeeeEoxRRRRo..oqo.",
    "orrRrroeeeeeeeEEEoRRRRRo..oqo.",
    "orrRrrroeeeeeEEEoRRRRRRo.ooqso",
    ".orRrrrrooeeEEooRRRRRRooodosso",
    ".orRrrrrRroEEorRRRRRRRodddosso",
    "..oxRRRRxRRooxRRRRxRRoddddosso",
    "...orrrrRrrrRRRRRRRRoodddoosso",
    "....orrrRrrRRRRRRRRo.odddoosSo",
    ".....oorRrRRRRRRRoo..ooooooso.",
    ".......oooooooooo.......oooso.",
    "....oddddo......oddddo.....oo.",
    "....oooooo......oooooo......o.",
]
TIMBERJACK_FACE_TOP, TIMBERJACK_FACE_SHIFT = face_place(TIMBERJACK, 6, 7, 12)
TIMBERJACK_TAGS = species_tags([TIMBERJACK, drop_rows(TIMBERJACK, 18)], 18, 13)
TIMBERJACK_TAGS["walk"] = walk_tags(TIMBERJACK, 18, range(4, 10), range(16, 22), 28, ms=(240, 140))
# Archibeaver (secret): the architect. It sits on a little tower it built of branches, with a door,
# holds an unrolled blueprint with a floor plan on it and a compass, and the pencil is still behind
# its ear. It hops, tower and all. The sparks of its compass would be the scene's.
ARCHIBEAVER_PALETTE = BEAVER_PALETTE | {
    "t": (150, 100, 55), "T": (105, 65, 35), "r": (200, 160, 110),  # the tower
    "u": (80, 170, 255), "U": (40, 100, 210), "c": (200, 240, 255), "C": (140, 200, 240),  # the blueprint
    "s": (190, 195, 210), "S": (130, 135, 150),  # the compass
}
ARCHIBEAVER = [
    "...........................p....",
    "..........................yY....",
    "...........oo...........oyY.....",
    "..........obdo.oooooo..oyYo.....",
    ".............oolllllbookY.......",
    "............ollllllbbbbo........",
    "...........ollllllbbbbbbo.......",
    "...........ollllbbbbbbbbo.......",
    "..........ollllbbbbbbbbbbo......",
    "..........olllbbbbbbbbbbdo......",
    "..........ollbbbbbbbbbbddo......",
    "..........olbbbbbbbbbbdddo......",
    "...........obbbbbbbbddddo....S..",
    "...........obbbbbbbdddddo....s..",
    ".ooouuuuuuuuubbbbbdddddo.....s..",
    "occouUUUUUUUUuobbddddooo....S.s.",
    "ocCouUccccUcUuloooooobbbo...S.s.",
    "ocCouUcUUUcUUullbbbbbbbbo...S.s.",
    "ocCouUcUUcccobbobbbbbbbdo..S..s.",
    "ocCouUcUUcUcoddobbbbbbddo..S..s.",
    "ocCouUcccccUUoobbbbbbdddo.S....s",
    "ocCouUUUUUUcuubbbbbbddddo.S....s",
    "occouUUUUUUcubbbbbdddddo........",
    ".ooouuuuuuuuooobbddddoooo.......",
    "...........orrroooooottto.......",
    "..........orrrrrrtttttttto......",
    "..........TTTTTTTTTTTTTTTTT.....",
    "..........orrtttttttttttTo......",
    "..........otttttttttttTTTo......",
    "..........TTTTTTooooTTTTTTT.....",
    ".........ottttttotToTTTTTTo.....",
    ".........oooooooooooooooooo.....",
]
ARCHIBEAVER_FACE_TOP, ARCHIBEAVER_FACE_SHIFT = face_place(ARCHIBEAVER, 8, 13, 12)
ARCHIBEAVER_TAGS = species_tags([ARCHIBEAVER, drop_rows(ARCHIBEAVER, 13)], 13, 18)

# Faces. Babies and children: the slime's faces in the line's colors; the beaver's have buck teeth.
CATERPILLAR_FACE_PALETTE = FACE_PALETTE | {"d": (80, 160, 60), "m": (35, 85, 40)}
DOG_FACE_PALETTE = FACE_PALETTE | {"d": (185, 135, 85), "m": (60, 40, 25)}
DRAGONFLY_FACE_PALETTE = FACE_PALETTE | {"d": (60, 130, 200), "m": (25, 60, 100)}
BEAVER_FACE_PALETTE = FACE_PALETTE | {"d": (120, 75, 40), "m": (60, 35, 20), "W": (255, 250, 235)}
beaver_baby_face_grid = buck_teeth(baby_face_grid, 1)
beaver_face_grid = buck_teeth(face_grid, 2)
# The adults' (kit_face): dark eyes with a white glint, a nose for the dogs and the beavers
GARDEN_FACE_PALETTE = {"w": (240, 245, 255), "p": (25, 30, 60), "g": (255, 255, 255), "m": (70, 30, 40),
                       "r": (190, 45, 60), "k": (255, 150, 170), "n": (50, 30, 20), "W": (255, 252, 240)}
GRINNING_FACES = kit_faces(normal=("open", "laugh", True), smile=("open", "laugh", True))
mothmuff_face_grid = kit_face(6)
MOTHMUFF_FACES = kit_faces(normal=("half", "small", True))  # sleepy, and soft as its fur
MOTHMUFF_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (150, 135, 148)}
sunflutter_face_grid = kit_face(6)
SUNFLUTTER_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (95, 55, 25)}
jesterwing_face_grid = kit_face(6)
JESTERWING_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (220, 190, 165)}
digby_face_grid = nosed(kit_face(6, mouth_row=4), ["nn", "EE"])  # earth on its nose
DIGBY_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (185, 135, 85), "E": (120, 80, 45)}
barrelbard_face_grid = kit_face(7)
BARRELBARD_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (120, 55, 25)}
pawdini_face_grid = kit_face(6)
PAWDINI_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (185, 135, 85)}
rotorfly_face_grid = kit_face(6)
ROTORFLY_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (120, 195, 220)}
jewelwing_face_grid = kit_face(6)
JEWELWING_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (30, 130, 95)}
prismfly_face_grid = kit_face(6)
PRISMFLY_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (170, 225, 245)}
dambert_face_grid = timberjack_face_grid = archibeaver_face_grid = buck_teeth(nosed(kit_face(6), ["nn"]), 2)
DAMBERT_FACE_PALETTE = TIMBERJACK_FACE_PALETTE = ARCHIBEAVER_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (120, 75, 40)}
GARDEN_LINES = (("caterpillar", "munchlet", baby_face_grid, face_grid),
                ("dog", "pupplet", baby_face_grid, face_grid),
                ("dragonfly", "nymphlet", baby_face_grid, face_grid),
                ("beaver", "gnawlet", beaver_baby_face_grid, beaver_face_grid))
GARDEN_FORMS = (("mothmuff", MOTHMUFF_FACES), ("sunflutter", FACES), ("jesterwing", GRINNING_FACES),
                ("digby", FACES), ("barrelbard", FACES), ("pawdini", GRINNING_FACES),
                ("rotorfly", FACES), ("jewelwing", FACES), ("prismfly", FACES),
                ("dambert", FACES), ("timberjack", FACES), ("archibeaver", FACES))

# ---------------------------------------------------------------- The water lines

# Two more lines from the water, each with its egg, baby, child, a basic adult, a second one and a
# secret one, drawn after the drafts like the garden lines. What every form of a line keeps: the
# pincers (crab: the hermit's shell becomes a pot, a lighthouse and a castle) and the pink gill
# fronds (axolotl: coral, stethoscope tubes and wings). The child carries the colors the code may
# recolor as a hint at its adult form: the stripes and the shadow side of the conch, the gill fronds.

# The eggs: a peach egg in diagonal bands like a seashell; a pink, glassy egg with the little one
# curled up as a dark spot inside and two gill frills on top.
CRAB_EGG = [
    "....oooo....",
    "...ohhero...",
    "..oheereeo..",
    "..oeeeeeeo..",
    ".oeeeeeereo.",
    ".oereeereEo.",
    ".oreeereeEo.",
    ".oeeereeeEo.",
    ".oeeeeeerEo.",
    ".oereeerEEo.",
    "..oeeereEo..",
    "..oEereeEo..",
    "...oEEEEo...",
    "....oooo....",
]
AXOLOTL_EGG = [
    "..g......g..",
    "..gg.oo.gg..",
    "...ohheeo...",
    "..oheeeeeo..",
    "..oeeeeeeo..",
    ".oeeeeeeeeo.",
    ".oeeeccceEo.",
    ".oeeccceeEo.",
    ".oeeecceeEo.",
    ".oeeeeeeEEo.",
    "..oeeeeeEo..",
    "..oEeeeeEo..",
    "...oEEEEo...",
    "....oooo....",
]
EGG_GRIDS |= {"crab": CRAB_EGG, "axolotl": AXOLOTL_EGG}
RARE_EGG_PALETTES |= {
    "crab": {"o": (120, 60, 40), "e": (250, 210, 175), "E": (215, 165, 130), "h": (255, 240, 220), "r": (225, 110, 80),
             "x": (90, 35, 25)},
    "axolotl": {"o": (130, 50, 85), "e": (250, 190, 210), "E": (225, 150, 180), "h": (255, 235, 245),
                "c": (190, 80, 125), "g": (235, 80, 130), "x": (110, 35, 70)},
}

# ---- The crab line: a hermit crab whose shell grows into something to live in

CRAB_PALETTE = {
    "o": (100, 30, 25),    # outline
    "d": (195, 65, 45),    # shadow
    "b": (235, 105, 70),   # crab red
    "l": (250, 155, 115),  # lit
    "h": (255, 210, 185),  # highlight
    "s": (245, 225, 195),  # the shell
    "S": (205, 170, 135),  # its shadow side (the hint)
    "r": (175, 120, 90),   # its stripes (the hint)
}
# Baby: a red slime in a far too big spiral shell, two small pincers in front
CRAB_BABY = [
    "..............ooooo.....",
    "............oossssSoo...",
    "...........osrrrrrrsSo..",
    "..........osrssssssrSSo.",
    "..........osrsrrrrsrsSo.",
    "......oolhllbboorsrsSSo.",
    ".....olhhlbbbbbdosrsSSo.",
    "....ollhbbbbbbbbdosSSo..",
    "....olbbbbbbbbbbdoSSSo..",
    "oo.oobbbbbbbbbbbdooSoo..",
    "obodobbbbbbbbbbbdodobo..",
    "obbdobbbbbbbbbbbdodbbo..",
    ".ooodbbbbbbbbbbdddooo...",
    "...oddddddddddddddo.....",
    "....oooooooooooooo......",
]
CRAB_BABY_FACE_TOP, CRAB_BABY_FACE_SHIFT = face_place(CRAB_BABY, 8, 6, BABY_W)
CRAB_BABY_TAGS = body_tags(CRAB_BABY, 11, 8, flat_rows=3)
# Shellbit, the child: a hermit crab in a tall conch far too big for it; it leans out of the
# opening, one pincer bigger than the other, four little legs in front
SHELLBIT = [
    ".....................oo.........",
    "....................osSo........",
    "...................osrsSo.......",
    "..................osrsssSo......",
    ".................osrssrrsSo.....",
    "................osrsrrsssSSo....",
    "...............osrssssrrrsSSo...",
    "..............osrsrrrrsssrsSSo..",
    "..........ooooorssssssrrrsrsSSo.",
    ".......ooolllbbooorrrrssssrsSSSo",
    "......ollllllbbbbdosssrrrrsrSSSo",
    ".....olllbbbbbbbbddorrssssrSSSSo",
    "....ollllbbbbbbbbdddosrrrrSSSSo.",
    "....obbbbbbbbbbbbdddoSSSSSSSoo..",
    ".oo.ooobbbbbbbbbbdddoooooooo....",
    "obbooobobbbbbbbbbddoo.oo........",
    "obbbbbbobbbbbbbbbddobobo........",
    "obbbbbdobbbbbbbbbddobbdo........",
    ".obbbdoddddddddddddoooo.........",
    "..oooodddddddddddddo............",
    ".....ooooooooooooooo............",
    ".....o.o.o.o......o.o.o.o.......",
]
SHELLBIT_FACE_TOP, SHELLBIT_FACE_SHIFT = face_place(SHELLBIT, 11, 5, FACE_W)
SHELLBIT_TAGS = body_tags(SHELLBIT, 17, 11, flat_rows=3)
# Teacrab: crab and teapot grown into one. A round belly of a pot with a band of green dots, the
# big pincer is the spout with tea steaming out of it, the small one the handle, the lid a hat. It walks.
TEACRAB_PALETTE = CRAB_PALETTE | {
    "w": (245, 240, 230), "g": (90, 160, 140),  # the band
    "s": (230, 235, 245), "S": (190, 200, 215), "k": (200, 150, 60),  # steam, the knob
}
TEACRAB = [
    "............................s...",
    ".............................s..",
    "............................S...",
    ".............................s..",
    ".........................oo..oo.",
    ".........................obo.bo.",
    ".........................obbbdo.",
    "..............oo..........obdo..",
    ".............okko........oobo...",
    "...........oooooooo......olbo...",
    ".........oolllbbbbbboo...olbo...",
    "........ollbbbbbbbbbbdo..obbo...",
    ".........oooooooooooooo.obbo....",
    ".......oohlllllbbbbbbboobbdo....",
    "..ooo.ohllllllllbbbbbbbobbdo....",
    ".olllohllllllllbbbbbbbbobdo.....",
    ".olooollllllllbbbbbbbbbbbdo.....",
    "olo.oolllllllbbbbbbbbbbbdo......",
    "olo..olllllbbbbbbbbbbbbddo......",
    ".olooollllbbbbbbbbbbbbdddo......",
    ".obbbolllbbbbbbbbbbbbddddo......",
    "..ooowwwgwwwgwwwgwwwgwwwgo......",
    ".....owgwwwgwwwgwwwgwwwgwo......",
    ".....obbbbbbbbbbbbddddddo.......",
    "......obbbbbbbbbbddddddo........",
    ".......oobbbbbbdddddoo..........",
    ".........oooooooooooo...........",
    "........o...o.....o...o.........",
    ".......od..od....od..od.........",
    ".......o...o.....o...o..........",
]
TEACRAB_FACE_TOP, TEACRAB_FACE_SHIFT = face_place(TEACRAB, 15, 9, 12)
TEACRAB_TAGS = species_tags([TEACRAB, dots(drop_rows(TEACRAB, 18), {(28, 0): ".", (29, 0): "s", (28, 1): "s", (29, 1): ".",
                                                                    (28, 2): ".", (29, 2): "S", (28, 3): "s", (29, 3): "."})],
                            18, 14)  # the steam curls
TEACRAB_TAGS["walk"] = walk_tags(TEACRAB, 18, range(7, 13), range(17, 23), 27, ms=(200, 120))
# Lightclaw: tall, the shell ringed red and white like a lighthouse; the big pincer reaches up out of
# the top and holds the lamp, whose light flashes out, and the small one waves. It walks.
LIGHTCLAW_PALETTE = CRAB_PALETTE | {
    "w": (245, 240, 235), "W": (205, 195, 190),  # the white rings
    "y": (255, 235, 120), "Y": (250, 200, 60), "z": (255, 250, 200),  # the lamp and its light
}
LIGHTCLAW = [
    "..........oo...oo.........",
    ".........obbo.obbo........",
    ".....y...obbYYYYdo....y...",
    "......yy.obYzyyyYo..yy....",
    "...z....y.oYyyyYY..y....z.",
    "...........oYYYYo.........",
    "............obdo..........",
    "..z.........olbo.........z",
    "............olbo..........",
    "............obbo..........",
    "............obdo..........",
    "...........oobddo.........",
    ".....oooooooooooooooooo...",
    ".......ollllllllbbbbo.....",
    ".......olllllllbbbbbo.....",
    "......olllllllbbbbbddo....",
    "......ollllllbbbbbbddo....",
    "oo..ooowwwwwwwwwwwwWWo....",
    "obo.bowwwwwwwwwwwwwWWWo...",
    "obbbdowwwwwwwwwwwwwWWWo...",
    ".obdoowwwwwwwwwwwwwWWWo...",
    "..oo.owwwwwwwwwwwwWWWWo...",
    ".....olllbbbbbbbbbbbddo...",
    "....olllbbbbbbbbbbbbdddo..",
    "....ollbbbbbbbbbbbbbdddo..",
    "....obbbbbbbbbbbbbbddddo..",
    "....owwwwwwwooooWWWWWWWo..",
    "...owwwwwwwwoyYoWWWWWWWWo.",
    "...owwwwwwwwoYYoWWWWWWWWo.",
    "...oooooooooooooooooooooo.",
    "......od..od......od..od..",
    "......o...o.......o...o...",
]
LIGHTCLAW_FACE_TOP, LIGHTCLAW_FACE_SHIFT = face_place(LIGHTCLAW, 17, 7, 12)
LIGHTCLAW_DARK = dots(LIGHTCLAW, {(5, 2): ".", (6, 3): ".", (7, 3): ".", (8, 4): ".", (22, 2): ".", (20, 3): ".",
                                  (21, 3): ".", (19, 4): ".", (3, 4): ".", (24, 4): ".", (2, 7): ".", (25, 7): "."})
LIGHTCLAW_TAGS = species_tags([LIGHTCLAW, LIGHTCLAW_DARK], 23, 13, idle_ms=600)  # the light flashes
LIGHTCLAW_TAGS["walk"] = walk_tags(LIGHTCLAW, 23, range(6, 12), range(18, 24), 30, ms=(200, 120))
# Castlecrab (secret): the crab is the castle. Battlements along the top of its shell, a keep with a
# shell dome and a gold banner where the hermit's house was, its two pincers the gate towers with a
# flag each, a gate with a portcullis, and a moat with foaming waves round it. At night its windows
# light up (GLOWS in core/src/scene.ts: "y" is used for the windows only). It hops, castle and all.
CASTLECRAB_PALETTE = CRAB_PALETTE | {
    "s": (240, 215, 165), "S": (205, 170, 120),  # the keep's sandstone
    "y": (255, 225, 120),  # the windows
    "f": (240, 70, 90), "F": (250, 220, 80), "K": (110, 70, 45),  # flags and poles
    "k": (130, 85, 55), "p": (95, 60, 40),  # the gate
    "u": (90, 170, 230), "U": (55, 115, 190), "q": (230, 245, 255),  # the moat
}
CASTLECRAB = [
    "................KFFF............",
    "................KFF.............",
    "................KF..............",
    "...Kfff......oooooo.........KFFF",
    "...Kff.....oolllbbboo.......KFF.",
    "...Kf......olhllbbbdo.......KF..",
    "...K.......olbbbbbddo.......K...",
    "...K.......oooooooooo.......K...",
    "oo.K.oo....ossssssSSo....oo.K.oo",
    "oboKobo....ossyyssSSo....oboKobo",
    "obbobboooo.ossyyssSSo.oooobbobbo",
    "obbbbboobo.osssssSSSo.oboobbbbbo",
    "ollbbboooooooooooooooooooollbbbo",
    "ollbbbohhhhllllllllbbbbbbollbbbo",
    "oloyobohhllllllllbbbbbbbboloyobo",
    "oloyobohlllllllbbbbbbbbbboloyobo",
    "olbbbbollllllbbbbbbbbbbbbolbbbdo",
    "olbbbbolllllbbbbbbbbbbbbdolbbbdo",
    "obbbbdoloobbbbbbbbbbbboodobbbbdo",
    "obbbbdolyybbbbbbbbbbbbyydobbbbdo",
    "obbbddobbbbbbbbbbbbbbbdddobbbddo",
    "obbbddobbbbbbboooobbbbdddobbbddo",
    "obbbddobbbbbbokpkpoddddddobbbddo",
    "obbdddobbbbbbokpkpoddddddobbdddo",
    "obbdddobbbbbbokpkpoddddddobbdddo",
    "obbdddobbbbbbokpkpoddddddobbdddo",
    "ooooooooooooookpkpoooooooooooooo",
    ".qqq...qqq...qqq...qqq...qqq...q",
    "quuuuuquuuuuquuuuuquuuuuquuuuuqu",
    "uUUUuUUUuUUUuUUUuUUUuUUUuUUUuUUU",
    "UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU",
]
CASTLECRAB_FACE_TOP, CASTLECRAB_FACE_SHIFT = face_place(CASTLECRAB, 16, 10, 12)
CASTLECRAB_B = CASTLECRAB[:27] + [r[3:] + r[:3] for r in CASTLECRAB[27:30]] + CASTLECRAB[30:]  # the waves roll
CASTLECRAB_TAGS = species_tags([CASTLECRAB, CASTLECRAB_B], 20, 10, idle_ms=600)

# ---- The axolotl line: a pink axolotl that never quite grows up, with its gill fronds

AXOLOTL_PALETTE = {
    "o": (125, 45, 80),    # outline
    "d": (220, 120, 155),  # shadow
    "b": (245, 165, 190),  # pink
    "l": (255, 200, 215),  # lit
    "h": (255, 232, 240),  # highlight
    "g": (235, 75, 125),   # the gill fronds (the hint)
    "G": (180, 40, 90),
    "f": (255, 215, 228),  # the fin of the tail
    "F": (235, 165, 190),
}
# Baby: a pink slime with three feathery gill fronds on each side of its head
AXOLOTL_BABY = [
    "g........................g",
    ".gG.....oolhllbboo.....Gg.",
    "..gGo..olhhlbbbbbdo..oGg..",
    "gggGGoollhbbbbbbbbdooGGggg",
    "..gGo.olbbbbbbbbbbdo.oGg..",
    ".gG..olbbbbbbbbbbbddo..Gg.",
    "g....olbbbbbbbbbbbddo....g",
    ".....obbbbbbbbbbbbddo.....",
    ".....odbbbbbbbbbbdddo.....",
    ".....oddddddddddddddo.....",
    "......oooooooooooooo......",
]
AXOLOTL_BABY_FACE_TOP, AXOLOTL_BABY_FACE_SHIFT = face_place(AXOLOTL_BABY, 4, 8, BABY_W)
AXOLOTL_BABY_TAGS = body_tags(AXOLOTL_BABY, 7, 12, flat_rows=3)
# Axolittle, the child: the gill fronds stand up round its head like a crown, a long tail with a
# soft fin behind it, four stubby legs
AXOLITTLE = [
    "......g.......g.......g.........",
    "......gG.....gGg.....Gg.........",
    ".......gG....gGg....Gg..........",
    ".......gGG...gGg...GGg..........",
    "........gGoooooooooGg...........",
    "g......ooolllllbbbooo......g....",
    "gG....ohlllllllbbbbbbo....Gg....",
    ".gGG.olllbbbbbbbbbbbbdo.GGg.....",
    "..gGollllbbbbbbbbbbbbddoGg......",
    "...olllllbbbbbbbbbbbbdddo.......",
    "...obbbbbbbbbbbbbbbbbdddo.......",
    "...obbbbbbbbbbbbbbbbbdddo..ffff.",
    "...obbbbbbbbbbbbbbbbbdddoffFFFf.",
    "...obbbbbbbbbbbbbbbbbdddobdFFFf.",
    "...obbbbbbbbbbbbbbbbbdddoddoFff.",
    "...obbbbbbbbbbbbbbbbbdddodo.ff..",
    "....oddddddddddddddddddooo......",
    "....oddddddddddddddddddo........",
    ".....oooooooooooooooooo.........",
    "......obo.obo......obo..........",
    "......ooo.ooo......ooo..........",
]
AXOLITTLE_FACE_TOP, AXOLITTLE_FACE_SHIFT = face_place(AXOLITTLE, 8, 6, FACE_W)
AXOLITTLE_TAGS = body_tags(AXOLITTLE, 13, 11, flat_rows=3)
# Mossolotl: an axolotl that has become a mossy stone on the lake floor: flat and broad, overgrown,
# bits of stone showing through, its gill fronds sprouted into pink coral mushrooms. It crawls.
MOSSOLOTL_PALETTE = AXOLOTL_PALETTE | {
    "m": (95, 150, 70), "M": (65, 110, 50), "n": (140, 190, 95),  # moss
    "s": (130, 125, 120),  # stone
}
MOSSOLOTL = [
    "............ggg.....ggg.........",
    "...........gGgGg...gGgGg........",
    "..ggg........g.......g..........",
    ".gGgGg.......g.......g.....ggg..",
    "...g.........g.......g....gGgGg.",
    "...g.........g.......g......g...",
    "...g.......oooooooooooooo...g...",
    "......ooooooomnnmnnnnmmmmoo.g...",
    "....oomllmlbmoomnnmmmmmmmmmoo...",
    "...olllllbbbbbbommmmmmmmmmmmmo..",
    "..olllllbbbbbbbbommmmmmmmmmmmmo.",
    "..olllbbbbbbbbbbommmmmmmmmmmMMo.",
    ".olllbbbbbbbbbbddommmmmmmmMMMMo.",
    "..obbbbbbbbbbbddommmmmmMMMMMMMo.",
    "..obbbbbbbbbddddommmmMMsMMMMMoo.",
    "...obbbbbbdddddommsMMMMMMsMoodo.",
    "....oobbbddddoommMMMsMMMMooooo..",
    ".....oboooooooooooooooobo.......",
    ".....ooo..............ooo.......",
]
MOSSOLOTL_FACE_TOP, MOSSOLOTL_FACE_SHIFT = face_place(MOSSOLOTL, 10, 3, 12)
MOSSOLOTL_TAGS = species_tags([MOSSOLOTL, drop_rows(MOSSOLOTL, 13)], 13, 12, idle_ms=900)
MOSSOLOTL_TAGS["walk"] = walk_tags(MOSSOLOTL, 13, range(5, 8), range(22, 25), 17, ms=(320, 200))
# Medilotl: upright and round like a hot-water bottle, its gill fronds hang long like stethoscope
# tubes and end in heart blossoms; its tail is a spoon it hands out healing drink with. It hops.
MEDILOTL_PALETTE = AXOLOTL_PALETTE | {
    "r": (240, 60, 90), "R": (190, 30, 60),  # the hearts
    "s": (210, 215, 225), "S": (150, 155, 170), "q": (245, 250, 255), "u": (140, 220, 200), "U": (90, 180, 160),
}
MEDILOTL = [
    ".......g.g..g...g..g.g..........",
    "........g..ggg.ggg..g...........",
    ".......g.G.oGoooG..G.g..........",
    ".......g.oolllllloo..g..........",
    "......g.olllllllbbbo..g.........",
    ".....g.ohllllllbbbbbo..g........",
    "....g.ohllllllbbbbbbbo..g.......",
    "....g.olllllllbbbbbbbo..g.......",
    "....golllllllbbbbbbbbbo.g.oooo..",
    "...g.ollllllbbbbbbbbbbo..gqUUso.",
    "...gollllllbbbbbbbbbbbboogUuuUso",
    "...golllllbbbbbbbbbbbbboogUuuUSo",
    "...golllllbbbbbbbbbbbbdo.gsUUSo.",
    "...gollllbbbbbbbbbbbbddo.goooo..",
    "...golllbbbbbbbbbbbbdddo.g.S....",
    "...gollbbbbbbbbbbbbddddo.gS.....",
    "...golbbbbbbbbbbbbbddddo.gS.....",
    "....gbbbbbbbbbbbbbdddddogS......",
    "..rrgrrbbbbbbbbbbdddddrrgrr.....",
    ".rRrrrRrbbbbbbbbdddddrRrrrRr....",
    "..rrrrrbbbbbbbbddddddorrrrr.....",
    "...rrrobbbbbbbdddddddoSrrr......",
    "....r..obbbbbbddddddo...r.......",
    "........obbbbddddddo............",
    ".........oobdddddoo.............",
    "...........oooooo...............",
    "........obo.......obo...........",
    "........ooo.......ooo...........",
]
MEDILOTL_FACE_TOP, MEDILOTL_FACE_SHIFT = face_place(MEDILOTL, 10, 8, 12)
MEDILOTL_TAGS = species_tags([MEDILOTL, drop_rows(MEDILOTL, 17)], 17, 14)
# Axodrake (secret): a slim dragon floating in an S-curve, its gill fronds become great pink fan
# wings, bubbles rising round it. It flies. At night its gills and wings glow (GLOWS in
# core/src/scene.ts: "g", "G", "w" and "W" are used there only).
AXODRAKE_PALETTE = AXOLOTL_PALETTE | {
    "w": (255, 190, 215), "W": (240, 140, 180),  # the wings
    "q": (210, 240, 255), "Q": (150, 200, 240),  # bubbles
}
AXODRAKE = [
    "...q..........q.................",
    "..q.Q........q.Q................",
    "...Q..........Q.................",
    "............................q...",
    "g.......................g..q.Q..",
    "gwgg.................ggwg...Q...",
    "gwwwggg...........gggwwwg.......",
    ".gwwgwwwgg.....ggwwwgwwg........",
    ".gWwwgwwwwgg.ggwwwwgwwWg........",
    "..gWWwgwwwwg.gwwwwgwWWg.........",
    "...gWWWwgwwg.gwwgwWWWg..........",
    "....ggWWWwgg.ggwWWWgg...........",
    ".......gggg...gggg..............",
    "........oooooooo................",
    "..g....olllllbbbo.....g.......oo",
    "...g..olllllbbbbbo...g........oo",
    "..g.Gollllbbbbbbbbo.G.g......owo",
    "...g.olllbbbbbbbbbo..g......oowo",
    "..g.ollbbbbbbbbbbddo..g....olooo",
    ".....obbbbbbbbbbddo.oo.....obbo.",
    ".....obbbbbbbbddddoolboo.ooooo..",
    "......obbbbbbddddoolbbbooolbo...",
    ".......obbbdddddo.obbbdobbobo...",
    "........oooooooo..oobdoobdooo...",
    "....................oooooo......",
]
AXODRAKE_B = [
    "...q..........q.................",
    "..q.Q........q.Q................",
    "...Q..........Q.................",
    "............................q...",
    "...........................q.Q..",
    "............................Q...",
    "................................",
    "gggg.................gggg.......",
    "gwwwgggg.........ggggwwwg.......",
    ".gWwwwwwgggg.ggggwwwwwWg........",
    "..gWWWwgwwwg.gwwwgwWWWg.........",
    "...ggWWWWwgg.ggwWWWWgg..........",
    ".......gggg...gggg..............",
    "........oooooooo................",
    "..g....olllllbbbo.....g.......oo",
    "...g..olllllbbbbbo...g........oo",
    "..g.Gollllbbbbbbbbo.G.g......owo",
    "...g.olllbbbbbbbbbo..g......oowo",
    "..g.ollbbbbbbbbbbddo..g....olooo",
    ".....obbbbbbbbbbddo.oo.....obbo.",
    ".....obbbbbbbbddddoolboo.ooooo..",
    "......obbbbbbddddoolbbbooolbo...",
    ".......obbbdddddo.obbbdobbobo...",
    "........oooooooo..oobdoobdooo...",
    "....................oooooo......",
]
AXODRAKE_FACE_TOP, AXODRAKE_FACE_SHIFT = face_place(AXODRAKE, 14, 6, 12)
AXODRAKE_TAGS = species_tags([AXODRAKE, AXODRAKE_B], 19, 11, idle_ms=350)  # the wings beat
AXODRAKE_TAGS["flutter"] = [(AXODRAKE, 80), (AXODRAKE_B, 80)]

# Faces. Baby and child: the slime's faces in the line's colors; the adults': kit_face, as the garden's.
CRAB_FACE_PALETTE = FACE_PALETTE | {"d": (195, 65, 45), "m": (100, 30, 25), "k": (255, 150, 170)}
AXOLOTL_FACE_PALETTE = FACE_PALETTE | {"d": (220, 120, 155), "m": (125, 45, 80), "k": (255, 150, 170)}
teacrab_face_grid = lightclaw_face_grid = castlecrab_face_grid = kit_face(6)
TEACRAB_FACE_PALETTE = LIGHTCLAW_FACE_PALETTE = CASTLECRAB_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (195, 65, 45)}
mossolotl_face_grid = medilotl_face_grid = axodrake_face_grid = kit_face(6)
MOSSOLOTL_FACE_PALETTE = MEDILOTL_FACE_PALETTE = AXODRAKE_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (220, 120, 155)}
WATER_LINES = (("crab", "shellbit"), ("axolotl", "axolittle"))
WATER_FORMS = (("teacrab", FACES), ("lightclaw", FACES), ("castlecrab", FACES),
               ("mossolotl", kit_faces(normal=("half", "small", True))),  # calm as a stone
               ("medilotl", FACES), ("axodrake", FACES))

UMBRELLA_WIDTHS = (19, 23, 27, 31, 35)  # the scene picks the smallest that is as wide as the pet (scene.UMBRELLAS)


def umbrella(width):
    """The rain umbrella, `width` (odd) wide: a red dome with white dots, a scalloped rim and the stick."""
    half = width // 2
    height = width // 6 + 2  # rows of the dome
    rows = []
    for y in range(height):
        reach = round(half * math.sqrt(1 - ((height - 1 - y) / height) ** 2))  # half the width of this row
        rows.append(["u" if abs(x - half) <= reach else "." for x in range(width)])
    for y in range(1, height - 1, 2):  # white dots, every other row, staggered
        row = rows[y]
        for x in range(1, width - 1):
            if (x - half + 3 * (y // 2)) % 6 == 3 and row[x - 1] == row[x + 1] == "u":
                row[x] = "w"
    rim = ["." if x % 3 == 2 else "U" for x in range(width)]
    rim[half] = "k"
    return ["".join(r) for r in rows] + ["".join(rim)] + ["." * half + "k" + "." * half] * 3

# ---------------------------------------------------------------- The mouse line

# Grandma's line: a little grey mouse who lives in Grandma's house, with its egg, baby, child, a basic
# adult, a second one and a secret one. What every form keeps: the big round ears and the ringed
# tail (the knight's ears are nutshell shields and its tail a lance, the tin toy's ears are cogs and
# its tail a spring, and the queen's tail a golden thread). The child carries the colors the code may
# recolor as a hint at its adult form: the crumb of cheese it holds.

# The egg sits in one of Grandma's knitted egg cosies, red with a white bobble.
MOUSE_EGG = [
    ".....ww.....",
    "....wwWo....",
    "...okkkko...",
    "..okKkkKko..",
    "..okkKkkko..",
    ".okKkkKkkko.",
    ".okkkKkkKko.",
    ".oKkKkKkKKo.",
    ".oeeeeeeeEo.",
    ".oeeeeeeeEo.",
    "..oeeeeeEo..",
    "..oEeeeeEo..",
    "...oEEEEo...",
    "....oooo....",
]
EGG_GRIDS |= {"mouse": MOUSE_EGG}
RARE_EGG_PALETTES |= {
    "mouse": {"o": (80, 45, 45), "e": (245, 238, 220), "E": (205, 195, 175), "k": (215, 75, 70), "K": (165, 45, 50),
              "w": (250, 245, 235), "W": (215, 210, 200), "x": (70, 35, 35)},
}

MOUSE_PALETTE = {
    "o": (60, 55, 65),     # outline
    "d": (135, 130, 145),  # shadow
    "b": (180, 175, 190),  # mouse grey
    "l": (215, 210, 222),  # lit
    "h": (240, 238, 245),  # highlight
    "p": (245, 165, 185),  # the pink of the ears and the tail
    "P": (210, 120, 145),
    "y": (250, 215, 80),   # the crumb of cheese (the hint)
    "Y": (210, 165, 45),
}
# Baby: a grey slime with two big round ears and a ringed tail, a crumb of cheese in front of it
MOUSE_BABY = [
    ".oooo........oooo.....",
    "oddddo......oddddo....",
    "odppdo......odppdo....",
    "odpPdo......odPpdo....",
    "odddoolhllbboodddo....",
    ".ooolhhlbbbbbdooo.....",
    "..ollhbbbbbbbbdo.pp...",
    "..olbbbbbbbbbbdop..p..",
    ".olbbbbbbbbbbbddo.p...",
    ".olbbbbbbbbbbbddop....",
    ".obobbbbbbbbbbddo.....",
    ".oyobbbbbbbbbdddo.....",
    "oyYoddddddddddddo.....",
    "oooooooooooooooo......",
]
MOUSE_BABY_FACE_TOP, MOUSE_BABY_FACE_SHIFT = face_place(MOUSE_BABY, 7, 4, BABY_W)
MOUSE_BABY_TAGS = body_tags(MOUSE_BABY, 8, 8, flat_rows=3)
# Squeaklet, the child: big round ears, the ringed tail curling up behind it, and a crumb of cheese
# held in both paws in front of its tummy
SQUEAKLET = [
    "...oooo...........oooo........",
    "..oddddo.........oddddo.......",
    ".oddppddo.......oddppddo......",
    ".odpppPdo.......odPpppdo......",
    ".odppPPdo.......odPPppdo......",
    ".oddPPddoooooooooddPPddo......",
    "..odddoolllllbbbooddddo.......",
    "...ooolllllllbbbbboooo........",
    "....ollbbbbbbbbbbbdo..........",
    "...olllbbbbbbbbbbbddo...pppp..",
    "..ollllbbbbbbbbbbbdddo.p....p.",
    "..obbbbbbbbbbbbbbbdddop..pp.p.",
    "..obbbbbbbbbbbbbbbdddop.p..p..",
    "..obbbbbbbbbbbbbbbdddop..pp...",
    "..obbbbbbbbbbbbbbbdddo.p......",
    "..obbbbbbbbbbbbobbdddo..p.....",
    "..obbbbbbboobboyoobdddo.p.....",
    "...oddddddolbyyYlbodddo.......",
    "...odddddoyyyyyYoddddo........",
    "...oooooooyyyyYoooooo.........",
    ".........ooooooo..............",
    ".......obbo...obbo............",
    ".......oooo...oooo............",
]
SQUEAKLET_FACE_TOP, SQUEAKLET_FACE_SHIFT = face_place(SQUEAKLET, 8, 4, FACE_W)
SQUEAKLET_TAGS = body_tags(SQUEAKLET, 12, 11, flat_rows=3)
# Sir Thimble: a mouse knight, upright with a proud chest. Its round ears have grown hard as two
# nutshell shields, its ringed tail stands straight up beside it as a lance with a needle for a tip,
# and Grandma's thimble is its helmet. It marches.
SIRTHIMBLE_PALETTE = MOUSE_PALETTE | {
    "t": (175, 120, 65), "T": (125, 80, 40), "u": (215, 165, 100),  # the nutshells
    "s": (205, 210, 220), "S": (140, 145, 160), "q": (245, 248, 252),  # the thimble and the needle
}
SIRTHIMBLE = [
    "..........................q.....",
    "..........................sS....",
    "..........................sS....",
    ".....ooo....oooo....ooo...sS....",
    "...oottToo.oqssSo.oottToo.sS....",
    "...ouuttto.oqSsSo.ouuttto.sS....",
    "..ottTTTTToosSsSoottTTTTTosS....",
    "..ouutttttoossSSoouutttttosS....",
    "..otTTTTTTooooooootTTTTTTosS....",
    "..otttttoolllllbbbootttTTosS....",
    "...oTTTTolllllbbbbboTTTTo.sS....",
    "...ootTollllbbbbbbbboTToo.pP....",
    ".....ooolllbbbbbbbbbooo...PP....",
    "......ollbbbbbbbbbbddo....pP....",
    ".......obbbbbbbbbbddo.....pP....",
    ".......obbbbbbbbddddo.....PP....",
    "........obbbbbbddddo......pP....",
    "........oobbbdddddoo......pP....",
    ".........oooooooooo.....oooP....",
    ".......oollllllbbbbboooobbbo....",
    ".......ollhhhhhbbbbbbbbbbbdo....",
    "......ollhhhhhhhbbbbbdooooP.....",
    "......ollhhhhhhhbbbbbo....pP....",
    "......olhhhhhhhhlbbbdo....pP....",
    "......olhhhhhhhllbbddo....PP....",
    "......olhhhhhhlllbdddo....pP....",
    "......obbhhhhllldddddo....pP....",
    ".......obhhhllllddddo.....PP....",
    ".......oobhllllddddoo.PPPPpP....",
    ".........oobbddddoo.......pP....",
    ".......obbdooooobbdo............",
    ".......ooooo...ooooo............",
]
SIRTHIMBLE_FACE_TOP, SIRTHIMBLE_FACE_SHIFT = face_place(SIRTHIMBLE, 12, 8, 12)
SIRTHIMBLE_TAGS = species_tags([SIRTHIMBLE, drop_rows(SIRTHIMBLE, 23)], 23, 14)  # breathing, chest out
SIRTHIMBLE_TAGS["walk"] = walk_tags(SIRTHIMBLE, 23, range(7, 12), range(15, 20), 30, ms=(220, 140))  # it marches
# Cogsqueak: a wind-up tin-toy mouse, low and long on three little wheels. Its ears are two cogs,
# its ringed tail a spiral spring, and the winding key in its back turns as it rolls along.
COGSQUEAK_PALETTE = MOUSE_PALETTE | {
    "y": (230, 190, 80), "Y": (180, 140, 50), "z": (250, 225, 130),  # brass: the cogs and the key
    "s": (190, 195, 205), "S": (120, 125, 140),  # the spring and the seam of the tin
    "k": (200, 70, 60), "K": (140, 45, 45), "n": (230, 110, 140),  # red tin wheels, the nose
}
COG_EAR = [".y.y.y.", "yzzyyYy", ".zyoyY.", "yyoooYy", ".yyoYY.", "yYyYYYy", ".Y.Y.Y."]
COG_BODY = [
    "........oooooooooooo......",
    "......oolllhhhllllbbboo...",
    ".....olllhhhllllllbbbbbo..",
    "....ollllllllllbbbbbbbbdo.",
    "...olllllllllbbbbbbbbbbddo",
    "..ollllllllbbbbbbbbbbbbddo",
    "nolllllllbbbbbbbbbbbbbbddo",
    ".oobbbbbbbbbbbbbbbbbbbbddo",
    "...oSSSSSSSSSSSSSSSSSSSSo.",
    "...obbbbbbbbbbbbbbbbbbddo.",
    "....oooooooooooooooooooo..",
]
COG_KEYS = (["yz.yy", "yyyyY", "yY.YY", "..S..", "..S.."],  # the key, seen flat on
            [".zyy.", ".yyY.", ".yYY.", "..S..", "..S.."],  # turning
            ["..z..", "..y..", "..Y..", "..S..", "..S.."])  # edge on
COG_SPRING = [".s.s.", "sSsSs", ".S.S."]
COG_WHEELS = ([".kk.", "ksKk", "kKKk", ".KK."], [".kk.", "kKsk", "kKKk", ".KK."],
              [".kk.", "kKKk", "kKsk", ".KK."], [".kk.", "kKKk", "ksKk", ".KK."])  # the spoke goes round


def cogsqueak(key, wheel):
    grid = ["." * CANVAS] * 19
    for part, at in ((COG_KEYS[key], (20, 0)), (COG_EAR, (4, 0)), (COG_EAR, (12, 0)), (COG_BODY, (1, 5)),
                     (COG_SPRING, (27, 10)), (COG_WHEELS[wheel], (5, 15)), (COG_WHEELS[wheel], (12, 15)),
                     (COG_WHEELS[wheel], (19, 15))):
        grid = overlay(grid, part, at)
    return grid


COGSQUEAK = cogsqueak(0, 0)
COGSQUEAK_FACE_TOP, COGSQUEAK_FACE_SHIFT = face_place(COGSQUEAK, 8, 3, 11)
# standing, it unwinds slowly; rolling, the key turns and the wheels go round
COGSQUEAK_TAGS = species_tags([cogsqueak(k, 0) for k in (0, 1, 2, 1)], 11, 14, idle_ms=450)
COGSQUEAK_TAGS["walk"] = [(cogsqueak(k, w), 110) for k, w in ((0, 0), (1, 1), (2, 2), (1, 3))]
# Woolwhisk (secret): the queen of Grandma's wool basket. She sits up tall on a big ball of red wool,
# her fur grown into knitted wool, two crossed knitting needles on her head for a crown. Her ringed
# tail has become a golden thread that loops round her in rings, and where it crosses itself it
# knits little stars that shine and fade. At night the thread and the stars glow (GLOWS in
# core/src/scene.ts: "y", "Y", "k" and "z" are used for them only).
WOOLWHISK_PALETTE = MOUSE_PALETTE | {
    "r": (215, 80, 80), "R": (165, 50, 55), "w": (240, 120, 110), "W": (250, 170, 160),  # the ball of wool
    "s": (205, 175, 120), "S": (160, 125, 80),  # the knitting needles
    "f": (235, 230, 240), "F": (200, 195, 210),  # her knitted fur
    "y": (255, 215, 90), "Y": (225, 165, 40),  # the golden thread, in front and behind
    "k": (250, 230, 120), "z": (255, 250, 200),  # the stars
}
WOOLWHISK = [
    "...........rr.......rr..........",
    "............S.......s...........",
    ".........o...S.....s..o.........",
    ".......ooloo..S...s.ooloo.......",
    "......ollpbbo..S.s.ollpbbo......",
    "......olpppbo...s..olpppbo......",
    ".....olppppPooosoSooppppPdo.....",
    "......obppoohlsllbSboopPdo......",
    "......obbohlllllbbbbbboddo......",
    ".......ooollllbbbbbbbbooo.......",
    ".........olllbbbbbbbbdo.........",
    ".........olbbbbbbbbbddo.........",
    ".........obbbbbbbbddddo.........",
    ".........obbbbbbbdddddo.........",
    "..........oobbbdddddoo..........",
    "..YYYYYYYYoFoooooooofo..........",
    ".YY......ohhhhffffffffoY........",
    "yy.......ohFhFfFfFfFfdoYYYYYYY..",
    ".yy.....obbofffffffobbo....YYYYY",
    "...yyyYYYofFfFfFfFFdFdo.......Yy",
    "...YYyyyyyoffffffFFFFo.........y",
    ".YYY....oyyyyyydFdFooooo.....yyy",
    ".Y.....oWwwRwooyyyyyyyyyyyyyyyy.",
    "yy....oRwwRwwRrrRrrRrrRryyyy....",
    ".yy..oRwwRwwRrrRrrRryyyyyro.....",
    "...yyyyyyyyyyyyyyyyyRrrRRRo.....",
    ".....owRwrRrrRrrRrrRrrrRRro.....",
    ".....oRrrRrrRrrRrrRrRrRRrRo.....",
    "......orRrrRrrRrrRrRrRRrRo......",
    ".......orrRrrRrrRRRrRRrRo.......",
    "........ooorRrrrRRrRRooo........",
    "...........oooooooooo...........",
]
# The stars: (x, y) of their middle, and how far along their twinkle each one is
WOOL_STARS = (((2, 18), 0), ((29, 20), 2), ((4, 10), 4), ((27, 12), 1), ((29, 26), 3))
WOOL_TWINKLE = ([], ["z"], [".k.", "kzk", ".k."], ["..k..", "..k..", "kkzkk", "..k..", "..k.."],
                [".k.", "kzk", ".k."], ["k"])  # knitted, shining, fading


def woolwhisk(step):
    grid = WOOLWHISK
    for (x, y), phase in WOOL_STARS:
        star = WOOL_TWINKLE[(step + phase) % len(WOOL_TWINKLE)]
        if star:
            r = len(star) // 2
            grid = overlay(grid, star, (x - r, y - r))
    return grid


WOOLWHISK_FACE_TOP, WOOLWHISK_FACE_SHIFT = face_place(WOOLWHISK, 9, 10, 12)
WOOLWHISK_TAGS = species_tags([woolwhisk(i) for i in range(len(WOOL_TWINKLE))], 27, 16, idle_ms=260)

# Faces. Baby and child: the slime's faces in the line's colors; the adults': kit_face with a pink
# nose (Cogsqueak's nose is on the tip of its snout).
MOUSE_FACE_PALETTE = FACE_PALETTE | {"d": (135, 130, 145), "m": (60, 55, 65), "k": (255, 150, 170)}
sirthimble_face_grid = woolwhisk_face_grid = nosed(kit_face(6), ["nn"])
cogsqueak_face_grid = kit_face(5)
SIRTHIMBLE_FACE_PALETTE = COGSQUEAK_FACE_PALETTE = WOOLWHISK_FACE_PALETTE = GARDEN_FACE_PALETTE | {
    "d": (135, 130, 145), "n": (230, 110, 140)}
GRANDMA_LINES = (("mouse", "squeaklet"),)
GRANDMA_FORMS = (("sirthimble", FACES), ("cogsqueak", FACES),
                 ("woolwhisk", kit_faces(normal=("open", "small", True))))  # gracious

# ---------------------------------------------------------------- The adventure lines

# Three lines from the trips, each with its egg, baby, child, a basic adult, a second one and a
# secret one: the bear from Mosswart's mushroom forest, the penguin from Frostfluff's mountain (both
# guardians leave its egg) and the bat that lives in the cave as a wild pet. What every form of a
# line keeps: the honey pot (the bear), the earmuffs (the penguin) and the big pointed ears (the
# bat). The child carries the colors the code may recolor as a hint at its adult form: the glaze of
# the honey pot, the earmuffs and the wing membrane.

# The eggs: a caramel egg with honey dripping over its top, sitting in a cushion of moss; an ice-blue
# egg with snow on its top and frost on it, in a tuft of the yeti's white fur; a purple egg wrapped in
# two folded wings like a sleeping bat, hanging from the cave's ceiling by two little claws.
BEAR_EGG = [
    "....oooo....",
    "...ojyyYo...",
    "..ojyyyyYo..",
    "..oyyyyyYo..",
    ".oyyeyyYyYo.",
    ".oyeeyyeYEo.",
    ".oeeeyeeYEo.",
    ".oeeeeeeYEo.",
    ".oeeeeeeeEo.",
    ".oeeeeeeEEo.",
    "..oeeeeeEo..",
    ".gGoeeeeoGg.",
    "gGgggGgggGgG",
    ".GGgGGGgGGG.",
]
PENGUIN_EGG = [
    "....oooo....",
    "...owwwWo...",
    "..owwwwwWo..",
    "..oWwWwWWo..",
    ".oeeeeeeeEo.",
    ".oeeeeeheEo.",
    ".oeheeehhho.",
    ".ohhheeeheo.",
    ".oeheeeeeEo.",
    ".oeeeeeheEo.",
    "f.oeeeeeEo.f",
    "fFfoeeeEofFf",
    ".fFfFfFfFfF.",
    "..FfFFFfFF..",
]
BAT_EGG = [
    "SSTTSSSTTSST",
    ".T..c..c..T.",
    "....cvvc....",
    "...ovVVvo...",
    "..ovvVVvvo..",
    "..oVvVVvVo..",
    ".ovVvVVvVvo.",
    ".ovVvVVvVvo.",
    ".oVvvVVvvVo.",
    ".ohVoVVoVeo.",
    "..oeetteto..",
    "..oteeeeEo..",
    "...oEEtEo...",
    "....oooo....",
]
EGG_GRIDS |= {"bear": BEAR_EGG, "penguin": PENGUIN_EGG, "bat": BAT_EGG}
RARE_EGG_PALETTES |= {
    "bear": {"o": (95, 55, 30), "e": (230, 190, 140), "E": (190, 145, 95), "y": (250, 190, 45), "Y": (205, 135, 25),
             "j": (255, 230, 130), "g": (100, 160, 60), "G": (55, 110, 40), "x": (95, 55, 30)},
    "penguin": {"o": (45, 70, 110), "e": (175, 215, 240), "E": (125, 170, 210), "h": (230, 245, 255),
                "w": (250, 252, 255), "W": (200, 215, 235), "f": (240, 240, 250), "F": (190, 190, 215),
                "x": (45, 70, 110)},
    "bat": {"o": (35, 22, 50), "e": (150, 115, 185), "E": (110, 80, 145), "h": (195, 170, 220), "t": (190, 245, 220),
            "v": (110, 75, 145), "V": (80, 52, 110), "c": (215, 205, 225), "S": (115, 110, 125), "T": (80, 76, 92),
            "x": (35, 22, 50)},
}


def fanged(face):
    """A face grid function with a little fang under the right corner of its mouth (none while asleep)."""
    def grid(eyes, mouth, blush):
        out = [list(r) for r in face(eyes, mouth, blush)]
        width = len(out[0])
        out.append(list("." * width))
        if mouth != "none":
            out[-1][width // 2] = "W"
        return ["".join(r) for r in out]
    grid.width = getattr(face, "width", None)
    return grid


# ---- The bear line: a bear cub with a honey pot for a hat

BEAR_PALETTE = {
    "o": (70, 40, 25),     # outline
    "d": (140, 85, 45),    # shadow
    "b": (180, 115, 60),   # bear brown
    "l": (210, 150, 90),   # lit
    "h": (235, 190, 130),  # highlight
    "i": (230, 165, 120),  # the muzzle and inside the ears
    "k": (245, 230, 195),  # the glaze of the honey pot (the hint)
    "K": (205, 180, 140),
    "y": (250, 190, 45),   # honey
    "Y": (205, 135, 25),
    "j": (255, 232, 140),
}
# Baby: a round brown cub with round ears and a little honey pot on its head, honey running down
# onto its brow
BEAR_BABY = [
    "......yyyY......",
    "....oyyyyyYo....",
    ".....okykKo.....",
    ".oo.okkkykKo.oo.",
    "oddookkkkKKooddo",
    "odiookkkKKKooido",
    "oddooooooooooddo",
    "..olhhybbbbbdo..",
    ".ollhbYbbbbbbdo.",
    ".olbbbbbbbbbbdo.",
    "olbbbbbbbbbbbddo",
    "olbbbiiiiiibbddo",
    "obbbiiiiiiiibddo",
    "odbbbiiiiiibdddo",
    "oddddddddddddddo",
    ".oooooooooooooo.",
]
BEAR_BABY_FACE_TOP, BEAR_BABY_FACE_SHIFT = face_place(BEAR_BABY, 9, 3, BABY_W)
BEAR_BABY_TAGS = body_tags(BEAR_BABY, 10, 8, flat_rows=3)
# Cubble, the child: the honey pot worn as a hat, honey welling over its rim and running down the
# pot onto its brow, a pale muzzle, round ears and two stubby paws
CUBBLE = [
    "...........jjyyY..........",
    ".........ojyyyyyyYo.......",
    "........oyyyyykyyYYo......",
    ".........okyykkkYo........",
    "...ooo..okkyykkkkYKoooo...",
    "..odddookkkyYkkkkYKodddo..",
    "..odidookkkkYkkkKKKodido..",
    "..oddiooooooooooooooiddo..",
    "...ooohlllllylbbbbbbooo...",
    "....olllbbbbybbbbbbbdo....",
    "...ollllbbbbYbbbbbbbddo...",
    "..olllllbbbbbbbbbbbbdddo..",
    "..obbbbbbbbbbbbbbbbbdddo..",
    "..obbbbbbbbbbbbbbbbbdddo..",
    "..obbbbbbbbbbbbbbbbbdddo..",
    "..obbbbbbbiiiiiibbbbdddo..",
    "..obbbbbiiiiiiiiiibbdddo..",
    "..obbbbbbiiiiiiiibbbdddo..",
    "...oddddddddddddddddddo...",
    "...oddddddddddddddddddo...",
    "....oooooooooooooooooo....",
    "....obbbo.......obbbo.....",
    "....ooooo.......ooooo.....",
]
CUBBLE_FACE_TOP, CUBBLE_FACE_SHIFT = face_place(CUBBLE, 11, 5, FACE_W)
CUBBLE_TAGS = body_tags(CUBBLE, 13, 13, flat_rows=3)
# Hivebear: the bear has become a beehive. Its body is a round straw dome coiled in rings with an
# entrance on its belly, the honey pot on top is the hive's tip, and bees fly in and out; the round
# ears, the muzzle and the stubby paws are still bear fur. It walks.
HIVEBEAR_PALETTE = BEAR_PALETTE | {
    "i": (240, 200, 150), "n": (55, 30, 20),
    "s": (225, 180, 95), "z": (245, 215, 140), "S": (175, 125, 55), "Z": (135, 90, 40),  # straw
    "k": (245, 205, 110), "K": (200, 150, 60),  # the hive's tip
    "q": (235, 245, 255), "x": (35, 25, 20),  # the bees' wings, and the dark of the entrance and their stripes
}
HIVEBEAR = [
    "..............jyyY.............",
    ".............jyyyyY............",
    "............okkkkko............",
    "............oykkkKy............",
    "............oyooooY............",
    ".........ooozYzzzzzooo.........",
    "....ooo..oSZZZSZZZSZZo..ooo....",
    "...obbdoozzzzzzzzsssssoobbdo...",
    "..obbdoozzzzzzzzsssssssoodddo..",
    "..obdioSZZZSZZZSZZZSZZZSoiddo..",
    "..odddozzzzzzzssssssssssodddo..",
    "...odozzzzzzsssssssssssssodo...",
    "....ooZZSZZZSZZZSZZZSZZZSoo....",
    ".....ozzzzssssssssssssssso.....",
    "...oozzzzsssiiiiiiisssssssoo...",
    "....oSZZZSZZiiiiiiiZZSZZZSo....",
    "....ozzsssssiiiiiiissssSSSo....",
    ".ooozsssssssssssssssssSSSSSooo.",
    ".oboZZSZZZSZZZSZZZSZZZSZZZSobo.",
    "obbossssssssssssssssSSSSSSSobbo",
    ".oosssssssssssZZZssSSSSSSSSSoo.",
    ".oooZZZSZZZSZZxxxZZSZZZSZZZooo.",
    "...osssssssssZxxxZSSSSSSSSSo...",
    "..osssssssssssZZZSSSSSSSSSSSo..",
    "...oSZZZSZZZSZZkkZZZSZZZSZZo...",
    "...osssssssssSSSSSSSSSSSSSSo...",
    "...ooooooooooooooooooooooooo...",
    "........obbo.......obbo........",
    "........oooo.......oooo........",
]
HIVE_BEE = [".qq.", "yxyx", "yxyx"]
HIVE_BEES = (((19, 20), (25, 22), (27, 10), (0, 13)), ((20, 19), (26, 21), (27, 9), (1, 12)))  # flying in and out


def hivebear(step):
    grid = HIVEBEAR
    for at in HIVE_BEES[step]:
        grid = overlay(grid, HIVE_BEE, at)
    return grid


HIVEBEAR_FACE_TOP, HIVEBEAR_FACE_SHIFT = face_place(HIVEBEAR, 11, 10, 12)
HIVEBEAR_TAGS = species_tags([hivebear(0), hivebear(1)], 17, 15, idle_ms=250)
HIVEBEAR_TAGS["walk"] = walk_tags(hivebear(0), 17, range(8, 12), range(19, 23), 27)
# Snorbear: the bear has become its own winter den. It lies flat and wide like an earth mound with
# moss and snow on its back; only its sleepy head, one paw and the honey pot (moss-glazed) show, and
# it snores.
SNORBEAR_PALETTE = BEAR_PALETTE | {
    "e": (125, 90, 60), "E": (90, 62, 42), "m": (95, 145, 70), "M": (60, 105, 50), "g": (140, 185, 95),  # earth, moss
    "w": (248, 250, 255), "W": (195, 210, 235), "f": (225, 235, 250),  # snow, and its breath in the cold
    "k": (130, 170, 100), "K": (85, 125, 70),  # the moss glaze of its pot
    "i": (240, 200, 150),
}
SNORBEAR = [
    "................................",
    "................................",
    ".....................jyyY.......",
    "....................jyyyyY......",
    "....................ykkko.......",
    "................ooooykkKo.......",
    ".............ooowwwwYoooo.......",
    "....o.......owwwwwWwwwwwwo......",
    "...odo....oowWWwwWgWwwWWwwoo....",
    "..oddooooowwwmgWWgmmWWmgWwwWo...",
    "...oollllbooWgmmgmegmmgmmWwWo...",
    "..ollllbbbbboeegmeeMmgeegmWgWo..",
    ".ollllbbbbbbboeeeeeeeeeeemgmmWo.",
    ".olllbbbbbbbdoeeeeeeMeeeeEmEgWo.",
    ".olbbbbbbbbddoMeeeeeeeeEEEEMEmo.",
    ".obbbbiiibdddoeeeeeeeMEEEEEEEgWo",
    "f.obiiiiiiidoeeMeeeEEEEEEEEEMEWo",
    ".f.oiiiiiiioeeoooEEEEEMEEEEEEEgo",
    "f....oiiiooooobbbooooooooooooooo",
    "..............ooo...............",
]
SNORE_Z, SNORE_ZZ = ["ff", ".f", "ff"], ["fff", ".f.", "fff"]
SNORBEAR_FACE_TOP, SNORBEAR_FACE_SHIFT = face_place(SNORBEAR, 12, 2, 11)
SNORBEAR_TAGS = species_tags([overlay(SNORBEAR, SNORE_Z, (9, 3)),
                              overlay(overlay(drop_rows(SNORBEAR, 14), SNORE_Z, (9, 2)), SNORE_ZZ, (12, 0))],
                             14, 19, idle_ms=1200)  # its back rises and falls, and it snores
# Ursastra (secret): the bear of the night sky. A big bear upright on its hind legs with its paws
# raised, its body night blue; the seven stars of the Big Dipper shine on it, star honey drips from
# its pot and rises again as little lights. It glows at night (GLOWS in core/src/scene.ts: "k", "K",
# "y", "Y" and "j").
URSASTRA_PALETTE = BEAR_PALETTE | {
    "o": (75, 90, 170), "d": (30, 40, 95), "b": (45, 60, 125), "l": (70, 90, 165), "h": (100, 120, 195),
    "i": (130, 145, 215), "q": (110, 130, 215),  # the lines between the stars
    "k": (255, 248, 210), "K": (255, 215, 110),  # starlight
    "y": (255, 215, 90), "Y": (230, 165, 40), "j": (255, 240, 160),  # star honey
    "p": (55, 75, 160), "P": (35, 50, 120),  # its pot, night blue
}
URSASTRA = [
    "............j..j................",
    ".................j..............",
    ".............jyyY...............",
    ".............yyyyY..............",
    ".............yqppoY.............",
    ".............YppPo..............",
    ".k.kk....ooo..ooo..ooo....kk.k..",
    "..ooo...olbbooooooolbbo...ooo...",
    ".olbbo..obioolllbbooibo..olbbo..",
    ".obbbo..obohlllbbbbbodo..obbbo..",
    ".obbdo...oolllbbbbbboo...obbdo..",
    "..oooo....ollbbbbbbbo....oooo...",
    "...ollo...olbbbbbbddo...obbo....",
    "...ollo...obbbiiidddo...obbo....",
    "....obbo..obbiiiiiddo..obbo.....",
    ".....obo...oobiiidoo..kobo......",
    ".....obbo.ohlooooobboqobbo......",
    "......oboohllllbbbbbkoobo.......",
    ".......oohlllllbbbbqbboo........",
    "........olllllbbbbkbbbo.........",
    "........ollkqqbbqqbbbbo.........",
    "........ollqbbqkbbbbbdo.........",
    "........ollqbbbqbbbbddo.........",
    "........olbqbbbqbbbdddo.........",
    "........obbkqqbqbbddddo.........",
    "........obbbbbqkbdddddo.........",
    "........oobbbbbbdddddoo.........",
    ".......olbobbbbdddddobbo........",
    ".......obbbobbdddddobbdo........",
    "........obbdooooooobbdo.........",
    "........oodoo.....oodoo.........",
    ".......oooooo.....oooooo........",
]
URSA_SPARKS = ((2, 3), (29, 4), (1, 22), (30, 24))


def ursastra(step):
    grid = URSASTRA
    for i, (x, y) in enumerate(URSA_SPARKS):  # the starlight round it twinkles
        grid = overlay(grid, [".k.", "kKk", ".k."] if (i + step) % 2 else ["K"], (x - 1, y - 1) if (i + step) % 2 else (x, y))
    return grid


URSASTRA_FACE_TOP, URSASTRA_FACE_SHIFT = face_place(URSASTRA, 11, 10, 12)
URSASTRA_TAGS = species_tags([ursastra(0), ursastra(1)], 22, 15, idle_ms=500)
URSASTRA_TAGS["walk"] = walk_tags(ursastra(0), 22, range(7, 13), range(18, 24), 30)  # upright on its hind legs

# ---- The penguin line: a penguin chick in red earmuffs

PENGUIN_PALETTE = {
    "o": (25, 30, 45),     # outline
    "d": (50, 58, 80),     # shadow
    "b": (75, 85, 110),    # slate
    "l": (110, 120, 148),  # lit
    "h": (150, 160, 188),  # highlight
    "w": (245, 247, 252),  # its white front
    "W": (205, 210, 225),
    "f": (190, 196, 212),  # a last tuft of down
    "r": (225, 70, 70),    # the earmuffs (the hint)
    "R": (160, 40, 50),
    "q": (250, 140, 130),
    "a": (250, 150, 40),   # feet
    "A": (200, 105, 25),
}
# The baby is still in its grey down
PENGUIN_BABY_PALETTE = PENGUIN_PALETTE | {
    "o": (40, 45, 60), "d": (100, 108, 125), "b": (140, 148, 165), "l": (175, 182, 198), "h": (210, 215, 228)}
# Baby: a fluffy grey chick with a white face, a tuft of down on top, orange feet and red earmuffs
PENGUIN_BABY = [
    "......l.l.......",
    ".....olool......",
    "....RRRRRRRR....",
    "...RlhllbbbbR...",
    "..RlhhlbbbbbdR..",
    ".RRlhwwwwwbbdRR.",
    "rqrhwwwwwwwwbrqr",
    "rrrwwwwwwwwwwrrr",
    "RrRwwwwwwwwwwRrR",
    ".RRwwwwwwwwwwRR.",
    ".obbwwwwwwwwbddo",
    ".odbbwwwwwwbdddo",
    ".oddddddddddddo.",
    "..oaAaooooaAao..",
]
PENGUIN_BABY_FACE_TOP, PENGUIN_BABY_FACE_SHIFT = face_place(PENGUIN_BABY, 6, 3, BABY_W)
PENGUIN_BABY_TAGS = body_tags(PENGUIN_BABY, 10, 8, flat_rows=3)
# Waddlet, the child: grown upright, a slate back with a last tuft of down, a white heart-shaped face
# and belly, little flippers held out for balance, orange feet, the earmuffs on their band
WADDLET = [
    "............f.f.............",
    ".............f..............",
    "...........RRRRRR...........",
    "........RRRooooooRRR........",
    ".......RooollllbboooR.......",
    "......RohllllllbbbbboR......",
    "......ollbbbbbbbbbbbdo......",
    "...RRolllbbbbbbbbbbbddoRR...",
    "..RrqRlwwwwwwbbwwwwWWdRqrR..",
    "..rqrRlwwwwwwbbwwwwWWdRrqr..",
    "..rrrRbwwwwwwbbwwwwWWdRrrr..",
    "..RrRRbwwwwwwwwwwwwWWdRRrR..",
    "...RRbbwwwwwwwwwwwwWWddRR...",
    "...odbbwwwwwwwwwwwwWWdddo...",
    "..oddbbwwwwwwwwwwwwWWddddo..",
    ".oddobbwwwwwwwwwwwwWWddoddo.",
    ".odo.odwwwwwwwwwwwwWWdo.odo.",
    ".oo..oddwwwwwwwwwwwWddo..oo.",
    ".....oddWWWWWWWWWWWWddo.....",
    ".....oooooooooooooooooo.....",
    "........aaA......aaA........",
    ".......aaaAA....aaaAA.......",
]
WADDLET_FACE_TOP, WADDLET_FACE_SHIFT = face_place(WADDLET, 9, 6, FACE_W)
WADDLET_TAGS = body_tags(WADDLET, 13, 14, flat_rows=3)
# Tuxwaddle: the penguin's body has become a tailcoat. Tall, narrow and very upright, its white front
# a shirt between dark lapels, its tail feathers grown long and split like coat tails; one flipper is
# held out flat as a tray with a steaming cup on it. Its earmuffs are a deeper red. It waddles.
TUXWADDLE_PALETTE = PENGUIN_PALETTE | {
    "r": (200, 40, 60), "R": (130, 25, 45), "q": (240, 110, 130),  # velvet earmuffs
    "z": (215, 225, 240),  # steam
}
TUXWADDLE = [
    ".......RRRRRRR.............",
    "......RoooooooR............",
    ".....RohllllbboR...........",
    "....RohlllllbbboR..........",
    "..ooRowwwwlwwWWoRoo........",
    ".oRroowwwwwwwWWooRro.......",
    ".orqoowwwwwwwWWoorqo.......",
    ".orroowwwwwwwWWoorro.......",
    ".oRroolwwwwwWWdooRro.......",
    "..oo.olbwwwwWddo.oo........",
    "......olbbwbbdo............",
    ".....ollbwwwbbbo...owwo....",
    "....oolbbwwwbbbo...oWWo....",
    "....oolbbwdwbbbo..ooooooo..",
    "....oobbbwwwbbdooolllbbbbo.",
    "....oobbbwdwbbdoobbbbbbddo.",
    "....olbbbbwbbddo.ooooooooo.",
    "....oobbbbdbbddo...........",
    "....oobbbbwbdddo...........",
    "....oobbbwwwdddo...........",
    "...ooobbbwwwdddoo..........",
    "....oobbwwwwWddoo..........",
    "....odobwwwwWdodo..........",
    "...oddowwwwwWWoddo.........",
    "...odddowwwwWodddo.........",
    "...oddooowwwoooddo.........",
    "..oooo...ooo...oooo........",
    ".......aaA...aA............",
    ".......aaAA.aaAA...........",
]
TUX_STEAM = ({(20, 8): "z", (22, 8): "z", (19, 9): "z", (21, 9): "z"},
             {(19, 8): "z", (21, 8): "z", (20, 9): "z", (22, 9): "z"})
TUXWADDLE_FACE_TOP, TUXWADDLE_FACE_SHIFT = face_place(TUXWADDLE, 5, 5, 11)
TUXWADDLE_TAGS = species_tags([dots(TUXWADDLE, steam) for steam in TUX_STEAM], 19, 10, idle_ms=600)
TUXWADDLE_TAGS["walk"] = walk_tags(dots(TUXWADDLE, TUX_STEAM[0]), 19, range(7, 10), range(13, 16), 27, ms=(260, 160))
# Glidepin: its feet have grown into skate blades. Streamlined and leaning far forward, one flipper
# swung forward and one swept back (drawn lighter, so that it doesn't run into its back), its belly
# smooth and shining like ice; the earmuffs are ice blue. It skates along, frost spraying behind it.
GLIDEPIN_PALETTE = PENGUIN_PALETTE | {
    "r": (140, 200, 240), "q": (215, 240, 255), "R": (80, 140, 195),  # ice-blue earmuffs
    "c": (205, 232, 250), "C": (160, 205, 235), "z": (255, 255, 255),  # its icy belly, and speed lines
    "s": (200, 210, 225), "S": (120, 130, 150),  # the blades
}
GLIDEPIN = [
    "..............................o.",
    "............................ooo.",
    "..........................oolo..",
    "....RRRRRRR.............oollo...",
    "...RoooooooR..........oolloo....",
    "...olllllbboR.......oolllo......",
    "..ollllbbbbbo......ollloo.......",
    ".oolllbbbbbboooooooooooooooo....",
    "oRrowwwbwwccoRrollllbbbbbbo.....",
    "orqowwwwwwccorqollbbbbbbbo......",
    "orrowwwwwwccorrobbbbzccoo...CCCC",
    ".oowwwwwwwccooobbbczcco.........",
    "..owwwwwwwccobbbcczcco..........",
    "...owwwwwwcobcccczcco.....CCCC..",
    "....ooooooozcccczooo............",
    "...ooobbo.ooooooo...o...........",
    ".oobbbdoo..odo.....odo..........",
    "oooooo.....odo.....odo..........",
    "............o.......o...........",
    "..........aaA.....aaA...........",
    ".........ssssssSossssssSo.......",
    "..........oSSSSo..oSSSSo........",
]
GLIDE_SPRAY = ({(26, 19): "q", (28, 18): "q", (29, 20): "q", (31, 19): "q", (27, 21): "q"},
               {(27, 20): "q", (29, 19): "q", (28, 21): "q", (30, 18): "q", (31, 20): "q"})
GLIDEPIN_FACE_TOP, GLIDEPIN_FACE_SHIFT = face_place(GLIDEPIN, 8, 2, 11)
GLIDEPIN_TAGS = species_tags([dots(GLIDEPIN, GLIDE_SPRAY[0])], 11, 16)
GLIDEPIN_TAGS["flutter"] = [(dots(GLIDEPIN, spray), 120) for spray in GLIDE_SPRAY]  # skating
# Aurorapin (secret): round and big, its belly a window of ice into the polar night with one calm band
# of the northern lights in it, ribbons of light streaming from its back as a train, snowflakes
# round it, its earmuffs glowing green and violet. It glows at night (GLOWS in core/src/scene.ts:
# "r", "q", "R", "g", "G", "t" and "v").
AURORAPIN_PALETTE = PENGUIN_PALETTE | {
    "o": (20, 25, 50), "d": (40, 48, 80), "b": (60, 70, 108), "l": (95, 105, 148), "h": (135, 145, 188),
    "r": (90, 235, 170), "q": (210, 255, 235), "R": (170, 110, 235),  # glowing earmuffs
    "n": (15, 22, 60), "N": (30, 40, 95), "x": (240, 245, 255), "f": (235, 245, 255),  # the polar night
    "g": (90, 235, 170), "G": (60, 190, 160), "t": (120, 215, 240), "v": (180, 120, 240),  # the northern lights
    "s": (190, 215, 240), "S": (130, 165, 205),  # the window's frame of ice
}
AURORAPIN = [
    "..f.............................",
    ".fxf............................",
    "..f.............................",
    ".......RRRRRRRRR................",
    "......RoooooooooR...............",
    ".....RolllllllbboR..............",
    "....RolllllllbbbboR.............",
    ".ooRollwwwwlwWWWbboR.oo.........",
    "oRrolllwwwwbwWWWbbbooRro........",
    "orqolllwwwwwwWWWbbboorqo........",
    "orrolllwwwwwwWWWbbbborro........",
    "orrolllwwwwwwWWWbbbborro........",
    "oRrolllwwwwwwWWWbbbboRro........",
    ".oolllwwwwwwwWWWWbbbboo.........",
    ".ollllwwwwwwwWWWWbbbdo..........",
    "oolllwwwwoooooWWWWbddoo.....f...",
    "oolllwwooqqqqsooWWdddoo....fxf..",
    "oollbwoqqNNNNnssoWdddodo....f...",
    "oolbbwoqNxNNnnnsoWdddodo........",
    "odobboqgggggggggsoddoddo........",
    "odobboqGGGGGGGGGSoddodo.........",
    "ooobboqNnnnnnnnnSoddooo.........",
    "...obbosnnnnxnnSoddo............",
    "...obbossfffffSSoddo............",
    "....obboossSSSooddo......f......",
    ".....obwwoooooWWdo......fxf.....",
    "......obwwwwwWWdo........f......",
    ".......ooooooooo................",
    ".......aaA...aaA................",
    ".......aaAA.aaAA................",
]
AURORA_TRAIN = ([
        ".............vv",
        "............v..",
        "...........v.gg",
        ".........vv.g..",
        "..vvvvvvvvvg.tt",
        ".vvvvvvvvgg.t..",
        "vvgggggggggt...",
        "vggggggggtt....",
        "ggttttttttt....",
        "gtttttttt......",
        "tt.............",
        "t..............",
], [
        "..........vvvvv",
        "........vvv....",
        ".......vvvggggg",
        ".....vvvggg....",
        "....vvvgggttttt",
        "vvvvvgggttt....",
        "vvvvgggttt.....",
        "gggggttt.......",
        "ggggttt........",
        "ttttt..........",
        "tttt...........",
])
AURORA_TRAIN_TOP = (2, 3)  # the ribbons wave
AURORAPIN_FACE_TOP, AURORAPIN_FACE_SHIFT = face_place(AURORAPIN, 9, 5, 13)
AURORAPIN_TAGS = species_tags([behind(AURORAPIN, train, 17, top) for train, top in zip(AURORA_TRAIN, AURORA_TRAIN_TOP)],
                              20, 11, idle_ms=500)
AURORAPIN_TAGS["walk"] = walk_tags(behind(AURORAPIN, AURORA_TRAIN[0], 17, AURORA_TRAIN_TOP[0]), 20, range(7, 10),
                                   range(13, 16), 28, ms=(300, 180))

# ---- The bat line: a bat with big pointed ears

BAT_PALETTE = {
    "o": (40, 25, 55),     # outline
    "d": (100, 65, 130),   # shadow
    "b": (140, 100, 175),  # bat purple
    "l": (175, 140, 205),  # lit
    "h": (210, 185, 230),  # highlight
    "i": (240, 150, 190),  # inside the ears
    "I": (200, 105, 150),
    "v": (120, 80, 155),   # the wing membrane (the hint)
    "V": (85, 55, 115),
    "c": (225, 215, 235),  # claws
}
# Baby: a purple slime with two huge pointed ears and two small wings folded at its sides
BAT_BABY = [
    "....o............o....",
    "...odo..........odo...",
    "...oido........odio...",
    "..odiido......odiido..",
    "..odiIido....odiIido..",
    "..odiIIido..odiIIido..",
    "...odioolhllbbooido...",
    "o..odolhhlbbbbbdodo..o",
    "oo..ollhbbbbbbbbdo..oo",
    "ovooolbbbbbbbbbbdooovo",
    "ovvolbbbbbbbbbbbddovvo",
    "oVvolbbbbbbbbbbbddovVo",
    "ovVobbbbbbbbbbbbddoVvo",
    "o.oodbbbbbbbbbbdddoo.o",
    "...oddddddddddddddo...",
    "....oooooooooooooo....",
]
BAT_BABY_FACE_TOP, BAT_BABY_FACE_SHIFT = face_place(BAT_BABY, 9, 6, BABY_W)
BAT_BABY_TAGS = body_tags(BAT_BABY, 11, 11, flat_rows=3)
# Flapling, the child: its two huge pointed ears, and real wings now, half spread with finger bones,
# a scalloped edge and a thumb claw; little clawed feet
FLAPLING = [
    "........o..............o........",
    ".......odo............odo.......",
    ".......oido..........odio.......",
    "......odiido........odiido......",
    "......odiIido......odiIido......",
    "c.....odiIIido....odiIIido.....c",
    "oo....odiIIIido..odiIIIido....oo",
    "ovoo...odiIIooooooooIIido...oovo",
    "ovvvoo.oddoolllllbbbooddo.oovvvo",
    "ovVvvvoooolllllllbbbbboooovvvVvo",
    "ovvVvvvohllbbbbbbbbbbbddovvvVvvo",
    "ovvvVvvolllbbbbbbbbbbbddovvVvvvo",
    "oVvvvVollllbbbbbbbbbbbdddoVvvvVo",
    "ovVvvvobbbbbbbbbbbbbbbdddovvvVvo",
    "ovvVvvobbbbbbbbbbbbbbbdddovvVvvo",
    "o.ovVvobbbbbbbbbbbbbbbdddovVvo.o",
    "...o.oobbbbbbbbbbbbbbbdddoo.o...",
    "......obbbbbbbbbbbbbbbdddo......",
    ".......oddddddddddddddddo.......",
    ".......oddddddddddddddddo.......",
    ".......oooooooooooooooooo.......",
    "...........oco....oco...........",
]
FLAPLING_FACE_TOP, FLAPLING_FACE_SHIFT = face_place(FLAPLING, 11, 8, FACE_W)
FLAPLING_TAGS = body_tags(FLAPLING, 14, 16, flat_rows=3)
# Umbrabat: its wings have grown together into an umbrella over its head, the finger bones its ribs
# with a claw at each tip; its body is the shaft and its tail the hooked handle, and the big ears stick
# up through the top. Rain runs off its edge. It floats along like an umbrella in the wind.
UMBRABAT_PALETTE = BAT_PALETTE | {
    "v": (125, 130, 155), "u": (165, 170, 192), "V": (85, 90, 115),  # its canopy, rain-cloud grey
    "r": (140, 195, 240), "R": (90, 150, 210),  # rain
}
UMBRABAT = [
    "........o...........o........",
    "........do.........od........",
    ".......odio.......oido.......",
    ".......odiio.....oiido.......",
    ".......odIIio...oiIIdo.......",
    "........odiioooooiido........",
    ".......ouodouddVVodoVo.......",
    ".....ouuuuuudvdvVVVVVVVo.....",
    "...ouuuuduudvvdvvVVVVVVVVo...",
    "..ouuuduuudvvvdvvvVVVVVVVVo..",
    ".ouuduuuudvvvvdvvvvVVVVVVVVo.",
    ".oduuuuudvvvvvdvvvvvVVVVVVVo.",
    ".ouuuuudvvvvvvdvvvvvvVVVVVVo.",
    ".ooooooooooooooooooooooooooo.",
    "..c.....c..ooooooo..c.....c..",
    "..........ohlllbbbo..........",
    ".........ollllbbbbbo.........",
    ".........olllbbbbbbo.........",
    ".........olbbbbbbbdo.........",
    ".........obbbbbbbddo.........",
    ".........obbbbbbdddo.........",
    "..........obbbddddo..........",
    "...........ooobooo...........",
    ".............obo.............",
    "..............d..............",
    "..............d..............",
    "..........c...d..............",
    "..........d...d..............",
    "...........d.d...............",
    "............d................",
]
UMBRA_RAIN = ((2, 16), (26, 16), (8, 17), (20, 17), (0, 20), (28, 20))


def umbrabat(step):
    grid = UMBRABAT
    for k, (x, y) in enumerate(UMBRA_RAIN):  # the drops run off and fall
        grid = overlay(grid, ["r", "R"], (x, y + (k + step) % 2))
    return grid


UMBRABAT_FACE_TOP, UMBRABAT_FACE_SHIFT = face_place(UMBRABAT, 17, 9, 11)
UMBRABAT_TAGS = species_tags([umbrabat(0), umbrabat(1)], 19, 14, idle_ms=400)
# Batbeat: its big ears have become two loudspeaker horns whose membranes throb to the beat; a small
# body, the wings bent like arms bobbing over a mixing desk, one up and one down, and its eyes shut
# with joy. Sound rings ripple out of the horns.
BATBEAT_PALETTE = BAT_PALETTE | {
    "n": (80, 240, 230), "N": (30, 170, 180),  # the membranes, and the sound
    "m": (250, 80, 200), "M": (180, 40, 150), "q": (255, 190, 240),  # its wings, neon
    "x": (20, 12, 30),
}
BATBEAT = [
    ".....n..................n.......",
    "....n..ooo...........ooo..n.....",
    "......oiiio.........oiiio.......",
    ".....oinnnio.......oinnnio......",
    "...n.oinxnIo.......oinxnIo.n....",
    ".....oiNNNIo.......oiNNNIo......",
    "......oIIIoo.......ooIIIo.......",
    ".......ooobbo.....obbooo........",
    "........obbbo.....obbbo.........",
    "..oo.....obddo...obbbo..........",
    "..oqoo....oddo...obbo...........",
    "..oqmMoo...odooooobo............",
    "...oqmmMoo.oollllboo.oooooo.....",
    "..oqmmMmmMollllbbbbboomMmmqoo...",
    "...oqmmMmmolllbbbbbbooMmmMmmqo..",
    "..oqmmMmmMollbbbbbbboommMmmqo...",
    "...ooqmmMollbbbbbbbbdoMmmMmmqo..",
    ".....oooooobbbbbbbbdo.ooMmmqo...",
    "..........obbbbbbdddo...ooMmqo..",
    "..........obbbbbddddo.....ooqo..",
    "...........oobbdddoo........oo..",
    ".............ooooo..............",
    "............c.c..c.c............",
]
BEAT_HORN = [".ooooo.", "oinnnio", "onnnnNo", "onnxnNo", "onNNNNo", "oiNNNIo", ".ooooo."]  # the membrane throbs out
BATBEAT_LOUD = dots(overlay(overlay(BATBEAT, BEAT_HORN, (5, 1)), BEAT_HORN, (19, 1)),
                    {(2, 1): "n", (28, 1): "n", (2, 4): "n", (28, 4): "n"})
BATBEAT_FACE_TOP, BATBEAT_FACE_SHIFT = face_place(BATBEAT, 14, 10, 11)
BATBEAT_TAGS = species_tags([BATBEAT, BATBEAT_LOUD], 17, 15, idle_ms=250)  # to the beat
# Lunaflap (secret): the moon's bat. Its wings are made of moonlight, silver and spread so wide they
# fill the sky; the tips of its big ears are two crescent moons, and silver sparks trickle down from
# the edge of its wings. It flies, and it glows at night (GLOWS in core/src/scene.ts: "s", "S", "z",
# "B", "k", "K" and "x").
LUNAFLAP_PALETTE = BAT_PALETTE | {
    "o": (95, 100, 160), "d": (70, 55, 120), "b": (105, 90, 165), "l": (145, 135, 200), "h": (190, 185, 235),
    "s": (200, 210, 245), "S": (160, 175, 225), "z": (230, 236, 255), "B": (245, 248, 255),  # moonlight
    "k": (255, 248, 205), "K": (230, 205, 120), "x": (220, 230, 255),  # the moons, and the sparks
}
LUNAFLAP = [
    "........kkk..........kkk........",
    ".......kk..............kk.......",
    ".......kK..............Kk......B",
    "BB......KKK..........KKK.....BB.",
    "ozBB.....do..........od....BBso.",
    "ozzzBB..odio........oido.BBssso.",
    "ozzzzzBBodiio......oiidoBssssso.",
    "ozzzzzssodIIioooo.oiIIdosssssso.",
    "ozzzzssBBodioollbooiidoBsssssso.",
    "ozzzzsBBBsoolllbbbbodoBBBssssso.",
    "ozzzsBsBBsolllbbbbbbozBBsBsssso.",
    "ozzsBssBBsollbbbbbbbosBBssBssSo.",
    "oooBssBsBsolbbbbbbddosBsBssBoSo.",
    "o.BossBsBsobbbbbbdddosBsBssoBoo.",
    ".B.ossBsBSSobbbbdddossBsBsso.Bo.",
    "B..ossBsBSSSooooooosssBsBsSo..B.",
    "...osBssBSSoohllbboossBssBSo....",
    "...osBoSBSo.ollbbbo.osBsoBo.....",
    "....oB.oBo..olbbbbo..oBo.Bo....x",
    "....B...B...obbbbdo...B...B.....",
    "k...B...B...obbbddo...B...B...k.",
    "........B....ooooo....B.........",
    "............c.c..c.c............",
    "...x.......................x....",
    "..x....x...............x........",
    ".xkxk..........x..........k..x..",
    "..x.....k.....xkx.....k.....xkx.",
    "...............x.............x..",
]
LUNAFLAP_B = [
    "Bo......kkk..........kkk.....oB.",
    "oBB....kk..............kk...BBo.",
    "ozzB...kK..............Kk..Bsso.",
    "ozzzBo..KKK..........KKK.oBssso.",
    "ozzzzBB..do..........od.BBsssso.",
    "ozzzzzsBodio........oidosssssso.",
    "ozzzzsssodiio......oiidosssssso.",
    "ozzzzssBodIIioooo.oiIIdosssssso.",
    "ozzzsBBBBodioollbooiidoBBBsssso.",
    "ozosBssBBsoolllbbbbodoBBssBsoSo.",
    "ooBBsssBBsolllbbbbbbosBBsssBBoo.",
    "oB.osssBBsollbbbbbbbosBBssso.Bo.",
    "B..ossBsBsolbbbbbbddosBsBsso..B.",
    "...ossBsBSobbbbbbdddosBsBsso....",
    "...ossBsBSSobbbbdddossBsBsSo....",
    "...osBosBSSSooooooosssBsoBSo...x",
    "...ooB.oBSooohllbbooosBo.Boo....",
    "k...oB.oBo..ollbbbo..oBo.Bo...k.",
    "....oB.oB...olbbbbo...Bo.Bo.....",
    "....B...B...obbbbdo...B...B.....",
    "....B...B...obbbddo...B...B.....",
    "........B....ooooo....B.........",
    "............c.c..c.c............",
    "...x.......................x....",
    "..x....x...............x........",
    ".xkxk..........x..........k..x..",
    "..x.....k.....xkx.....k.....xkx.",
    "...............x.............x..",
]
LUNAFLAP_FACE_TOP, LUNAFLAP_FACE_SHIFT = face_place(LUNAFLAP, 10, 10, 11)
LUNAFLAP_TAGS = species_tags([LUNAFLAP, LUNAFLAP_B], 17, 15, idle_ms=600)
LUNAFLAP_TAGS["flutter"] = [(LUNAFLAP, 120), (LUNAFLAP_B, 120)]  # its wings beat

# Faces. Baby and child: the slime's faces in the line's colors (the bat's with a fang); the adults':
# kit_face, the bears' with a nose, the bats' with a fang, and the penguins' mouth is a little beak.
BEAR_FACE_PALETTE = FACE_PALETTE | {"d": (140, 85, 45), "m": (70, 40, 25), "k": (255, 150, 170)}
PENGUIN_FACE_PALETTE = FACE_PALETTE | {"d": (100, 108, 125), "m": (240, 150, 40), "k": (255, 150, 170)}
BAT_FACE_PALETTE = FACE_PALETTE | {"d": (100, 65, 130), "m": (45, 25, 60), "k": (255, 150, 170), "W": (255, 252, 240)}
hivebear_face_grid = ursastra_face_grid = nosed(kit_face(6), ["nn"])
snorbear_face_grid = nosed(kit_face(5), ["nn"])
HIVEBEAR_FACE_PALETTE = SNORBEAR_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (140, 85, 45)}
URSASTRA_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (30, 40, 95), "n": (20, 25, 60)}
tuxwaddle_face_grid = glidepin_face_grid = kit_face(5)
aurorapin_face_grid = kit_face(7)
TUXWADDLE_FACE_PALETTE = GLIDEPIN_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (50, 58, 80), "m": (240, 150, 40)}
AURORAPIN_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (40, 48, 80), "m": (240, 150, 40)}
umbrabat_face_grid = batbeat_face_grid = lunaflap_face_grid = fanged(kit_face(5))
UMBRABAT_FACE_PALETTE = BATBEAT_FACE_PALETTE = LUNAFLAP_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (100, 65, 130)}
ADVENTURE_LINES = (("bear", "cubble", baby_face_grid, face_grid), ("penguin", "waddlet", baby_face_grid, face_grid),
                   ("bat", "flapling", fanged(baby_face_grid), fanged(face_grid)))
ADVENTURE_FORMS = (("hivebear", FACES), ("snorbear", kit_faces(normal=("closed", "small", False),
                                                              smile=("closed", "small", True))),  # always dozing
                   ("ursastra", FACES), ("tuxwaddle", FACES), ("glidepin", FACES), ("aurorapin", FACES),
                   ("umbrabat", FACES), ("batbeat", kit_faces(normal=("happy", "laugh", True),  # lost in the music
                                                              smile=("happy", "laugh", True))),
                   ("lunaflap", FACES))


# ---------------------------------------------------------------- The festival and star lines

# Four lines, each with its egg, baby, child, a basic adult, a second one and a secret one: the owl
# that a shooting star brings, the chameleon and the paper kite from the trick festival, and the
# scarab that is dug up. What every form of a line keeps: the too-big glasses (the owl), the curled
# tail and the changing colors (the chameleon), the ball it pushes (the scarab) and the tail with
# its bows (the paper kite). The child carries the colors the code may recolor as a hint at its
# adult form: the rims of the glasses, the tail spiral, the ball and the bows.

# The eggs: a night-blue egg with two feather tufts and stars on it, a shooting star falling across
# it, lying on red roof tiles; a speckled leaf-green egg turning yellow and orange at its bottom, a
# blue first-prize rosette pinned to its side; a red festival-paper egg folded like a kite with a
# gold frame, a string tail with two blue bows off its point; a scarab-green egg split by the gold
# seam of wing cases, half dug out of a sand heap marked with a red cross.
OWL_EGG = [
    "..o......o..",
    "..oho..oho..",
    "..oheooeEo..",
    "..oheeeseo..",
    ".oheeeeeqEo.",
    ".oeseeeqeEo.",
    ".oeeeeseeEo.",
    ".oeeeSeeeEo.",
    ".oeeeeeesEo.",
    ".oeseeeeeEo.",
    "..oeeeeeEo..",
    "rRroEEEEoRrR",
    "RrrRrrRrrRrr",
    "RRRRRRRRRRRR",
]
CHAMELEON_EGG = [
    "....oooo....",
    "...oheeEo...",
    "..oheEeeEo..",
    "..oeeeeeEo..",
    ".oheeEeeeEo.",
    ".oeeeeeEebb.",
    ".oeEeyeebjjb",
    ".oyeyeyybjjb",
    ".oyyyyyyYbb.",
    ".oryyryyYBo.",
    "..orrrrrRBo.",
    "..orrrrRRoB.",
    "...oRRRRo...",
    "....oooo....",
]
SCARAB_EGG = [
    "....oyyo....",
    "...ohyYEo...",
    "..oheyYeEo..",
    "..ohhyYeEo..",
    ".ohheeyYeEo.",
    ".ohheeyYeEo.",
    ".oheeeyYeEo.",
    ".oeeeeyYEEo.",
    ".oeeeeyYEEo.",
    ".oeeeeyYEEo.",
    "..nnoeyYonn.",
    ".rarAnnnnaa.",
    "aaraaAaaAaaa",
    "ArArAAAAAAAA",
]
KITE_EGG = [
    "....oyyo....",
    "...ohyyEo...",
    "..ohyhEyEo..",
    "..oyhhEEyo..",
    ".oyhhhEEEyo.",
    ".yhhhhyEEEy.",
    ".oyhhhEEEyo.",
    "..oyhhEEyo..",
    "..ohyhEyEo..",
    "...ohyyEo...",
    "....oyyo....",
    "uu.uukk.....",
    ".uUuk...kuUu",
    "uu.uu..uu.uu",
]
EGG_GRIDS |= {"owl": OWL_EGG, "chameleon": CHAMELEON_EGG, "scarab": SCARAB_EGG, "kite": KITE_EGG}
RARE_EGG_PALETTES |= {
    "owl": {"o": (25, 25, 55), "e": (65, 72, 140), "E": (45, 50, 105), "h": (110, 120, 185), "s": (255, 230, 120),
            "S": (255, 252, 230), "q": (150, 150, 175), "r": (205, 95, 60), "R": (140, 55, 40), "x": (20, 20, 45)},
    "chameleon": {"o": (30, 60, 35), "e": (110, 190, 80), "E": (70, 140, 60), "h": (175, 230, 130), "y": (245, 215, 80),
                  "Y": (215, 170, 50), "r": (240, 130, 60), "R": (195, 85, 45), "b": (80, 135, 230),
                  "B": (45, 80, 170), "j": (255, 225, 100), "x": (25, 50, 30)},
    "scarab": {"o": (20, 45, 50), "e": (40, 160, 140), "E": (25, 110, 105), "h": (130, 220, 190), "y": (240, 195, 70),
               "Y": (185, 140, 45), "a": (225, 190, 125), "A": (175, 135, 85), "n": (105, 70, 40), "r": (215, 45, 45),
               "x": (15, 35, 40)},
    "kite": {"o": (90, 20, 30), "e": (225, 70, 60), "E": (175, 40, 45), "h": (250, 140, 120), "y": (250, 200, 70),
             "k": (130, 95, 60), "u": (90, 170, 235), "U": (50, 110, 190), "x": (90, 20, 30)},
}

# ---- The owl line: an owl whose glasses are far too big for it

OWL_PALETTE = {
    "o": (55, 35, 25),     # outline
    "d": (125, 82, 50),    # shadow
    "b": (165, 112, 70),   # tawny
    "l": (200, 155, 105),  # lit
    "h": (230, 200, 150),  # highlight, its chest
    "e": (100, 62, 38),    # the bars on its chest
    "f": (245, 230, 200),  # the face disc
    "F": (220, 200, 165),
    "g": (240, 195, 60),   # the rims of its glasses (the hint)
    "G": (185, 135, 35),
    "S": (255, 255, 255),  # a glint on the glass
    "a": (240, 165, 55),   # talons and beak
    "A": (190, 110, 30),
}
# Baby: a round tawny owlet with feather tufts, a cream face disc and far too big gold glasses, two
# talons
OWL_BABY = overlay(overlay([
    ".o............o.",
    ".oo..........oo.",
    ".olo........olo.",
    ".oloolhllbboolo.",
    ".oolhhlbbbbbdoo.",
    ".offffbbbbffffo.",
    ".ffffffffffffff.",
    "offffffffffffffo",
    "offffffffffffffo",
    "obffffffffffffdo",
    "odbffffffffffddo",
    "odddbdbddddbdbdd",
    ".oooooooooooooo.",
    "..oaao....oaao..",
    "..a.a......a.a..",
], [".gggg.", "g....G", "g....G", "g....G", "gG..GG", ".GGGG."], (1, 6)),
    [".gggg.", "g....G", "g....G", "g....G", "gG..GG", ".GGGG."], (8, 6))
OWL_BABY_FACE_TOP, OWL_BABY_FACE_SHIFT = face_place(OWL_BABY, 7, 3, BABY_W)
OWL_BABY_TAGS = body_tags(OWL_BABY, 9, 8, flat_rows=3)
# Hootlet, the child: upright, long ear tufts, a cream face disc, the glasses even more too big
# (two huge round rims with a glint, ear pieces poking out), folded wings with feather tips, a
# barred chest and orange talons
HOOTLET = [
    "..o....................o..",
    "..oo..................oo..",
    "..olo................olo..",
    "..olbo..............oblo..",
    "..oldbo..oooooooo..obdlo..",
    "..oddbooolllllbbbooobddo..",
    "..obdoolffllllbbffboodbo..",
    "....ohggggggbbggggggdo....",
    "...olgSffffgggSffffggdo...",
    "...ofgffffffggfffffFGFo...",
    "..GGggffffffggfffffFGGGG..",
    "..ooGGffffffGGfffffFGGoo..",
    "..odoGffffffGGfffffFGodo..",
    ".oddoGGffffGGGGffffGGoddo.",
    "oddbobGGGGGGbbGGGGGGdobddo",
    "odbdobbbFFbbbbbbFFbbdodbdo",
    "oddbobbbbbbbhhbbbbbbdobddo",
    "odbdoddddhhehhhehddddodbdo",
    ".oddodddhhhhhhhhhhdddoddo.",
    "o.ododdhhehhhehhhehddodo.o",
    "...oooooooooooooooooooo...",
    ".....aa.aa.....aa.aa......",
    ".....a.a.a.....a.a.a......",
]
HOOTLET_FACE_TOP, HOOTLET_FACE_SHIFT = face_place(HOOTLET, 8, 5, FACE_W)
HOOTLET_TAGS = body_tags(HOOTLET, 16, 13, flat_rows=3)

# ---- The chameleon line: a chameleon whose colors roll over it, its tail curled up

CHAMELEON_PALETTE = {
    "o": (30, 60, 35),     # outline
    "d": (60, 130, 55),    # shadow
    "b": (100, 180, 75),   # leaf green
    "l": (150, 215, 105),  # lit
    "h": (195, 240, 150),  # highlight
    "y": (245, 215, 80),   # its colors turning
    "Y": (210, 165, 50),
    "r": (240, 135, 60),
    "R": (195, 90, 45),
    "t": (245, 125, 55),   # the tail spiral (the hint)
    "T": (190, 80, 40),
    "q": (255, 190, 110),
}
# Baby: a leaf-green slime with a helmet crest, its bottom turning yellow and orange, its tail rolled
# into a curl
CHAMELEON_BABY = [
    ".....ooo...............",
    "....oldbo..............",
    "...olhdbbo.............",
    "...olhldbbdoo..........",
    "..olhhlbbbbbdo...oooo..",
    ".ollhbbbbbbbbdo.orrrRo.",
    ".olbbbbbbbbbbdoorooooRo",
    "olbbbbbbbbbbbyyoroyyoRo",
    "olbbbbbbbbbbyyrorooyoRo",
    "obbbbbbbbbbbyrrrrRooRo.",
    "odbybbbbbbybyrRRRRRRo..",
    "oyyyyrryyyyrrRRooooo...",
    ".oodbooooooRrRo........",
    "..o.o......o.o.........",
]
CHAMELEON_BABY_FACE_TOP, CHAMELEON_BABY_FACE_SHIFT = face_place(CHAMELEON_BABY, 6, 3, BABY_W)
CHAMELEON_BABY_TAGS = body_tags(CHAMELEON_BABY, 7, 7, flat_rows=3)
# Colorlet, the child: a taller helmet crest, turret eyes ringed in green, its colors rolling over it
# (green head, yellow back and belly, orange spots), four gripping legs and a much bigger tail rolled
# into a tight spiral
COLORLET = [
    "........oo......................",
    ".......olbo.....................",
    "......olhdbo....................",
    ".....olhhldbo...................",
    "....olhhlbbbdo..................",
    "...olhhoooooooo.................",
    "....ooolllllbbbooo..............",
    "...ohlllllllbbbbbbo.............",
    "..ollllllbbbbllllbdo............",
    ".ollllbbbdbblbbbbdddo..oooooo...",
    "olllllbbbbbbbbbbbbdYdooqqqqqqo..",
    "obblbbbbbbdlbbbbybddYoqttttttqo.",
    "obbbbbbbbbbbbbbybydYYotooooootTo",
    "obbblbbbbdbblbybydYYYotoqqYyotTo",
    "obbbbddddbbybddddyYYrotottYyotTo",
    "obbbbbbbybybyyyyryYYYotoqtYyotTo",
    "obbbbbbybybyyyyyyyYrYotoqtoootTo",
    ".oddYdYdYYYYYYYrYYYYoytoqtoootTo",
    ".odYdYdYYYYrYYYYYYrYoytoqttttTo.",
    "..ooooooooooooooooooottoqtTTTo..",
    "...oYyo........oyro.oytoooooo...",
    "..oyyyo.......oyyyo..oo.........",
    "..o.o.o.......o.o.o.............",
]
COLORLET_FACE_TOP, COLORLET_FACE_SHIFT = face_place(COLORLET, 9, 3, FACE_W)
COLORLET_TAGS = body_tags(COLORLET, 15, 10, flat_rows=3)

# ---- The scarab line: a beetle that rolls a ball in front of it

SCARAB_PALETTE = {
    "o": (15, 40, 45),     # outline
    "d": (30, 110, 105),   # shadow
    "b": (45, 160, 140),   # scarab green
    "l": (100, 205, 175),  # lit
    "h": (170, 240, 210),  # highlight
    "y": (240, 195, 70),   # the gold seam of its wing cases
    "Y": (190, 140, 45),
    "a": (230, 200, 140),  # its ball of sand (the hint)
    "A": (185, 150, 95),
    "s": (250, 230, 185),
    "t": (25, 75, 75),     # legs
    "T": (60, 130, 125),
}
# Baby: a domed metallic-green beetle with a gold seam, club antennae and six short legs, a sand ball
# in front of it
SCARAB_BABY = [
    "..........Yy.....yY.......",
    "..........yY.....Yy.......",
    "...........o.....o........",
    "............o.ooyyoo......",
    "............oolhyYbboo....",
    "...........olhhlyYbbbdo...",
    "..oooo....ollhbbyYbbbbdo..",
    ".osaaao...olbbbbyYbbbbdo..",
    "osaaaAAo.olbbbbbyYbbbbddo.",
    "oaaaAaAo.olbbbbbbbbbbbddo.",
    "oaaaaAAooobbbbbbbbbbbbddoo",
    "oaAaAAAo.odbbbbbbbbbbdddo.",
    ".oAAAAo.ooddddddddddddddoo",
    "..oooo....oooooooooooooo..",
    "...........o..o....o..o...",
]
SCARAB_BABY_FACE_TOP, SCARAB_BABY_FACE_SHIFT = face_place(SCARAB_BABY, 9, 12, BABY_W)
SCARAB_BABY_TAGS = body_tags(SCARAB_BABY, 10, 17, flat_rows=3)
# Rollet, the child: a sturdier scarab, its domed wing cases split by the gold seam, a darker head
# plate, club antennae and six legs, the front pair pressing on the bigger sand ball it rolls ahead
ROLLET = [
    "...............Yy........yY.....",
    "...............yY........Yy.....",
    "................o........o......",
    ".................o......o.......",
    ".................o......o.......",
    ".................oooooooo.......",
    "...............oolllyYbbboo.....",
    "..............olllllyYbbbbbo....",
    ".............ollbbbbyYbbbbbdo...",
    "...ooooo....olllbbbbyYbbbbbddo..",
    "..ossaAao..ollllboooooooobbdddo.",
    ".ossaaaaao.obbboobbbbbbbboodddo.",
    "ossaaaaaaAooboobbbbbbbbbbbboodo.",
    "osaaaaAaaaTTobbbbbbbbbbbbbbddooT",
    "oaaAaaaaaAoobbbbbbbbbbbbbbbdddo.",
    "oaaaaaaaAAoobbbbbbbbbbbbbbbdddoT",
    "oaaaaaAAAATobbbbbbbbbbbbbbbdddo.",
    ".oaAaaAAAo.Toddddddddddddddddo.T",
    "..oaaAAAo...oddddddddddddddddo..",
    "...ooooo....oooTooooooooooTooo..",
    "..............T............T....",
    ".............T..............T...",
]
ROLLET_FACE_TOP, ROLLET_FACE_SHIFT = face_place(ROLLET, 11, 13, FACE_W)
ROLLET_TAGS = body_tags(ROLLET, 15, 21, flat_rows=3)

# ---- The paper kite line: a living paper dragon with bows on its tail

KITE_PALETTE = {
    "o": (90, 20, 30),     # outline
    "d": (175, 40, 45),    # shadow
    "b": (215, 62, 55),    # festival red
    "l": (240, 105, 85),   # lit
    "h": (255, 165, 140),  # highlight
    "c": (140, 28, 38),    # a crease
    "P": (250, 232, 200),  # the back of the paper
    "y": (250, 200, 70),   # gold antlers and whiskers
    "Y": (205, 150, 45),
    "u": (90, 170, 235),   # the bows (the hint)
    "U": (50, 110, 190),
}
# Baby: a little paper dragon, its head a folded sheet like an origami mask (a light and a dark half
# meeting in the centre fold, one corner dog-eared to show the back of the paper), gold antlers and
# whiskers; its pleated paper body waves behind it and ends in a blue bow
KITE_BABY = [
    "...y.y......y.y.................",
    "....yY......Yy..................",
    ".....yY....Yy...................",
    ".....ooooooooooooo..............",
    "....ochhhhlllllldo........uu.uu.",
    "...oPcllllbbbbbbdo..ooo...uUyUu.",
    "..occcllllbbbbbbdooohlbooouu.uu.",
    "...ohlllllbbbbbdoobdllddhlo.....",
    "....ohllllbbbbdohlddccddllo.....",
    ".....ohlllbbbdo.lldooooocco.....",
    "..yy..ohllbbdo..cyy.....oo......",
    ".y.....oooooo...oo.y............",
    "Y...................Y...........",
]
KITE_BABY_FACE_TOP, KITE_BABY_FACE_SHIFT = face_place(KITE_BABY, 6, 6, BABY_W)
KITE_BABY_TAGS = body_tags(KITE_BABY, 6, 10, flat_rows=3)
# Kitelet, the child: grown into a long paper snake, its folded head bigger with branching gold
# antlers and whiskers, a pleated body arching behind it on two little folded paper feet, a bow on
# its tail and a bigger one at the tip
KITELET = [
    ".....y...y......y...y...uu...uu.",
    "......y..y......y..y...uuUu.uUuu",
    "......yy.y......y.yy...uuUUyUUuu",
    ".......yyY......Yyy....uuUu.uUuu",
    "........yY......Yy......uuooouu.",
    ".......oooooooooooooo....oUlUdo.",
    "......ochhhhllllllldo....occcdo.",
    ".....oPcllllbbbbbbbdo....olbddo.",
    "....oPPcllllbbbbbbbdo....uucuuo.",
    "...occccllllbbbbbbbdo....uUyUuo.",
    "...ohlllllllbbbbbbbdo....uucuuo.",
    "...ohlllllllbbbbbbbdo....olbddo.",
    "....ohllllllbbbbbbdooooooocccdo.",
    "...yyyhlllllbbbbbdollcbbcllcbbo.",
    "..y...ohllllbbbbdoollcbbcllcbbo.",
    ".y.....ohlllbbbdo.obbcddcbbcddo.",
    "..Y.....oooooooo..odddddddddddo.",
    "...................ooooooooooo..",
    "...................obdo...obdo..",
    "....................odo....odo..",
    "...................oddo...oddo..",
    "...................yoyy...yoyy..",
]
KITELET_FACE_TOP, KITELET_FACE_SHIFT = face_place(KITELET, 9, 5, FACE_W)
KITELET_TAGS = body_tags(KITELET, 11, 12, flat_rows=3)

# Owlbert: the owl has become a book. Its body stands square and upright like a book's spine, gold
# bands across it and a little title plate; its ear tufts are the spine's top corners pulled up into
# feathers, and its wings are the open pages fanned out at its sides, written all over in lines of
# feathers. It raises the left page as if to turn it, and a red bookmark hangs from the other. The
# too-big glasses (tortoiseshell rims) sit on its beak.
OWLBERT_PALETTE = OWL_PALETTE | {
    "o": (55, 32, 22), "d": (110, 55, 35), "b": (150, 80, 45), "l": (185, 110, 65), "h": (215, 150, 95),
    "p": (250, 244, 225), "P": (220, 208, 180), "t": (120, 100, 85),  # the pages, and the lines on them
    "y": (240, 195, 70), "Y": (185, 135, 40),  # gold bands
    "g": (225, 140, 55), "G": (70, 32, 18),  # tortoiseshell rims
    "r": (200, 50, 55), "R": (140, 30, 40),  # the bookmark
}
OWLBERT = [
    "......o.................o......",
    "......oo...............oo......",
    ".o....olo.............obo......",
    "opo...oldooooooooooooodbo......",
    "oto...ohlbbbfffffffbbbddo......",
    "oppo..ohlggggfffffggggddo......",
    "ottto.ohgSfffgfffgSfffgdo......",
    "oppppGogffffffGggffffffGoG.....",
    "optttpogffffffGfgffffffGo......",
    "opppppogffffffGfgffffffGo......",
    "otptttofGffffGfffGfffFGFo......",
    "opppppolfGGGGffaAfGGGGFdo..ooo.",
    "ottpttolfffffffaAffffFFdoootpto",
    "oppppPollbFFFFFFAFFFFbddopppppo",
    "opttptollbbbFFFFFFFbbbddoptttpo",
    "opppPPollbbbbbbbbbbbbbddopppppo",
    ".opttPollbbbbbbbbbbbbbddoppttto",
    "..ooPPollbbbbbbbbbbbbbddopppppo",
    "....otoyyyyyyyyyyyyyyyyyoptptto",
    ".....ooYYYYYYYYYYYYYYYYYoppppPo",
    "......ollbbbooooooobbbddopttpto",
    "......ollbbboyttyYobbbddopppPPo",
    "......ollbbboYYYYYobbbddoppttPo",
    "......ollbbbooooooobbbddoppPPPo",
    "......oyyyyyyyyyyyyyyyyyoptoooo",
    "......oYYYYYYYYYYYYYYYYYooo....",
    "......ollbbbbbbbbbbbbbddo..R...",
    "......ooooooooooooooooooo..r...",
    ".........a.a.a...a.a.a.....R...",
]
OWLBERT_FACE_TOP, OWLBERT_FACE_SHIFT = face_place(OWLBERT, 7, 8, 15)
OWLBERT_TAGS = species_tags([OWLBERT, drop_rows(OWLBERT, 16)], 16, 15)


def owl_face(gap):
    """The owls' faces: eyes behind the big glasses, no mouth (the beak is part of the body) and no cheeks
    (the rims are there)."""
    face = kit_face(gap, mouth_row=0)

    def grid(eyes, mouth, blush):
        return face(eyes, mouth, False)
    grid.width = face.width
    return grid


owlbert_face_grid = owl_face(9)
OWLBERT_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (220, 200, 165)}

# Stargazer: the owl has become a telescope. It sits ducked low, wings folded flat, and its neck pulls
# out in brass tubes, each thinner than the last, up and to the side; the head at the top looks up
# into the sky, and the too-big glasses are the telescope's lenses, brass-rimmed. A star sparkles
# where it is looking.
STARGAZER_PALETTE = OWL_PALETTE | {
    "o": (25, 25, 55), "d": (45, 52, 105), "b": (65, 75, 140), "l": (95, 110, 180), "h": (140, 155, 215),
    "f": (230, 225, 245), "F": (190, 190, 220),  # its face disc
    "g": (255, 215, 110), "G": (175, 125, 40),  # brass rims
    "x": (95, 60, 25), "j": (255, 235, 150), "k": (220, 170, 65), "K": (160, 110, 35),  # the brass tubes
    "s": (255, 245, 190),  # the star
}
STARGAZER = [
    "...........o............o..s..",
    "...........oo.oooooooo.oo.sjs.",
    "...........olohlllllbbobosjjjs",
    "..........olgggggffgggggbosjs.",
    "..........ogfffffGgfffffGo.s..",
    "..........ogfffffGgfffffGo....",
    "..........ogfffffGgfffffGo....",
    "..........ogfffffGgffFFFGo...j",
    "..........ofGGGGGaAGGGGGFo....",
    "...........offfffaAFFFFFo..s..",
    "............ooffffAFFFoo......",
    "..............oooooooo........",
    "...............xjkkKx.........",
    "...............xjkkKx.........",
    "...............xjkkKx.........",
    ".............xxxxxxxx.........",
    ".............xjkkkkKx.........",
    ".............xjkkkkKx.........",
    ".............xjkkkkKx.........",
    "...........xxxxxxxxxx.........",
    "o.........oxjkkkkkkKx.........",
    ".....ooooooxjkkkkkkKxooo......",
    "o..oohlllllllbbbbbbbbbbddo....",
    "oo.olooooooooobbbbbbbbbbbdo...",
    ".oolodddddddddobbbbbbbbbbddo..",
    "..olodddddddddobbbbbbbbbbbdo..",
    "...obododododobbbbbbbbbbbdo...",
    "....oobbbbbbbbbdddddddddoo....",
    "......oooooooooooooooooo......",
    ".......a.a.a.....a.a.a........",
]
STARGAZER_FACE_TOP, STARGAZER_FACE_SHIFT = face_place(STARGAZER, 4, 12, 13)
STARGAZER_TAGS = species_tags([STARGAZER, drop_rows(STARGAZER, 25)], 25, 12)
stargazer_face_grid = owl_face(7)
STARGAZER_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (190, 190, 220)}

# Ninjowl (secret): the owl of shadow, a ninja. Its wings spread into a wide fan of feathers behind it,
# each ending in a steel blade tip; its slim body is wound in a red sash, a red band is knotted round
# its brow with the ends flying out, and its glasses have gone soot-black round its narrowed eyes.
# It stands on one foot, the other drawn up, perfectly still. Its blades glint at night.
NINJOWL_PALETTE = OWL_PALETTE | {
    "o": (25, 18, 42), "d": (55, 45, 90), "b": (80, 68, 125), "l": (110, 98, 160), "h": (145, 132, 195),
    "m": (35, 26, 55),  # the dark mask round its eyes
    "k": (215, 225, 240), "K": (140, 150, 175),  # steel
    "G": (12, 10, 20),  # soot-black rims
    "r": (215, 50, 60), "R": (150, 30, 45),  # its headband and sash
}
NINJOWL = [
    "........o..............o........",
    "........oo............oo........",
    ".....o..olo..........obo..o.....",
    ".....oo.ohlo........oblo.oo.....",
    ".....okoohllo......obblooko.....",
    ".....olboolbbooooooddboollo.....",
    ".ooooldbboorrrrrrrrrrRrrlbdoooo.",
    "..okKlbdbboRRRRRRRRRRRRrRdbKko..",
    "...olbbbdbohhhhllllllolrRbbbo...",
    "...olbbbdboGGGGmmGGGGolldbbbo...",
    "....obbbbdGmmmmGGmmmmGldbbbo....",
    "..ooKdbbbbGmmmmGGmmmmGdbbbbKKo..",
    ".okkkbdddbGommmGGmmmoGdbdddkkko.",
    "..ookbbbbddGGGGaaGGGGdddbbbkoo..",
    "....obbbbddddoooooooddbbbbbo....",
    ".....obdddddrRhhhlo.odddddo.....",
    "....okdbddddorRhllloodbbbbkK....",
    "...okkbbdddohhrRllllobdbbbkko...",
    ".ooooooodddohhrRllllobbdoooooo..",
    "........oddohhlrRlllobbk........",
    ".......okkoohhllrRlbookkk.......",
    ".......ooo.ohllllrRbo.ooo.......",
    "......o....ollllllrRo....o......",
    "...........olllllbrRo...........",
    "...........orrrrrrrrro..........",
    "...........oRRRRRRRRRo..........",
    "............olbbbbdo............",
    ".............ooooooo.K.K........",
    "..............o...oo............",
    "..............o.................",
    "............K.K.K...............",
]
NINJOWL_FACE_TOP, NINJOWL_FACE_SHIFT = face_place(NINJOWL, 10, 10, 12)
NINJOWL_TAGS = species_tags([NINJOWL, drop_rows(NINJOWL, 18)], 18, 16)
ninjowl_face_grid = owl_face(6)
NINJOWL_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (30, 22, 48)}

# Palettino: the chameleon has become a painter's palette. Its body is flat and round like a palette,
# with the thumb hole near its back and a bay cut into its belly; blobs of paint sit on its back. Its
# curled tail is striped in paint colors and ends in a brush, which it holds over its back to dab the
# paint. One turret eye watches the brush.
PALETTINO_PALETTE = CHAMELEON_PALETTE | {
    "r": (230, 70, 70), "R": (170, 40, 50), "u": (70, 130, 230), "U": (40, 80, 170),
    "y": (250, 210, 60), "Y": (200, 150, 30), "p": (190, 90, 210), "P": (130, 55, 150),  # paint
    "s": (225, 230, 240), "S": (160, 165, 180),  # white paint, and the brush's ferrule
    "v": (235, 200, 145), "W": (160, 115, 70),  # its bristles
}
PALETTINO = [
    ".....................ooooooo....",
    "....................oYYYYYUUo...",
    "...................oYYyyyyuUUo..",
    ".....o............oPPyyyyyuuUUo.",
    "....olo...........oPppooooouuUo.",
    "....olo..........oPPpo.....ouUUo",
    "...ollbo.........oPPpo.....ouUUo",
    "...ollbo.........oPPpo.....orRRo",
    "...ollbdo.........osSo.....orRRo",
    "..olllbdoo........osSo....orrRo.",
    ".ohlllbdllo.......ovWo...orrRRo.",
    ".ollllllllooooooooovWooooooRRo..",
    "ollllllllllllluubbbbbbbbbbrRo...",
    "ollllllllbrrbbUUbbbbbbbbbdRo....",
    "olllbbbbbbRRbbbbbyybbbdrrdo.....",
    ".obbbbbbbbbbbbbbbYYddooRRddo....",
    "..obbbbbbbbbppddddddo..odddo....",
    "..obbbbdddddPPddssdddooddddo....",
    "...oddddddoooooodSSdddddoo......",
    "....oddddo......oddddddoo.......",
    "....odo.odo.....odo..odo........",
    "....ooo.ooo.....ooo..ooo........",
]
PALETTINO_FACE_TOP, PALETTINO_FACE_SHIFT = face_place(PALETTINO, 11, 2, 6)
PALETTINO_TAGS = species_tags([PALETTINO, drop_rows(PALETTINO, 14)], 14, 17)
palettino_face_grid = kit_face(0, mouth_row=4, single=True)
PALETTINO_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (60, 130, 55)}

# Hidewell: the chameleon has hidden so well that it has become a twig. Its body is a stick of bark on
# legs like twigs, ivy has grown all over its back and a sprout on its head, and it grips a branch with
# its feet and winds its tail once round it. Only its big turret eye gives it away.
HIDEWELL_PALETTE = CHAMELEON_PALETTE | {
    "o": (40, 28, 18), "d": (95, 65, 40), "b": (130, 92, 55), "l": (165, 125, 80), "h": (200, 165, 115),
    "g": (110, 175, 60), "G": (55, 115, 40), "e": (175, 220, 95),  # leaves
    "w": (150, 120, 85), "n": (105, 80, 55), "N": (75, 55, 38),    # the branch
}
HIDEWELL = [
    "....oego........................",
    "...oeGGo........................",
    "...olGlo....o..o..o..o..o..o....",
    "...olllloooogoogoogoogoogoogo...",
    "..olllllllleooeooeooeooeooeo....",
    ".ohhhhllllleeegggeeegggeeeoo....",
    ".ohhlllllgggGgggggGgggggGgggo...",
    "ohhlllllbbGGGGGGGGGGGGGGGGGo....",
    "ohlllllbbbbbdbbbbbbbbbbbbbbo....",
    ".olllbbbbbbdbbbbbbbbbbbbbdbdo...",
    ".ollbbbbbdddbdddddddddddddobdo..",
    "..obbbbbdddoodddddddddooddoobdo.",
    "...ooobddoooddoooooooddooddoobdo",
    "......odo.oddo......odo.odo.obdo",
    ".oooooddooddooooooooddooddooobdo",
    "owwwwwwwwwwwwwwwwwwwwwwwwwwwwbdo",
    "onnNNnnnnNNnnnnnNNnnnnNNnbnnbddo",
    "oNNNNNNNNNNNNwNNNNNNNNNNNbddddNo",
    ".ooooooooooooooooooooooooobddoo.",
    "..........................ooo...",
]
HIDEWELL_FACE_TOP, HIDEWELL_FACE_SHIFT = face_place(HIDEWELL, 6, 2, 6)
HIDEWELL_TAGS = species_tags([HIDEWELL, drop_rows(HIDEWELL, 9)], 9, 16)
hidewell_face_grid = kit_face(0, mouth_row=4, single=True)
HIDEWELL_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (95, 65, 40)}

# Mirrorleon (secret): the legendary chameleon, reared up tall. Its skin is all mirror facets, a tall
# prism casque on its lizard head splits the light into a rainbow, one front foot is raised, and its
# tail rolls into one huge round spiral beside it.
MIRRORLEON_PALETTE = CHAMELEON_PALETTE | {
    "o": (35, 40, 62), "d": (120, 130, 165), "b": (165, 175, 205), "l": (205, 212, 236), "h": (248, 250, 255),
    "c": (200, 240, 250), "C": (140, 205, 230),  # the prism
    "k": (255, 160, 205),                        # a pink glint
    "R": (245, 110, 110), "Y": (250, 220, 90), "E": (120, 225, 130), "U": (110, 160, 245), "V": (180, 120, 235),
}
MIRRORLEON = [
    "..............oCo......oooRRRRoo",
    "..............oCo..ooooRRRooYYYY",
    ".............ocCCooRRYYYYYYYoooo",
    ".............ocCCVVVUEEEEEEEEEEE",
    "............occCCloVVVVUUUUUoooo",
    "..........oocccCCllooooVVVooUUUU",
    ".........ollcccCCllo...oooVVVVoo",
    "........olllbbddbbddo.....oooVVV",
    ".......olllbddbbdddddo.......ooo",
    "....ooobddbbddbbdddddo..........",
    "..oobbddbdddbbdddddddo..........",
    ".oddbhddddddbbdddddddo..........",
    ".oboooooddbbddddddddo..o........",
    "..o....ooooddddddddoooobooo.....",
    "........oollldddboobbbbbbbbo....",
    ".......ollllbbddbbdbbbbbbbbbo...",
    ".......olllbddbbdddbboooobbbdo..",
    "......oldlhbddbbddddo.oo.ohdddo.",
    "......odbbddbbddddddoobbo.ooddo.",
    ".....oldbbddbbkddddddbbbo..oddo.",
    ".....obbdddbdddddddddboo...oddo.",
    ".....obbddbbdddddddddbo....oddo.",
    ".....oddddddddddhddddbo...odddo.",
    "......oddkddddddddddbddooodddo..",
    "......obddddddddddddoddddddkdo..",
    ".......oddddhddddddo.odddddoo...",
    ".......odddddddddddo..ooooo.....",
    ".......obbdddddddbdo............",
    "......obddbbdddbddbbo...........",
    "......obddbboobbddbdo...........",
    ".......obbdo..odbbdo............",
    "........ooo....oooo.............",
]
MIRRORLEON_FACE_TOP, MIRRORLEON_FACE_SHIFT = face_place(MIRRORLEON, 8, 9, 11)
MIRRORLEON_TAGS = species_tags([MIRRORLEON, drop_rows(MIRRORLEON, 20)], 20, 14)
mirrorleon_face_grid = kit_face(5, mouth_row=0)
MIRRORLEON_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (120, 130, 165)}

# Solroll: the scarab works like a real dung beetle. Head down on the ground, its rear raised high, it
# braces its front legs and pushes the ball along with its hind legs; its shell has turned gold with a
# pattern of sun rays, and the ball it pushes is a small warm sun.
SOLROLL_PALETTE = SCARAB_PALETTE | {
    "g": (255, 225, 120), "y": (240, 185, 60), "G": (200, 130, 40), "n": (130, 75, 25),  # the gold shell
    "S": (255, 248, 210), "s": (255, 215, 90), "r": (245, 140, 45), "R": (205, 80, 35),  # its sun
}
SOLROLL = [
    "...............oooooo...........",
    ".............ooggggggo..........",
    "...........ooggggyynnyo.........",
    "..........oggyyyyynnyyyo........",
    ".........oynyyyynnyyyyyo........",
    "..o.....oynnyyynnyyyyyo.........",
    ".oyo...oyynyynnyyGGGGGto...s....",
    ".oto..oynnntnnGGGGGGGoto.......s",
    ".otto.oynnGtGGGGGnnGooto.ooo....",
    "..ottolbbntGGnnnnnGo.otoosssoo..",
    "..oltbbbbbtdnnGGGGto..osSSsssro.",
    ".olbbbbbbddddGGGooto..oSSSSsrrro",
    ".obbbbbbddddddoo.oto.osSSSSrrrro",
    "obbbbbddddddddo..oto.ossSSrrrrro",
    "obbbddddddddddo..oto.osssrrrrrRo",
    ".oddddddddddddo..oto.ossrrrrrRRo",
    ".odddddddddddo...oto..orrrrrRRRo",
    "..odddddddddto...oto..orrrrRRRo.",
    ".otooodddoooto...oto...oorRRoo..",
    ".oto..ooo..oto...oto.....ooo....",
]
SOLROLL_FACE_TOP, SOLROLL_FACE_SHIFT = face_place(SOLROLL, 12, 2, 11)
SOLROLL_TAGS = species_tags([SOLROLL, drop_rows(SOLROLL, 12)], 12, 9)
solroll_face_grid = kit_face(5)
SOLROLL_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (30, 110, 105)}

# Clockbeetle: the scarab has become a pocket watch. It stands upright, its body flat and round as a
# dial in a gold case; its two wing cases have grown into one lid, swung open on a hinge at the side;
# its two horns are the clock's hands, a long and a short one; the ball is now a brass cog it keeps
# beside it. It ticks.
CLOCKBEETLE_PALETTE = SCARAB_PALETTE | {
    "y": (245, 200, 80), "Y": (190, 135, 45),   # the gold case and the cog
    "c": (250, 242, 220), "C": (220, 205, 175), # the dial
    "n": (40, 35, 45), "r": (220, 70, 60),      # its marks and hands
}
CLOCKBEETLE = [
    ".........o........onno..........",
    "........ono......onno...........",
    ".........onoooooonno............",
    "..........onhlllnno.............",
    ".........ohlllllbbo.............",
    "........olllllbbbbbo............",
    ".......ollllbbbbbbddo...........",
    ".......ollbbbbbbddddo...........",
    "........obbbbbdddddo............",
    ".........obbddddddo.............",
    "..........ooddddoo.......ooo....",
    ".........oyyyyyyyyo.....olllo...",
    "........oyyccrcccyyo...ollYllo..",
    ".......oyycnccccncYYo..olyyylo..",
    "......oyyccccccccccYYoolyyyyylo.",
    "......oycnccccccccnCYoolYYYYYlo.",
    "......oyccccccccccCCYyyyyyyyybo.",
    ".....oyycccccccccCCCYyyyyyyyybo.",
    ".....oyyrcccccccCCCrYYYYYYYYYbo.",
    "......oycccccccCCCCCYyyyyyyyybo.",
    "......oycnccccCCCCnCYoobyyyyybo.",
    "...ooooyyccccCCCCCCYYoodYYYYYdo.",
    "..oyyyooyYcnCCCCnCYYo..odyyydo..",
    "..oyyyo.oYYCCCrCCYYo...oddyddo..",
    ".oyyyyYootYYYYYYYYo.....odddo...",
    "oyyyyYYYotoooYYoto.......ooo....",
    "oyyyYYYYtto..oootto.............",
    ".oyYYYYoto......oto.............",
    "..oYYYooto......otto............",
    "..oYYYo.o........oo.............",
    "...ooo..........................",
]
CLOCKBEETLE_FACE_TOP, CLOCKBEETLE_FACE_SHIFT = face_place(CLOCKBEETLE, 5, 9, 10)
CLOCKBEETLE_TAGS = species_tags([CLOCKBEETLE, drop_rows(CLOCKBEETLE, 18)], 18, 14)
clockbeetle_face_grid = kit_face(4, mouth_row=0)
CLOCKBEETLE_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (30, 110, 105)}

# Pharabug (secret): the legendary scarab, as on an old wall painting. Its wings spread wide to both
# sides in rows of feathers; its wing cases are gold with turquoise stripes and frame its head like a
# pharaoh's headdress; above its head it holds up a big glowing sun with its front legs, and sand
# trickles down from it.
PHARABUG_PALETTE = SCARAB_PALETTE | {
    "U": (50, 80, 190), "c": (70, 205, 195), "C": (35, 140, 140),       # lapis and turquoise
    "g": (250, 210, 90), "y": (235, 180, 60), "G": (200, 140, 45), "n": (110, 65, 25),  # gold
    "S": (255, 250, 220), "s": (255, 220, 100), "r": (250, 150, 50), "R": (215, 85, 35),  # the sun
}
PHARABUG = [
    ".............osssso.............",
    "............osssssso............",
    ".........s.osSSSSssso..s........",
    "..........ossSSSSssrro..........",
    "..........ossSSSSsrrro..........",
    "..........osssSSsrrrRo..........",
    "........s..ossssrrrRo...s.......",
    "...........osssrrrRRo...........",
    ".o........otosrrrRRoto........o.",
    "oUooo.....otooooooooto.....oooUo",
    "oUUUUooo..ottoolbootto..oooUUUUo",
    "occcUUUUoocclllbbbbbccooUUUUccco",
    "oCCccccUUUglllbbbbdddgUUUccccCCo",
    "oggCCCccccclbbbbbddddcccccCCCggo",
    "ogngggCCCcgbbbbbdddddgcCCCggggno",
    "oGngnggggCccbbddddddccCgggngnGno",
    "oGnGnGngngggggddddggggggngnGnGno",
    "oGnGnGnGngccccccccccccnGnGnGnGno",
    "oGoGnGnGnGggggggggggggnGnGnGnGo.",
    ".ooGoGoGnGnggggynyGGGGnGnGoGoGo.",
    "...o.ooGoooggggynyGGGooGoGoo.o..",
    ".......o..occcccnCCCCo.o.o......",
    "..........oggggynyGGGo..........",
    "...........ogggynyGGo...........",
    "...........occccnCCCo...........",
    "............oggynyGo............",
    "...........ottoonotto...........",
    "...........oto..o.oto...........",
    "...........oto....oto...........",
    "............o...a..o............",
    "...........a.......a............",
    ".............a.......a..........",
]
PHARABUG_FACE_TOP, PHARABUG_FACE_SHIFT = face_place(PHARABUG, 11, 11, 10)
PHARABUG_TAGS = species_tags([PHARABUG, drop_rows(PHARABUG, 20)], 20, 16)
pharabug_face_grid = kit_face(4, mouth_row=0)
PHARABUG_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (30, 110, 105)}

# Origrane: the paper dragon folded sharp like an origami crane. It sits as a triangle on its folded
# base, its two wings are pointed folded faces standing straight up behind it (the far one darker),
# its head is the folded mask with little gold antlers, and its bow tail is a strip folded into a
# zigzag, crane-white bows on it.
ORIGRANE_PALETTE = KITE_PALETTE | {"w": (250, 250, 245), "P": (235, 230, 220)}
ORIGRANE = [
    ".......................o........",
    "......................olo.......",
    "...............o.....oblo.......",
    ".o.........o..odo....oblo.......",
    "oyoo......oyo.odo....oblo.......",
    "oyyyo....oyyo.odo....oblo.......",
    ".oyo.....oyo..odo...obllo.......",
    ".oyoooooooyo..odo...obllo.......",
    "oPPlllcbbbbboocddo.olbllo.......",
    "oPllllcbbbbboocddo.obbllo.......",
    "olllllcbbbbboocddoolblllo...o.o.",
    "olllllcbbbbboocddoolblllo..oPoPo",
    "olllllcbbbbbocclcdhbblllo..oPwPo",
    "olllllcbbbbbocllcdhbllllo..oPoPo",
    "olllllcbbbbbocllcdhbllllo.obdoo.",
    "olllllcbbbbbolllcddbllllPoPdo...",
    "olllllcbboooclllcdddllllPwPo....",
    ".oooooooo..ollllcdddllllPoPo....",
    "..........olllllcddddllloobdo...",
    "..........olllllcdddddoo..obdoo.",
    ".........ollllllcddddddo..oPoPdo",
    "........olllllllcddddddo..oPwPo.",
    "........olllllllcdddddddo.oPoPo.",
    ".......ollllllllcddddddddobdoo..",
    ".......ollllllllcddddddddbdo....",
    "......olllllllllcdddddddddo.....",
    ".....ollllllllllcddddddddddo....",
    "......ooooooooooooooooooooo.....",
]
ORIGRANE_FACE_TOP, ORIGRANE_FACE_SHIFT = face_place(ORIGRANE, 11, 2, 10)
ORIGRANE_TAGS = species_tags([ORIGRANE, drop_rows(ORIGRANE, 20)], 20, 16)
origrane_face_grid = kit_face(4)
ORIGRANE_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (170, 40, 45)}

# Lionkite: the paper dragon has become a festival lion dance. Its body is a long band of paper and
# cloth flowing in waves, red paper and gold cloth by turns, on little feet; in front a big lion head
# with a fringe of mane, pompoms on its brow and cheeks, big eyes and a wide grin full of teeth; behind,
# the tail with its bow.
LIONKITE_PALETTE = KITE_PALETTE | {
    "k": (255, 130, 170), "K": (210, 80, 120), "g": (90, 200, 120),  # pompoms and a jewel
    "w": (255, 250, 235), "m": (70, 15, 25),                          # its teeth and mouth
}
LIONKITE = [
    ".....oo..oo..oo.................",
    "....okkooggookko..........oo.oo.",
    "....okKyYyYyokKo.........oyyoyyo",
    "...ooYyYyYyYyYoo.........oyYcYyo",
    "..oyYylllllbbyYyo........oyyoyyo",
    "..oYyllllbbbbbyYo.........ooooo.",
    ".oYyllllbbbbbbdyYo......ooobdo..",
    ".oylllbbbbbbddddyo....oollobdo..",
    "oyYllbbbbbbdddddYyo.ooyllllbdo..",
    "okkbbbbbbdddddddykkolyylbblbdo..",
    "okKbbbbbddddddddYkKllyybbbbbdo..",
    ".oybcccccccccccdylllbYYbddbYYo..",
    ".oYywwwwwwwwwwwyYlbbbYYddddYYo..",
    "..oYmmmmmmmmmmmYYbbbdYooooooYo..",
    "..oyYydddmdddyYyYbddoo......o...",
    "...ooYyYyYyYyYdYYdoo..oo..oo....",
    ".....ooyYyYyooooooddooddooddo...",
    ".......ooooo.....oddooddooddo...",
    ".................oyyooyyooyyo...",
    "..................oo..oo..oo....",
]
LIONKITE_FACE_TOP, LIONKITE_FACE_SHIFT = face_place(LIONKITE, 6, 4, 11)
LIONKITE_TAGS = species_tags([LIONKITE, drop_rows(LIONKITE, 12)], 12, 22)
lionkite_face_grid = kit_face(5, mouth_row=0)
LIONKITE_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (170, 40, 45)}

# Stormkite (secret): the legendary kite, stretched like a big diamond stunt kite of dark thunderstorm
# paper, its spars crossing behind it, lightning-yellow horns and whiskers; its long tail zigzags down
# and its bows twitch as bolts of lightning, and sparks crackle round it.
STORMKITE_PALETTE = KITE_PALETTE | {
    "o": (15, 18, 35), "l": (100, 115, 165), "b": (68, 80, 128), "d": (42, 50, 88),  # storm paper
    "S": (190, 200, 225),                                                          # its spars
    "y": (255, 225, 60), "Y": (255, 245, 150),                                     # lightning
}
STORMKITE = [
    ".........oyo.......oyo..........",
    "........oyyo..oo...oyyo.........",
    ".........ooyoolSo.oyoo..........",
    "..........oyollSbooyo...........",
    "..Y........oyllSbbyo............",
    "..........olyllSbbyo........Y...",
    "........oolllllSbbbboo..........",
    ".......olllllllSbbbbbbo.........",
    "......ollllllllSbbbbbbbo........",
    ".....olllllllllSbbbbbbbbo.......",
    "....ollllllllllSbbbbbbbbbo......",
    "...olllllllllllSbbbbbbbbbbo.....",
    "..ollllllllllllSbbbbbbbbbbbo....",
    "..obbbbbbbbbbbbSdddddddddddo....",
    "...oyybbbbbbbbbSddddddddyyo.....",
    "..oyySSSSSSSSSSSSSSSSSSSSyyo....",
    ".oyyoobbbbbbbbbSddddddddooyyo...",
    "oyyo..obbbbbbbbSdddddddo..oyyo..",
    ".oo....obbbbbbbSddddddo....oo...",
    "........oobbbbbSddddoo..........",
    "..........obbbbSdddo............",
    "...........obbbSddo.............",
    "............obbSdo...........Y..",
    ".............obdo...............",
    ".Y...........oSSSoo.............",
    "..............ooSSyo............",
    "................oSyyo...........",
    "...............oSooyoo..........",
    ".......Y.......oSSSSSyo.........",
    "................ooooSyyo.o......",
    ".................oSSooyooyo.....",
    "..................oSSSSSSyyo....",
]
STORMKITE_FACE_TOP, STORMKITE_FACE_SHIFT = face_place(STORMKITE, 10, 9, 12)
STORMKITE_TAGS = species_tags([STORMKITE, drop_rows(STORMKITE, 18)], 18, 15)
stormkite_face_grid = kit_face(6)
STORMKITE_FACE_PALETTE = GARDEN_FACE_PALETTE | {"d": (42, 50, 88)}

OWL_FACE_PALETTE = FACE_PALETTE | {"d": (190, 115, 30), "m": (240, 160, 50), "k": (255, 150, 170)}
CHAMELEON_FACE_PALETTE = FACE_PALETTE | {"d": (60, 130, 55), "m": (30, 70, 35), "k": (255, 150, 170)}
SCARAB_FACE_PALETTE = FACE_PALETTE | {"d": (30, 110, 105), "m": (15, 45, 50), "k": (255, 150, 170)}
KITE_FACE_PALETTE = FACE_PALETTE | {"d": (170, 40, 45), "m": (100, 20, 30), "k": (255, 150, 170)}

FESTIVAL_LINES = (("owl", "hootlet", baby_face_grid, face_grid), ("chameleon", "colorlet", baby_face_grid, face_grid),
                  ("scarab", "rollet", baby_face_grid, face_grid), ("kite", "kitelet", baby_face_grid, face_grid))
FESTIVAL_FORMS = (("owlbert", FACES), ("stargazer", FACES),
                  ("ninjowl", kit_faces(normal=("half", "small", False))),  # always on the lookout
                  ("palettino", FACES), ("hidewell", FACES), ("mirrorleon", FACES),
                  ("solroll", FACES), ("clockbeetle", FACES), ("pharabug", FACES),
                  ("origrane", FACES), ("lionkite", FACES), ("stormkite", FACES))



# ---------------------------------------------------------------- The coast and ruins lines

# Two lines, each with its egg, baby, child, a basic adult, a second one and a secret one: the
# octopus from the coast and the gargoyle from the ruins. What every form of a line keeps: the ink
# (the octopus) and the small stone wings (the gargoyle). The child carries the colors the code may
# recolor as a hint at its adult form: the ink blot and the drop on its raised arm, and the edges
# of the wings.

# The eggs: a pale coral egg held by a curve of cream suckers like an arm round it, an indigo ink
# splash on its top that drips down, lying in the sand by a strand of seaweed; an egg of old
# weathered stone, a crack zig-zagging down from its top, moss on its crown and ivy climbing up one
# side, on a broken flagstone.
OCTOPUS_EGG = [
    "....oiio....",
    "...oiIiio...",
    "..ohiieieo..",
    "..oheeeeio..",
    ".oheeeeeeeo.",
    ".oheeeeeeEo.",
    ".oeeeeeeeEo.",
    ".orrrreeeEo.",
    ".osRsRrrreo.",
    "g.oeeesRsRr.",
    "Gg.oEEEEoRr.",
    ".GgaoooooAa.",
    "aaGgaAaaaaAa",
    "AAAAAAAAAAAA",
]
GARGOYLE_EGG = [
    "....oMmo....",
    "...omMmMo...",
    "..ohmMeEeo..",
    "..oheceeeo..",
    ".oheeeceeeo.",
    ".oeeeceeeEo.",
    ".oeeeecEeEo.",
    ".oheeeceeEv.",
    ".oeeeceeEvV.",
    ".oeeeeceeVo.",
    "..oeeecevV..",
    "..oEeeeVvo..",
    "pPpoEEEEoPpp",
    "PPPPP.PPPPPP",
]
EGG_GRIDS |= {"octopus": OCTOPUS_EGG, "gargoyle": GARGOYLE_EGG}
RARE_EGG_PALETTES |= {
    "octopus": {"o": (110, 45, 55), "e": (245, 175, 155), "E": (205, 125, 115), "h": (255, 220, 205),
                "s": (255, 240, 215), "r": (225, 110, 100), "R": (175, 70, 80), "i": (60, 55, 130),
                "I": (110, 105, 200), "a": (235, 205, 150), "A": (195, 160, 105), "g": (90, 175, 95),
                "G": (45, 120, 70), "x": (90, 30, 45)},
    "gargoyle": {"o": (60, 58, 70), "e": (185, 182, 175), "E": (140, 138, 140), "h": (220, 218, 208),
                 "c": (75, 72, 85), "m": (120, 175, 70), "M": (70, 125, 55), "v": (95, 160, 75),
                 "V": (55, 110, 60), "p": (150, 145, 150), "P": (105, 100, 110), "x": (50, 48, 60)},
}

# ---- The octopus line: a little octopus that paints with its own ink

OCTOPUS_PALETTE = {
    "o": (110, 40, 60),    # outline
    "d": (205, 100, 100),  # shadow
    "b": (240, 140, 125),  # coral
    "l": (250, 180, 160),  # lit
    "h": (255, 215, 200),  # highlight
    "c": (255, 235, 205),  # suckers
    "i": (60, 55, 130),    # ink-dark arm tips
    "I": (115, 110, 205),
    "n": (62, 58, 138),    # the ink blot and the drop on its raised arm (the hint)
    "N": (130, 125, 225),
    "e": (55, 50, 95),     # the beret
    "E": (75, 70, 125),
}
# Baby: a round coral octopus, a tall soft mantle with an ink spot on it, four little arms that
# curl at their tips (cream suckers, ink-dark tips), and one arm raised at its side, waving, ink on
# its tip
OCTOPUS_BABY = [
    "......ooooo.........",
    "....oohhlbbo....oo..",
    "...ohhllbbiio..oiIo.",
    "..ohllbbiIiido.oiio.",
    ".ohlbbbbbbiiddoobdo.",
    "ohllbbbbbbbbbddobdo.",
    "olbbbbbbbbbbbddobdo.",
    "obbbbbbbbbbbbddbdo..",
    "odbbbbbbbbbbbbbdo...",
    ".odbbbbbbbbbbbdo....",
    ".obbdbbbbbbdbbbo....",
    ".obcobcoocbocbo.....",
    ".ocbocboobcobco.....",
    "obcoobcoocboocbo....",
    "oiiooiiooiiooiio....",
    ".oo..oo..oo..oo.....",
]
OCTOPUS_BABY_FACE_TOP, OCTOPUS_BABY_FACE_SHIFT = face_place(OCTOPUS_BABY, 5, 3, BABY_W)
OCTOPUS_BABY_TAGS = body_tags(OCTOPUS_BABY, 7, 7, flat_rows=3)
# Inklet, the child: the baby grown taller, a painter's beret cocked on its mantle, a big ink blot
# splashed on it with a drip running down, four arms that curl at their tips, and a fifth arm raised
# high like a brush, a drop of ink hanging from its tip
INKLET = [
    ".....oooeoo................o...",
    "...ooeEEEeeoooooooo.......oioo.",
    "..oeEEEEEeeeeeooddno.....oiinNo",
    ".oeEEeeeeeeeeeeebNnno....obdnno",
    ".eeeeeeeeeeeeeeoNnnnno...olcono",
    ".eeeeeooooooooobnnnnddo..obdoo.",
    "...ohlbbbbbbbbbbbnbnddo..olco..",
    "...ohlbbbbbbbbbbbbbnbddo.obdo..",
    "...ollbbbbbbbbbbbbbnbddo.olco..",
    "...ollbbbbbbbbbbbbbnbddoobdo...",
    "...ollbbbbbbbbbbbbbbbddoolco...",
    "...obbbbbbbbbbbbbbbbbddobdo....",
    "...obbbbbbbbbbbbbbbbbddlco.....",
    "...obbbbbbbbbbbbbbbbbddoo......",
    "....obbbbbbbbbbbbbbbddo........",
    ".....obbbbbbbbbbbbbbddo........",
    "....obbdbbbbdbbbbdbbbddo.......",
    "...olbdoolbdoolbdoolbdo........",
    "..olbco.olbcoocbdo.ocbdo.......",
    ".olbdo..olbdooolbdo.olbdo......",
    ".olbcio..olbcicbdo.oicbdo......",
    "..oiiio...oiiiiio..oiiio.......",
    "...ooo.....ooooo....ooo........",
]
INKLET_FACE_TOP, INKLET_FACE_SHIFT = face_place(INKLET, 8, 5, FACE_W)
INKLET_TAGS = body_tags(INKLET, 12, 13, flat_rows=3)

# ---- The gargoyle line: a puppy of stone with little stone wings

GARGOYLE_PALETTE = {
    "o": (60, 58, 72),     # outline
    "d": (130, 126, 132),  # shadow
    "b": (170, 166, 162),  # stone
    "l": (200, 196, 188),  # lit
    "h": (228, 224, 214),  # highlight
    "c": (105, 100, 110),  # its floppy ears, chips and cracks
    "C": (130, 124, 134),
    "u": (222, 216, 200),  # muzzle and paws
    "U": (195, 188, 172),
    "n": (45, 42, 55),     # nose
    "w": (125, 135, 165),  # slate wings
    "W": (90, 98, 130),
    "x": (160, 170, 200),
    "q": (175, 190, 225),  # the edges of the wings (the hint)
    "Q": (125, 140, 185),
    "m": (125, 185, 75),   # a tuft of moss
    "M": (75, 135, 55),
}
# Baby: a stone puppy, sturdy like a carved block: a broad pale muzzle with a dark nose, heavy
# floppy stone ears, two horn nubs and a tuft of moss between them, stubby slate wings on its back
# (one raised, one lowered), chips in the stone and an arrow-tipped tail wagging behind it
GARGOYLE_BABY = [
    "o........o..oo..o.......",
    "xoo.....oxoommooxo......",
    "xwxoo.oohlbbmMmbbbooo...",
    "xwwWxoCchlbbbbbbbbbcCo..",
    "owwWWoCchbbbbbbbbbbcCo..",
    ".oWWoCcclbbbbbbbbbbccCo.",
    "..oooCcclbbbbbbbbbbccCo.",
    "....occcluuunnuuubbcccoo",
    ".....occouuuuuuuubdccoox",
    "......oobuuuuuuuubdowxxx",
    ".....olbbbuuuuuubbbdwWxo",
    ".....olbbcbbbbbbbbbdWWo.",
    ".....odbbbbbbbbbcbbdoxo.",
    ".....oddllddddddllddoo..",
    "......olloooooollooo....",
]
GARGOYLE_BABY_FACE_TOP, GARGOYLE_BABY_FACE_SHIFT = face_place(GARGOYLE_BABY, 5, 7, BABY_W)
GARGOYLE_BABY_TAGS = body_tags(GARGOYLE_BABY, 11, 13, flat_rows=3)
# Gargit, the child: a sturdy young gargoyle dog on four stumpy legs: a big square head with a broad
# pale muzzle, heavy floppy ears, horn nubs and the moss tuft, a block of a body with a crack, two
# little slate wings it holds up proudly, and an arrow-tipped tail
GARGIT = [
    "..............................oqq.",
    ".....o..omoo..o..............owqQ.",
    "....oxoomMmmooxo............owWWQ.",
    ".oCCCxooomMoooxCCCo........owWWWQ.",
    "oCCcchhhhhhllllccCCo.....oqqWWWWQ.",
    "CccccbbbbbbbbbbccccC....oxqQWWWWQ.",
    "ccccobbbbbbbbbbocccc...oxwwQWWWWQ.",
    "ccccobbbbbbbbbbocccc..oxwwWQWWWQo.",
    "cccobbbbbbbbbbbbocccooxwwWwQQWQo..",
    "cccobbbbbbbbbbbbocccoxwwWwWQQooxx.",
    "occobbbbbnnbbbbboccoxwwWwwWQ.oxxx.",
    ".olbbbuuuccuuUbbddoxwwWwwWQoo.odd.",
    ".olbbbuuuuuuuUbbddowwWwQwQodo.odo.",
    ".olbbbuuuuuuuUbbddoWQooQooddooddo.",
    "..ocbbuuuuuuuUbbdobbbbbbcbddoddo..",
    "...obbuuuuuuuUbbobbbbbbbbbddodo...",
    "....odUUUUUUUUdobbbbbbbbbcddo.....",
    ".....ooUUUUUUoobbbbbbbbbbbddo.....",
    ".......oooooobcbbbbbbbbbbbdo......",
    ".......ooo.oddddddddddddddo.......",
    "......olbdo.olbdooolbdoolbdo......",
    "......obbdo.obbdo.obbdoobbdo......",
    "......ouuUo.ouuUo.ouuUoouuUo......",
]
GARGIT_FACE_TOP, GARGIT_FACE_SHIFT = face_place(GARGIT, 6, 2, FACE_W)
GARGIT_TAGS = body_tags(GARGIT, 15, 17, flat_rows=3)


def tongued(face, at):
    """A face grid function with a puppy's tongue out under its smile, `at` = [left, row] of the tongue."""
    def grid(eyes, mouth, blush):
        out = [list(r) for r in face(eyes, mouth, blush)]
        if mouth == "small":
            out.append(list("." * len(out[0])))
            for x in (at[0], at[0] + 1):
                out[at[1]][x] = "t"
        return ["".join(r) for r in out]
    grid.width = getattr(face, "width", None)
    return grid


OCTOPUS_FACE_PALETTE = FACE_PALETTE | {"d": (205, 100, 100), "m": (110, 40, 60), "k": (255, 150, 170)}
GARGOYLE_FACE_PALETTE = FACE_PALETTE | {"d": (130, 126, 132), "m": (60, 58, 72), "k": (240, 140, 160),
                                        "t": (240, 120, 140)}

OCTOPUS_EYES = {  # 4×4: a wide, low pupil, as a real octopus has (left, right)
    "open": ([".ww.", "wppw", "wgpw", ".ww."],) * 2,
    "proud": (["dddd", "wppw", "wgpw", ".ww."],) * 2,  # lids lowered, pleased with itself
    "half": (["....", "dddd", "wppw", ".ww."],) * 2,
    "closed": (["....", "....", "pppp", "...."],) * 2,
    "happy": (["....", ".pp.", "p..p", "...."],) * 2,
    "sad": (["p...", ".ww.", "wppw", ".ww."], ["...p", ".ww.", "wppw", ".ww."]),
    "cross": (["...p", "..pw", "wppw", ".ww."], ["p...", "wp..", "wppw", ".ww."]),
}
OCTOPUS_MOUTHS = MOUTHS | {"tongue": [".mm.", "..t."]}  # the tip of its tongue out in concentration


def eyed_face(eyes, gap, mouth_row, mouths=MOUTHS):
    """A face grid function with eyes of its own (4 wide, all as tall), `gap` apart, rosy cheeks under
    their outer sides and the mouth `mouth_row` rows below the top, centered (none for 0)."""
    tall = len(eyes["open"][0])
    width = 1 + gap + 4 + 1
    height = max(tall, mouth_row + 2)

    def grid(eye, mouth, blush):
        rows = [list("." * width) for _ in range(height)]
        for left, part in ((1, eyes[eye][0]), (1 + gap, eyes[eye][1])):
            for y, line in enumerate(part):
                for x, ch in enumerate(line):
                    if ch != ".":
                        rows[y][left + x] = ch
        if mouth_row:
            shape = mouths[mouth]
            mx = (width - len(shape[0])) // 2
            for y, line in enumerate(shape):
                for x, ch in enumerate(line):
                    if ch != ".":
                        rows[mouth_row + y][mx + x] = ch
        if blush:
            rows[tall - 1][0] = rows[tall - 1][width - 1] = "k"
        return ["".join(r) for r in rows]
    grid.width = width
    return grid


# Inkasso: the octopus has become a painter. It sits on the ground, mantle in front, and fans five arms
# up behind itself like a peacock's tail; every arm tip is a brush, a pointed tuft soaked in its own
# color, the red one raised highest and flicking paint. Two more arms curl on the ground in front of
# it, and paint is splashed on its mantle (Inklet's ink blot, now in every color). Pleased with itself.
INKASSO_PALETTE = OCTOPUS_PALETTE | {
    "C": (225, 190, 165), "m": (110, 40, 60),
    "r": (255, 120, 110), "R": (230, 55, 65), "s": (140, 25, 45),     # red paint
    "y": (255, 235, 130), "Y": (245, 195, 50), "t": (170, 115, 25),    # yellow
    "g": (150, 230, 130), "G": (70, 185, 90), "j": (30, 105, 65),      # green
    "u": (140, 200, 255), "U": (60, 130, 235), "v": (35, 65, 150),     # blue
    "p": (215, 160, 245), "P": (160, 85, 210), "q": (90, 40, 135),     # violet
    "i": (130, 125, 225), "I": (75, 70, 160), "n": (40, 35, 90),       # its own ink
}
INKASSO = [
    "...........o.R..R..oo...........",
    "..........oo......oo..o.........",
    ".........ogo..R..oro..oo........",
    "........ogjo....orso..oyo.......",
    ".......ojjo....orRso..otyo......",
    "...o..ogGjo....orRso..oyto......",
    "..oo..ojGjo...orRsso..oyYyo..o..",
    "..ouo.ogGjo...oorsso..oytto..o..",
    "..ouo.oogoo...ooooo...oytto.opo.",
    ".ouvoolboo....oldo.....oooo.opo.",
    ".ouvoolbdc....olUo.....oldc.opo.",
    "ouvUuolbdo.P.oooooo....oldoopPpo",
    "ouUUvolbdoPpPlllllboYY.oldoopqqo",
    ".ouvoolbdcoPPllllbbbYtolbdcopPqo",
    ".ooooolbcohlllllbbbbbbolbdooqqqo",
    ".oldoolbbolllllbbbbbbbobbdoooooo",
    ".olco.olbollllbbbbbbbbobdc.olbdc",
    ".oldo..oollbbbbbbbbbbbdoo..oldo.",
    ".oldc..oollbbbbbbbbbbbdo...oldo.",
    ".olblo..olbbbbbbbbbbbbdo...oldc.",
    ".olbbco..obbbbbbbbbbbdo...olbdo.",
    "..olbbloolbbbbbbbbddddoooolbboo.",
    ".onobcbllobbbbbbbdddddolllbbono.",
    ".ololddbolobbbbbbdddRolobbddolo.",
    ".olloooolbcoobbddddoobclooooldo.",
    ".oldclllcddo.oooooo.oldbclllcdo.",
    "..ooldcddoo..........oolddcdoo..",
    "....ooooo..............ooooo....",
]
INKASSO_FACE_TOP, INKASSO_FACE_SHIFT = face_place(INKASSO, 17, 9, 14)
INKASSO_TAGS = species_tags([INKASSO, drop_rows(INKASSO, 20)], 20, 16)
inkasso_face_grid = eyed_face(OCTOPUS_EYES, 8, 5)
INKASSO_FACE_PALETTE = OCTOPUS_FACE_PALETTE

# Octavio: the octopus has become a juggler. Tall and slim, it balances on the tip of a single arm, its
# mantle stretched up high, its other arms long and winding out in every direction. Its suckers have
# become juggling balls, red and yellow: some come loose and fly in an arc over its head, and the
# empty spot on the arm waits for them. It watches the balls, the tip of its tongue out.
OCTAVIO_PALETTE = {
    "o": (85, 30, 75), "d": (180, 85, 150), "b": (220, 125, 185), "l": (240, 165, 210), "h": (252, 210, 238),
    "c": (255, 235, 205), "r": (240, 70, 75), "R": (160, 30, 55), "y": (255, 215, 70), "Y": (200, 140, 30),
    "m": (85, 30, 75), "k": (255, 130, 160), "a": (255, 240, 220),
}
OCTAVIO = [
    ".......rr..a.a...ycyy...........",
    "......rcrr.......yyyY.a.........",
    "......rrrR........YY............",
    ".......RR....oooooo.............",
    "............ohllllbo....a.......",
    "......ooo..ohllllbbbo...........",
    "......olo..ollllbbbbo...........",
    "......olo.ohlllbbbbbbo..........",
    "......olo.ollllbbbbbbo..........",
    "......olo.olllbbbbbbbo.....rr...",
    "......olo.ollbbbbbbbbo....rcrr..",
    "......olooolbbbbbbbbdo....rrrR..",
    ".......ollolbbbbbbbbdo.....RR...",
    ".......olyolbbbbbbbbdo.....oo...",
    ".......olbobbbbbbbbbdo....olo...",
    "........olbbbbbbbddddo....olo...",
    "........oldobbbbbdddo...ooldo...",
    ".........ooobbbbbdddoooolrdo....",
    "...........oobbddddolllyddo.....",
    ".........ooolooooooordddoo......",
    ".......oolllbboldolldooo........",
    "......olrbdyddoldobblo..........",
    ".....olbddoooooldolbrlo.........",
    "....olydoo....oldoolbdo.........",
    "....oldo......oldo.olbyo........",
    "...oldo.......oldo..olblo..oo...",
    "...oydo.......oldo...olrloolo...",
    "...olo.........olo....olblldo...",
    "...ollo........olo.....oyddro...",
    "....ollo.......olo......ooooo...",
    ".....ooo.......olo..............",
    "...............oo...............",
]
OCTAVIO_FACE_TOP, OCTAVIO_FACE_SHIFT = face_place(OCTAVIO, 11, 10, 12)
OCTAVIO_TAGS = species_tags([OCTAVIO, drop_rows(OCTAVIO, 8)], 8, 16)
octavio_face_grid = eyed_face(OCTOPUS_EYES, 6, 5, OCTOPUS_MOUTHS)
OCTAVIO_FACE_PALETTE = FACE_PALETTE | {"d": (180, 85, 150), "m": (85, 30, 75), "k": (255, 130, 160),
                                       "t": (255, 120, 150)}

# Abyssink (secret): the octopus of the deep sea, the biggest of the line. It floats like a great bell,
# its arms joined by a webbing of ink into a wide umbrella, their tips curling out below its hem. Rows
# of glowing dots run along every arm and round the mantle, a glowing lure hangs over its brow and
# bubbles rise round it; the line's ink has grown into the sea itself and curls away below it in
# wisps. It glows at night.
ABYSSINK_PALETTE = {
    "o": (28, 18, 62), "d": (75, 55, 145), "b": (105, 85, 190), "l": (140, 120, 220), "h": (180, 165, 242),
    "w": (70, 85, 185), "v": (100, 120, 215), "W": (52, 62, 148), "x": (45, 52, 130),   # its webbing of ink
    "g": (110, 240, 255), "G": (50, 175, 230), "j": (225, 255, 255),                     # glowing dots and lure
    "q": (120, 230, 255), "Q": (200, 250, 255),                                          # bubbles
    "i": (75, 80, 175), "I": (48, 50, 125),                                              # the ink it lets out
}
ABYSSINK = [
    ".........lll.............q......",
    "........l...l.oooo..............",
    ".......l....ollllloo........q...",
    ".....gg...oolllGlbGboo.....qQq..",
    "....gjjg.ollGlllbbbbbbo.....q...",
    "....gjjgollllllbbbbbbGbo........",
    ".....gg.olGlllbbbbbbbbbo........",
    "........ollllbbbbbbbbbbo.....q..",
    ".......ollllbbbbbbbbbbbGo.......",
    ".......olllbbbbbbbbbbbddo.......",
    ".......ollbbbbbbbbbbbdddo.......",
    "..q....oobbbbbbbbbbbdddo......q.",
    "......ovobbbbbbbbbbddddoo.......",
    ".....ovvobbbbbbbbbdddddowo......",
    "....ovvvvobbbbbbbdddddowwwo.....",
    "..qovvvvvvoobbbbddddoowwwwwo....",
    ".qQqvvvvvxgwoobdddooxwgxwwwwo...",
    "..qvvvvgxwwxwgoogoxgwxwwxgwWo...",
    "..ovvxxxwwgwwxwwxwwxwwgwwxxxWo..",
    "..ooxGwwwxwwwgwwgwwgwwwxWWWGxo..",
    ".ogxowwwwxwwwxwwxwwxwWWxWWWo.xgo",
    "olbo.owwGwwwxwwwxwwWxWWWGWo..olb",
    "olbo.owxowwwGwwwGWWWGWWooxo..olb",
    "obdo..go.owwxowWxWoWxWo..ogo.obd",
    "obdgoolbo.ogo.oWxo.oog...olbogbd",
    ".odboolbo.ox...ogo..ox...olbobdo",
    ".ioo.obdoolbo..olboolbo..obdoooi",
    "i..i.obdgolbo..olboolbo.ogbdo..i",
    "i...I.odbobdo..obdoobdo.obdoIIi.",
    ".iII...ooobdgo.obdogbdo..oo.....",
    "..........odbo.odoobdo..........",
    "...........oo...o..oo...........",
]
ABYSSINK_FACE_TOP, ABYSSINK_FACE_SHIFT = face_place(ABYSSINK, 8, 9, 14)
ABYSSINK_TAGS = species_tags([ABYSSINK, drop_rows(ABYSSINK, 13)], 13, 16)
abyssink_face_grid = eyed_face(OCTOPUS_EYES, 8, 5)
ABYSSINK_FACE_PALETTE = {"w": (150, 235, 255), "p": (28, 18, 62), "g": (225, 255, 255), "d": (75, 55, 145),
                         "m": (28, 18, 62), "r": (200, 70, 120), "k": (200, 120, 230)}  # its eyes glow too

GARGARD_EYES = {  # 4×4: a heavy brow over an amber eye, watchful (left, right)
    "open": (["dd..", ".ddd", "wapw", ".ww."], ["..dd", "ddd.", "wpaw", ".ww."]),
    "half": (["dd..", ".ddd", "dddd", "wapw"], ["..dd", "ddd.", "dddd", "wpaw"]),
    "closed": (["dd..", ".ddd", "....", "pppp"], ["..dd", "ddd.", "....", "pppp"]),
    "happy": (["dd..", "....", ".pp.", "p..p"], ["..dd", "....", ".pp.", "p..p"]),
    "sad": (["..dd", ".d..", "wapw", ".ww."], ["dd..", "..d.", "wpaw", ".ww."]),
    "cross": (["d...", ".dd.", "wapw", ".ww."], ["...d", ".dd.", "wpaw", ".ww."]),
}
BELLFRY_EYES = {  # 4×4: big round eyes with a golden glint, singing (left, right)
    "open": ([".ww.", "wyyw", "wynw", ".ww."],) * 2,
    "half": (["....", "dddd", "wynw", ".ww."],) * 2,
    "closed": (["....", "....", "pppp", "...."],) * 2,
    "happy": (["....", ".pp.", "p..p", "...."],) * 2,
    "sad": (["p...", ".ww.", "wynw", ".ww."], ["...p", ".ww.", "wynw", ".ww."]),
    "cross": (["...p", "..yw", "wynw", ".ww."], ["p...", "wy..", "wynw", ".ww."]),
}

# Gargard: the gargoyle has become a piece of wall, a guardian on its plinth. It crouches square and
# blocky, its haunches and its plinth one block of masonry with joints running through both. Its stone
# wings are laid forward round its chest like a shield with rims of iron; it rests its front paws on the
# shield's edge and peers over it under heavy brows, curled horns on its head, its ears hanging heavy.
# A crack runs down the shield, and moss grows on the plinth.
GARGARD_PALETTE = GARGOYLE_PALETTE | {
    "w": (120, 130, 160), "W": (88, 96, 128), "v": (150, 160, 190),    # the shield of its wings
    "q": (185, 195, 225), "Q": (120, 132, 170),                          # its iron rims
}
GARGARD = [
    "......oo.......mM.......oo....",
    ".....ouo.....omMmo.....ouUo...",
    ".....oUuo...ooooooo...oUuo....",
    "......oUuoohhhlllllbboouo.....",
    "......ooUohhllllllbbbbdoo.....",
    ".....oCCohlllbbbbbbbbbdoCCo...",
    "....oCccolbbbbbbbbbbbdoccCo...",
    "....occcolbbbbbbbbbbbbdoccco..",
    "....occcobbbbbbbbbbbbbdoccco..",
    "....occcobbbbuuuuuubbbdoccco..",
    "....occcobbbuunnnnuubbdoccco..",
    "....occcobbbuuunnuuUbbdocco...",
    ".....oocobbbuuuuuuUUbbdoo.....",
    "....ooooohllouuUUUUohlbooooom.",
    "...ooqvollbooooooooolbdowqo...",
    "..ohoqvouoUowwoovvouoUoqobo...",
    ".ohhhoqvwwwwwwoovvvWwwwqobbo..",
    ".ohcloqWwWWwWWoovvWWWWWqobco..",
    ".olcloqwwwwwWWoovwwwWwqobbco..",
    ".olllloqwwwWWWoowwwwwWobbddo..",
    ".ollllboqqqqWWoowwqqqobddddo..",
    ".occccccooooqqoowqooocccccco..",
    ".obbbbcbbbbboooooobcddddcddo..",
    ".obbbbcbbbbbbcbobddcddddcddo..",
    ".mMcccccccccccccccccccccccco..",
    ".MmMbbbbbcbbbdddcdddddcddddo..",
    ".Moooooooooooooooooooooooooo..",
]
GARGARD_FACE_TOP, GARGARD_FACE_SHIFT = face_place(GARGARD, 5, 9, 14)
GARGARD_TAGS = species_tags([GARGARD, drop_rows(GARGARD, 22)], 22, 15)
gargard_face_grid = eyed_face(GARGARD_EYES, 8, 7)
GARGARD_FACE_PALETTE = GARGOYLE_FACE_PALETTE | {"d": (105, 100, 110), "a": (245, 175, 60), "k": (215, 150, 150)}

# Fountaingle: the gargoyle has become a waterspout. Its body is long and level, stretched forward like a
# spout leaning out from a roof, and its back is a gutter, water running in it and moss on its rim. Rain
# gushes out of its wide-open mouth in an arc; its two little wings are swept back and spout water from
# their tips too, and its arrow-tipped tail curls up behind. Four stubby legs grip the ledge, and its
# eyes are squeezed shut with joy: it loves the rain.
FOUNTAINGLE_PALETTE = GARGOYLE_PALETTE | {
    "w": (95, 160, 140), "W": (60, 120, 110), "v": (140, 200, 175), "x": (45, 85, 80),  # verdigris wings
    "e": (90, 170, 245), "E": (60, 120, 210), "f": (190, 230, 255), "F": (140, 205, 250),
    "g": (150, 205, 255), "t": (240, 120, 140),                                          # water, its tongue
}
FOUNTAINGLE = [
    "................................",
    ".......g..f.....................",
    "......fFf.Ff......o..mM..o......",
    "..o....Foowwo....ooomMmmoo......",
    ".olo..ovvoxwwo..ohhllllbbbo.....",
    "olbbo.oWvvoxWwo.ooolllbbbbbo....",
    "olbdo.oWWwvoxWwooccolbbbbbbo....",
    ".ooo..oWwWwvoxWwoccobbbbbbbo....",
    ".olo..oWWwWwvoWWoccobbbbbbdo....",
    ".olo...oWwWwwvoxocdobbbbbddo....",
    ".oloM...oWooWwmoooobbbbuuuuuuun.",
    ".ooomMooooooomMmobbbbbbuUUUUUUo.",
    ".oloEeEEEEeEEEEeobbbbbdottttoofF",
    ".oloeeefeeefeeefobbbbdduuuuuuoef",
    "..ooohhhhhhhlllllooooooUUUUUo.eE",
    "...ollllbbbbbbbbbbbdo........eE.",
    "...ollbbbbbbbbbbbdddo........eE.",
    "...obbcbbbbbcbbdddcdo.........e.",
    "...obbbcbbbbbcdddddco.........eg",
    "...obbbbbbbddddddddo...........g",
    "....ooooooooooooooodo.........g.",
    "....obdo.obdoobdoobdo.......g..g",
    "....obdo.obdoobdoobdo...........",
    "...gouUo.ouUoouUoouUo...........",
    "....oooo.oooooooooooo...........",
]
FOUNTAINGLE_FACE_TOP, FOUNTAINGLE_FACE_SHIFT = face_place(FOUNTAINGLE, 6, 19, 10)
FOUNTAINGLE_TAGS = species_tags([FOUNTAINGLE, drop_rows(FOUNTAINGLE, 16)], 16, 12)
FOUNTAINGLE_TAGS["walk"] = walk_tags(FOUNTAINGLE, 16, [*range(4, 8), *range(13, 17)], [*range(9, 13), *range(17, 21)], 20)
fountaingle_face_grid = kit_face(4, mouth_row=0)  # its mouth is open all the time: that is its spout
FOUNTAINGLE_FACE_PALETTE = GARGOYLE_FACE_PALETTE

# Bellfry (secret): the gargoyle has become the bell of its own tower, the biggest of the line. Its body
# is a bronze bell, flared at the hem, two raised bands round it; the dog's head sits on top where the
# bell hangs from. Its stone wings have grown into two tall pointed tower roofs on either side, slate
# tiles and a golden finial on each; its tail is the clapper, swinging out under the hem, and its paws
# peek out in front. Rings of sound tremble round it and dust trickles down; it glows warm at night.
BELLFRY_PALETTE = {
    "o": (70, 38, 22), "d": (165, 100, 40), "b": (205, 140, 55), "l": (235, 180, 85), "h": (255, 222, 140),
    "c": (130, 75, 30), "u": (245, 205, 130), "U": (215, 160, 85), "n": (60, 32, 20),     # bronze, muzzle
    "m": (125, 185, 75), "M": (75, 135, 55), "x": (190, 125, 50),
    "w": (115, 130, 180), "W": (80, 92, 140), "v": (155, 170, 215), "O": (55, 58, 90),    # slate roofs
    "y": (255, 225, 110), "Y": (240, 170, 50), "j": (255, 245, 190),                      # golden finials
    "r": (255, 220, 120), "R": (230, 175, 80), "s": (205, 190, 165), "S": (170, 155, 135),  # rings and dust
}
BELLFRY = [
    "............................y...",
    "....y......................yjY..",
    "...yjY......o..mM..o.......OY...",
    "....YO.....ooomMmmoo......OO....",
    "....OO....ohhllllbbbo.....OO....",
    "....OO.oooohllllbbbbboooo.OwO...",
    "....OO.oddollbbbbbbbboddoOwwO...",
    "...OvWOoddollbbbbbbbboddoOwWO...",
    "...OwwOoddolbbuuuubddooo.OwwO.R.",
    ".R.OwwOoddobbbunnudddoooOwwwO..R",
    "R..OWwOodoobbbuuuudddoooOwWwO..R",
    "R.OwwwwOo.obbbbbbdddo..oOwwwwOR.",
    ".ROwwwwO..oooooooooobo.OwwwwWO..",
    "..OWwWwO..ollllllbbbbo.OwWwWWO..",
    ".OwwwwWWO.ollllbbbbbbo.OwwwWWO..",
    ".OwwwwWWO.olllbbbbbbboOwwwwWWO..",
    ".OWwWWWWO.ohllllllllxoOwWwWWWO..",
    ".OwwwWWWOolddddddddddbowwwWWWWO.",
    "OwwwWWWWWobbbbbbbbbbbbowwWWWWWO.",
    "OOOOOOOOOobbbbbbbbbbbboOOOOOOOO.",
    "..Rs.....obbbhbbbbbbbbo.S....R..",
    ".r......sobbhbbbbbbbbdo.....s.r.",
    "r.......obbbbbbbbbbddddo.......r",
    "r.s.....obbbbbbbbbdddddo.......r",
    "r......ohhhhllllllllxxxxo......r",
    ".r....obdddddddddddddddddo....r.",
    "..R..obbbbbbbbddddddddddddo..R..",
    "....oooooooooooooooooooooooo....",
    "......olllo.....ccc..olldo......",
    "......ouoUo.....obo..ouoUo......",
    "......S.........obo.......S.....",
    "...........S...Sooo.............",
]
BELLFRY_FACE_TOP, BELLFRY_FACE_SHIFT = face_place(BELLFRY, 5, 11, 11)
BELLFRY_TAGS = species_tags([BELLFRY, drop_rows(BELLFRY, 21)], 21, 16)
bellfry_face_grid = eyed_face(BELLFRY_EYES, 5, 6)
BELLFRY_FACE_PALETTE = {"w": (255, 250, 235), "y": (255, 210, 70), "n": (60, 32, 20), "p": (70, 38, 22),
                        "d": (165, 100, 40), "m": (70, 38, 22), "r": (190, 60, 70), "k": (255, 150, 150)}

COAST_LINES = (("octopus", "inklet", baby_face_grid, face_grid),
               ("gargoyle", "gargit", tongued(baby_face_grid, (4, 5)), tongued(face_grid, (7, 8))))
COAST_FORMS = (("inkasso", kit_faces(normal=("proud", "small", False), smile=("proud", "small", True))),  # pleased
               ("octavio", kit_faces(normal=("open", "tongue", False))),  # concentrating on its balls
               ("abyssink", FACES),
               ("gargard", kit_faces(normal=("open", "flat", False))),  # watchful
               ("fountaingle", kit_faces(normal=("happy", "none", True), smile=("happy", "none", True))),  # rain!
               ("bellfry", kit_faces(normal=("open", "open", False), smile=("open", "open", True))))  # it sings


ITEMS = {
    "bowl": ["BBBBBBBBBBB", ".bbbbbbbbD.", "..bbbbbbD..", "...DDDDD..."],
    "food_full": ["...fffff...", "..fffffFf..", ".fffffffFf."],
    "food_half": ["...........", "....fff....", "..ffffFf..."],
    "food_low": ["...........", "...........", "...ff.f...."],
    "poop": ["....p...", "...pP...", "..pPPq..", ".pPPPPq.", "pPPPPPPq", ".qqqqqq."],
    "ball": [".aaa.", "asaaa", "aaaaA", "aaaAA", ".AAA."],
    **{f"umbrella_{width}": umbrella(width) for width in UMBRELLA_WIDTHS},
    "cloud": ["....ccc......", "..cccccccc...", ".ccccccccccc.", "ccccccccccccc", ".CCCCCCCCCCC."],
    "cloud_small": ["..ccc...", ".cccccc.", "cccccccc", ".CCCCCC."],
    "cookie": [".KKKKK.", "KKnKKKj", "KKKKnKj", "KnKKKKj", "KKKKnjj", ".jjjjj."],
    "icecream": [".iii.", "iiiiI", "iiiII", "zZzZz", ".zZz.", ".zzZ.", "..z..", "..Z.."],
    "fruit": ["...g..", "..g...", ".RRRR.", "RWRRRQ", "RRRRRQ", "RRRRQQ", ".RQQQ."],
    "medicine": [".hhh.", ".hhh.", "RRRRR", "RRhRR", "RhhhR", "RRhRR", "QQQQQ"],  # thrown from the app
    "sponge": ["L.....L.", ".L.YYYYY", "YYYYOYYY", "YOYYYYOY", "YYYOYYYY", "OOOOOOOO"],  # the app's, for cleaning
    "baton": ["......Y.", ".....YYY", "....h.Y.", "...h....", "..h.....", ".nn.....", "nn......"],  # the app's, for tricks
    # the app's: the bag with what there is to eat and plant
    "bag": ["..n..n..", "...nn...", "..KKKK..", ".KKKKKj.", "KKKKKKKj", "KKKKKKjj", "KKKKKjjj", ".jjjjjj."],
    # the app's: the whistle that starts training, and hide and seek (two eyes peeking out of a bush)
    "whistle": ["......YYYY..", "YYYYY.YhYYY.", "YhYYYYYYYYYu", "OOOOOYYYYYOu", ".....OYYYO.u", "......OOO.u."],
    "hide": ["..ll.ll..", ".lllllll.", "lllGllllG", "lllllllGl", "lhnlhnlGG", "GlllllGGG", ".GGGGGGG."],
    # the training: the stone that is thrown for strength, the flash for speed, the light bulb for smarts
    "stone": ["..SSS..", ".SSSSS.", "SShSSST", "SSSSSTT", ".TTTTT."],
    "skill_speed": ["....YY", "...YY.", "..YY..", ".YYYYY", "...YY.", "..YY..", ".Y...."],
    "skill_smarts": [".hhh.", "hYYYh", "hYYYO", "hYYYO", ".YOO.", ".SSS.", ".TTT."],
    # the app's: the fishing rod, its line hanging down to a red-and-white float
    "rod": ["........mMv.", ".......mM.v.", "......mM..v.", ".....mM...v.", "....mM....v.", "..SSM.....R.",
            "..STm....RRr", ".mM......hhH", "mM........h."],
}
ITEM_PALETTE |= {"m": (175, 120, 65), "M": (120, 75, 40), "v": (215, 225, 240), "r": (165, 30, 45), "H": (200, 200, 215)}

# ---------------------------------------------------------------- Trips and finds

TRIP_PALETTE = {
    "g": (70, 180, 70), "G": (35, 115, 50), "l": (140, 220, 90),        # greens
    "t": (120, 75, 40), "T": (80, 48, 25),                              # wood
    "r": (230, 55, 60), "R": (165, 30, 45), "y": (255, 215, 70), "Y": (215, 150, 35),
    "o": (255, 150, 50), "O": (190, 95, 25), "w": (245, 240, 225), "W": (190, 190, 200),
    "p": (255, 140, 180), "b": (90, 150, 255), "B": (45, 85, 180), "v": (175, 110, 235), "V": (110, 60, 170),
    "c": (110, 240, 220), "C": (40, 150, 140), "s": (150, 150, 160), "S": (95, 95, 110),
    "n": (200, 212, 230), "N": (135, 148, 178),                         # cloud
    "i": (200, 230, 255), "I": (140, 180, 230),                         # ice, water in the light
    "P": (255, 205, 225),                                               # bubblegum, lit
    "d": (205, 160, 105), "D": (150, 105, 65),                          # fur
    "e": (255, 235, 120), "E": (255, 190, 60),                          # eyes that glow
    "f": (255, 255, 255),
    "m": (65, 80, 140), "M": (40, 50, 100), "j": (150, 175, 225), "q": (235, 225, 245),  # mussel
    "a": (230, 165, 65), "A": (175, 110, 45),                           # Grandma's wool: mustard,
    "k": (200, 95, 125), "K": (150, 60, 95),                            # heather,
    "u": (215, 85, 70), "U": (160, 50, 50),                             # and berry red
    "h": (240, 200, 125), "H": (200, 150, 85),                          # sponge cake
}


def swap(grid, a, b):
    """Swap two colors (e.g. glowing ↔ dark)."""
    return [r.translate(str.maketrans(a + b, b + a)) for r in grid]


BERRY = [
    "...lggl....",
    "..lggggggl.",
    ".lgggggggg.",
    "lggggGggggl",
    "gggGgggGggg",
    "ggggggggggG",
    ".GgggGgggG.",
    "..GGtGGGG..",
    "....tT.....",
    "....tT.....",
]
# A sunflower and a cherry tree grow taller than a child (docs/gameplay.md, *Sizes of things next to the pet*)
SUNFLOWER_STEM = [".....G.....", "..l..G.....", ".lggGG.....", "..gggG.....", ".....G.....", ".....Gggl..",
                  ".....GGggl.", ".....Gggg..", ".....G.....", "..l..G.....", ".lggGG.....", "..gggG.....", ".....G.....",
                  "....GG....."]
SUNFLOWER = ["...........", "....lgl....", "...lgggl...", "...ggGgg...", "....gGg....", ".....G....."] + SUNFLOWER_STEM
SUNFLOWER_RIPE = ["...y.y.y...", "..yyyyyyy..", ".yyTTTTTyy.", "..yTtTtTy..", ".yyTTTTTyy.", "..yyyyyyy..",
                  "...y.y.y..."] + SUNFLOWER_STEM[1:]
CHERRY = [
    "....lllllgg....",
    "..llggggggggg..",
    ".lgggggggggggg.",
    ".lgggggggGgggg.",
    "lgggGgggggggggG",
    "lgggggggggggggG",
    "lggggggggggGggG",
    "GgggggGgggggggG",
    ".ggGggggggGggG.",
    ".GggggggGggggG.",
    "..GGgggggggGG..",
    "....GGtTGGG....",
    "......tT.......",
    "......tT.......",
    ".....ttT.......",
    "......tT.......",
    "......tT.......",
    "......tTT......",
    "......tT.......",
    ".....ttTT......",
]
HERB = [
    "....l....",
    "..l.g.l..",
    ".lg.g.gl.",
    "..ggGgg..",
    ".l.gGg.l.",
    ".gg.G.gg.",
    "..ggGgg..",
    "....G....",
    "....G....",
]
CRYSTAL = [
    "...c.....",
    "..ccC....",
    "..ccC.c..",
    "..ccCccC.",
    ".cccCccC.",
    ".cfcCccC.",
    "ccccCccCC",
    "ccccCcfCC",
    "sSsSsSsSs",
]
LANTERN = [".SSS.", "SyyyS", "SyoyS", "SyyyS", ".SSS.", "..S..", "..S..", "..S..", "..S..", "..S..", ".SSS."]
GLOWSHROOM = ["..ccc..", ".cCccc.", "cccccCc", "ccCcccc", "..www..", "..wWw..", "..www.."]
# Ember stone: a stone with cracks that glow from inside. At night the whole stone glows, and
# the cracks pulse.
EMBERSTONE = ["...sSSs..", "..sSoSSS.", ".sSSOoSSS", "sSSoSSOSS", "SSOSSSoSS", "SSSoSSSSS", ".SSSSSSS."]
# A shard of a shooting star, in the little crater it made ("n": pale, glowing as "y" at night)
STAR_SHARD = ["...n.....", "...nn..n.", "..nqnn.n.", "..nqqnnN.", ".nnqqnNN.", ".nqqnNNN.", "WsnnNNNsW", ".WsssssS."]
# The owl on the roof: brown, a light belly, eyes that shine at night, sitting on its talons
OWL = ["D.......D", "DDdddddDD", "DeeedeeeD", "DeTedeTeD", "DdeeYeedD", "DddhYhddD", "DdhhhhhdD", ".DhHhHhD.",
       "..DDDDD..", "..Y...Y.."]
OWL_BLINK = OWL[:2] + ["DdddddddD", "DTTTdTTTD"] + OWL[4:]
# A rosette on a stake, with two tails
ROSETTE = ["...bbb...", ".bbBbBbb.", ".bBwwwBb.", "bbwyyywbb", ".bBwwwBb.", ".bbBbBbb.", "...bbb...", "..BbtbB..",
           "..b.t.b..", "..B.t.B..", "....t...."]
# The jury's table: a cloth in stripes of the festival's colors, scalloped at the hem
JURY_TABLE = ['tttttttttttttttttttttttttttttt', 'rrrrryyyyybbbbbrrrrryyyyybbbbb', 'rrrrryyyyybbbbbrrrrryyyyybbbbb', 'RrrrRYyyyYBbbbBRrrrRYyyyYBbbbB', '.rrr..yyy..bbb..rrr..yyy..bbb.', '.T..........................T.', '.T..........................T.']
TRIP_TAGS = {
    "backpack": [([".TT.TT.", ".ooooo.", "ooooooo", "oYYYYYo", "ooTTToo", "ooooooo", ".OOOOO."], 1000)],
    # bigger ones for bigger pets (scene.PACKS): it should look like a backpack, not a purse
    "backpack_9": [([".TT...TT.", ".ooooooo.", "ooooooooo", "oYYYYYYYo", "ooooooooo", "ooTTTTToo", "ooTtYtToo",
                     "ooooooooo", ".OOOOOOO."], 1000)],
    "backpack_11": [(["..TT...TT..", ".TT.....TT.", ".ooooooooo.", "ooooooooooo", "oYYYYYYYYYo", "ooooooooooo",
                      "ooTTTTTTToo", "ooTtttYttoo", "ooTtttttToo", "ooooooooooo", ".OOOOOOOOO."], 1000)],
    "seed": [(["..l.", ".tt.", "tTTt", ".tt."], 1000)],
    # woven twigs and straw; the egg sits in it (scene.NEST_X)
    "nest": [(["t..............t", "TtdTtdtDdtdTtdtT", ".TdtDdtTDtdDtdT.", "..TTtTTtTtTTtT.."], 1000)],
    # a friend's gift, wrapped, until it is unwrapped (scene.GIFT_X); then what was in it, held up
    "gift": [(["..y.y..", "...Y...", "rrryrrr", "yyyyyyy", "rrryrrr", "RRRyRRR"], 1000)],
    # What the pet eats is a mouthful it can be seen eating: 6–8 pixels (docs/gameplay.md, *Sizes of things next to the pet*)
    "fruit_berry": [(["..gl..", ".vvvv.", "vfvVvV", "vvVvVV", ".vVvV.", "..VV.."], 1000)],
    "fruit_cherry": [(["...lG..", "..G..G.", ".G...G.", "rfr.rfr", "rrR.rrR", ".R...R."], 1000)],
    "fruit_sunflower": [(["..y.y..", ".yyyyy.", "yyTTTyy", ".yTtTy.", "yyTTTyy", ".yyyyy.", "..y.y.."], 1000)],
    "fruit_herb": [([".w...w.", "wyw.wyw", ".w.w.w.", ".gwywg.", "..gwg..", "...g...", "...G..."], 1000)],
    # Food from trips, one per area (core/src/food.ts): given by hand, held up when it is found
    "honeycomb": [([".YYYY.", "YyYyYY", "YYyYyY", "YyYyYY", ".YYYY.", "..y..."], 1000)],
    "hazelnut": [(["...l..", ".dDdDd", "dDdDdD", ".tttt.", "ttwttT", "tttttT", ".tTTT."], 1000)],
    "watercress": [([".l...l.", "lgl.lgl", ".gglgg.", "..ggg..", "...g...", "...G..."], 1000)],
    "glowberry": [(["...g..", "..g...", ".cccc.", "cfcccC", "ccccCC", ".cCCC."], 1000)],
    # a slice of Grandma's cake: sponge, jam and cream, a cherry on top (from her house)
    "cake": [(["....G..", "...uU..", ".wwwwwW", "hhhhhhH", "pppppPp", "hhhhhhH", ".HHHHH."], 1000)],
    "pinenut": [(["..g..", ".tTt.", "tTtTt", ".tTt.", "tTtTt", ".tTt.", "..T.."], 1000)],
    # Plant: sprout, young plant, then per kind without and with a ripe fruit
    "sprout": [(["l...l", "gl.lg", ".ggg.", "..g..", "..G.."], 1000)],
    "young": [(["..lgl..", ".lgggl.", "lggGggl", ".ggGgg.", "..gGg..", "...G...", "..gGg..", "...G..."], 1000)],
    "berry": [(BERRY, 1000)],
    "berry_ripe": [(dots(BERRY, {(6, 3): "v", (7, 3): "v", (6, 4): "v", (7, 4): "V", (5, 4): "V"}), 1000)],
    "sunflower": [(SUNFLOWER, 1000)],
    "sunflower_ripe": [(SUNFLOWER_RIPE, 1000)],
    "cherry": [(CHERRY, 1000)],
    "cherry_ripe": [(dots(CHERRY, {(x + dx, y + dy): "R" if dx and dy else "r"
                                   for x, y in ((2, 8), (10, 9), (6, 6), (11, 4)) for dx in (0, 1) for dy in (0, 1)}),
                      1000)],
    "herb": [(HERB, 1000)],
    "herb_ripe": [(dots(HERB, {(4, 0): "w", (3, 1): "w", (5, 1): "w", (4, 1): "y", (4, 2): "w"}), 1000)],
    # Decorations
    "flag": [(["s......", "srrr...", "srrrrr.", "srrrrrr", "sRRRRR.", "sRRR...", "s......", "s......",
               "s......", "s......", "s......"], 1000)],
    "windmill": [(["...b...", "...b...", "...b...", "yyywrrr", "...g...", "...g...", "...g...", "...s...",
                   "...s...", "...s...", "...s..."], 300),
                 (["b.....r", ".b...r.", "..b.r..", "...w...", "..y.g..", ".y.s.g.", "y..s..g", "...s...",
                   "...s...", "...s...", "...s..."], 300)],
    "lantern": [(swap(swap(LANTERN, "y", "W"), "o", "s"), 1000)],
    "lantern_lit": [(LANTERN, 1000)],
    "glowshroom": [(swap(GLOWSHROOM, "c", "C"), 1000)],
    "glowshroom_lit": [(GLOWSHROOM, 1000)],
    "emberstone": [(EMBERSTONE, 1000)],
    "emberstone_lit": [([r.translate(str.maketrans("sSOo", "rRoy")) for r in EMBERSTONE], 900),
                       ([r.translate(str.maketrans("sSOo", "rRyf")) for r in EMBERSTONE], 900)],
    "snailshell": [(["..ooo..", ".oYYYo.", "oYoooYo", "oYoYoYo", "oYYooYo", ".ooooo."], 1000)],
    "cattail": [(["..t....", "..t..t.", "..t..t.", "..T..t.", "..g..T.", "..g..g.", "l.g..g.", "gl.g.g.", ".g.g.gl",
                  ".g.gg.g", "..ggg.g"], 1000)],
    "boat": [(["....w....", "...ww....", "..www....", ".wwww....", "....W....", "WwwwwwwwW", ".WwwwwwW.",
               "..WWWWW.."], 1000)],
    "crystal": [(swap(CRYSTAL, "c", "C"), 1000)],
    "crystal_lit": [(CRYSTAL, 1000)],
    "cairn": [(["...ss...", "..sWsS..", "...SS...", "..WWss..", ".sWsssS.", "..SSSS..", ".WWsssS.", "sWsssssS",
                ".SSSSSS."], 1000)],
    "snowman": [(["..TTT..", "..TTT..", ".TTTTT.", "..fff..", ".fBfBf.", ".ffoof.", "..fff..", ".fffff.", "tffSfft",
                  "fffSfff", "fffffff", ".iiiii."], 1000)],
    # the snow globe: a fir in the snow under glass, on a wooden foot; the flakes drift inside
    "snowglobe": [(['...IIIII...', '..IiifiiI..', '.IfiiyiifI.', '.IiiigiiiI.', 'IiifgggfiiI', 'IiiggGggiiI', '.IfiiGiifI.', '.IIwwwwwII.', '..TTTTTTT..', '.TtttttttT.', '..TTTTTTT..'], 900),
                  (['...IIIII...', '..IifiiiI..', '.IiiiyfiiI.', '.IfiigiiiI.', 'IiiigggifiI', 'IifggGggiiI', '.IiiiGfiiI.', '.IIwwwwwII.', '..TTTTTTT..', '.TtttttttT.', '..TTTTTTT..'], 900)],
    # a garden pond: water in a ring of stones, a lily pad with its flower, a cattail at the edge
    # it is about as wide as a child, so that the pet can sit at it and fish (scene.ts keeps it on the panel)
    "pond": [([".....................t...",
               ".....................t.l.",
               "....................lTl..",
               "......sWsWsWsWsWsWs..g...",
               "..WsWsiIbbbbbbbbbbbsWgW..",
               ".WiibbbbbbbbbIibbbbbbbbW.",
               "WibbbGggpgbbbbbbbbbbIbbbS",
               "sbbbbGgyggbbbbbBbbbbbbbbS",
               ".SBbbbbbbbbbbbbbbbbbbbBS.",
               "..SSsSBBbbbbbbbbbbBBsSS..",
               "......sSSsSSsSSsSSsSs...."], 1000)],
    # a woodpile: logs stacked with their cut ends to the front, growth rings and all
    "woodpile": [(["....TTT....", "...TdddT...", "...TdDdT...", "..TTdddTT..", ".TdddTdddT.", ".TdDdTdDdT.", "TTdddTdddTT",
                   "TdddTdddTdT", "TdDdTdDdTDT", "TdddTdddTdT", ".TTT.TTT.T."], 1000)],
    # the fishing (core/src/fishing.ts): what comes up on the hook, and the float on the water
    # a mussel, blue-black with a pearly lip, and a frond of seagrass (food)
    "mussel": [([".mmmM.", "mjjmmM", "mmmmMM", ".qMMM."], 1000)],
    "seagrass": [(["..l..", ".lg.l", ".g.lg", "lg.g.", ".gGg.", "..gG.", "..G.."], 1000)],
    # an old boot that leaks, a little plant growing out of it (a decoration)
    "boot": [(["....l.l....", "...lg.gl...", "....gGg....", "..TTTGTTT..", "..TtttttT..", "..TtTttdT..", "..TttttdT..",
               "..TttttdTT.", "..TttttttdT", "..TtttttttT", ".iSSSSSSSSS", "i.........."], 1000)],
    # the float: red on top, white below
    "bobber": [([".R.", "rrR", "wwW", ".W."], 1000)],
    # Shooting stars (core/src/stars.ts): a shard of the star in its little crater, pale by day and
    # glowing at night (a decoration), and the owl that comes to sit on the roof and blinks
    "star_shard": [(STAR_SHARD, 1000)],
    "star_shard_lit": [(swap(swap(STAR_SHARD, "n", "y"), "N", "Y"), 1200),
                       (dots(swap(swap(STAR_SHARD, "n", "y"), "N", "Y"), {(3, 0): "f", (4, 2): "f"}), 400)],
    "owl": [(OWL, 2600), (OWL_BLINK, 200)],
    # The trick festival (core/src/festival.ts): its poster on a stake, the jury's table under a
    # cloth in the colors of the pennants, and the rosettes for second and third place (decorations)
    "poster": [(["wwwwwwww", "wrrrrrrw", "wwwyywww", "wwyyyyww", "wwwyywww", "wwywwyww", "wbbbbbbw", "wwwwwwwW",
                 "...tT...", "...tT..."], 1000)],
    "jury_table": [(JURY_TABLE, 1000)],
    "ribbon_blue": [(ROSETTE, 1000)],
    "ribbon_red": [(swap(swap(ROSETTE, "b", "r"), "B", "R"), 1000)],
    # Digging (core/src/digging.ts): the treasure map, a dashed path to its red cross; what only the
    # digging turns up: a khaki helmet with a band (a hat) and an ammonite in its stone (a decoration)
    "treasure_map": [(["HhhhhhhH", "hDDhhrhr", "hhhDhhrh", "hhhhDrhr", "hDhhhDhh", "hhDDhhhh", "HHhhhhHH"], 1000)],
    "hat_helmet": [(["......hhh......", "....hhhhhhh....", "...hhwhhhhhH...", "..hhhhhhhhhHH..", "..aaaaaaaaaaA..",
                     ".hhhhhhhhhhhhH.", "HHHHHHHHHHHHHHH"], 1000)],
    "hat_helmet_small": [(["....hhh....", "..hhwhhhH..", "..aaaaaaA..", ".hhhhhhhhH.", "HHHHHHHHHHH"], 1000)],
    "fossil": [(["..sWsss..", ".sWhhhsS.", "sWhHHHhsS", "shHhhhHhS", "shHhHhHhS", "shhHhHhSS", ".shhhHhS.", "..SSSSS.."],
                1000)],
    # Hats: the bottom two rows sit on the head. A child or an adult wears the big one, a baby the small
    # one (docs/gameplay.md, *Sizes of things next to the pet*)
    "hat_daisy": [([".w......p......w.", "wywg...pyp...gwyw", "gwgggggpgpgggggwg"], 1000)],
    "hat_leaf": [(["......llg.", "....lgggg.", "..lggGggg.", ".lgGgggg..", "lgGggg....", "..G......."], 1000)],
    "hat_cap": [(["....rrrrrrrr....", "..rrrwrrrrrwrr..", ".rrrrrrrrrrrrrr.", "rrwrrrrrwrrrrrwr", "rrrrrwrrrrrrwrrr",
                  "rwrrrrrrrrrrrrrr", ".RRRRRRRRRRRRRR."], 1000)],
    "hat_bobble": [(["......ww......", ".....wwww.....", "......ww......", ".....bbbb.....", "...bbbbbbbb...",
                     "..bbbbbbbbbb..", ".bBbBbBbBbBbB.", ".bbbbbbbbbbbb.", ".bbbbbbbbbbbb.", "wwwwwwwwwwwwww"], 1000)],
    "hat_lily": [([".....p.p.p.....", "....pppyppp....", "..GGgpppppgGG..", ".GgggggggggggG.", "GggggggG.ggggGg"], 1000)],
    "hat_batears": [(["v.............v", "vv...........vv", "vpv.........vpv", "vppv.......vppv", "vppv.......vppv",
                      "VvvV.......VvvV"], 1000)],
    "hat_edelweiss": [(["..w..w..w..", "..wwwwwww..", ".wwwyyywww.", "wwwwyyywwww", ".wwwyyywww.", "..wwwwwww..",
                        "..w..g..w.."], 1000)],
    # Grandma's knitting: a mustard hat with ear flaps and braided ties, a long striped stocking cap
    # whose pompom flops over, and a heather hat knitted like a tea cosy with a knob on top
    "hat_earflap": [(["......wAw......", "....aaaaaaa....", "..aaAaaaaaAaa..", ".aaaaaAaaaaaaa.", "aaAaaaaaaaaaAaa",
                      "aaaaaaaaaaaaaaa", "wAwAwAwAwAwAwAw", "aaaA.......Aaaa", ".aA.........Aa.", ".w...........A."], 1000)],
    "hat_stripes": [(["..........uuu....", ".........wwwuu...", "........uuuu.wW..", ".......wwwww.WWw.",
                      "......uuuuuu..w..", ".....wwwwwww.....", "....uuuuuuuu.....", "...wwwwwwwwww....",
                      "..uuuuuuuuuuu....", ".UwUwUwUwUwUwU..."], 1000)],
    "hat_cosy": [(["......AA......", ".....kkkk.....", "....kKkKkK....", "..kkKkKkKkKk..", ".kKkKkKkKkKkK.",
                   "kkKkKkKkKkKkKK", "kKkKkKkKkKkKKK", "kkKkKkKkKkKkKK", "wwwwwwwwwwwwww"], 1000)],
    "hat_daisy_small": [([".w...p...w.", "wywgpypgwyw"], 1000)],
    "hat_leaf_small": [(["....lg.", "..lggg.", ".lgGgg.", "...G..."], 1000)],
    "hat_cap_small": [(["...rrrrrr...", ".rrwrrrrwrr.", "rrrrrwrrrrrr", "rwrrrrrrrwrr", ".RRRRRRRRRR."], 1000)],
    "hat_bobble_small": [(["....ww....", "....ww....", "...bbbb...", "..bbbbbb..", ".bBbBbBbB.", ".bbbbbbbb.",
                           "wwwwwwwwww"], 1000)],
    "hat_lily_small": [(["...p.p.p...", "...ppypp...", ".GGgpppgGG.", "GggggggggGg"], 1000)],
    "hat_batears_small": [(["v.........v", "vv.......vv", "vpv.....vpv", "vpv.....vpv", "VvV.....VvV"], 1000)],
    "hat_edelweiss_small": [(["..w.w.w..", ".wwwywww.", "..wyyyw..", ".wwwywww.", "..w.g.w.."], 1000)],
    "hat_earflap_small": [(["....wAw....", "..aaaaaaa..", ".aaAaaaAaa.", "aaaaaaaaaaa", "wAwAwAwAwAw", "aaA.....Aaa",
                            ".w.......A."], 1000)],
    "hat_stripes_small": [([".......uuu...", "......wwwuu..", ".....uuu..wW.", "....wwww..WWw", "...uuuuu...w.",
                            "..wwwwwww....", ".uuuuuuuuu...", "UwUwUwUwUwU.."], 1000)],
    "hat_cosy_small": [(["....AA....", "...kkkk...", "..kKkKkK..", ".kKkKkKkK.", "kkKkKkKkKK", "kKkKkKkKKK", "wwwwwwwwww"],
                         1000)],
    # What stands along the path on a trip
    "tuft": [([".l.l.", "g.g.g", ".ggg."], 1000)],
    "flower_red": [([".r.", "ryr", ".r.", ".g.", ".g."], 1000)],
    "flower_white": [([".w.", "wyw", ".w.", ".g.", ".g."], 1000)],
    "flower_blue": [([".b.", "byb", ".b.", ".g.", ".g."], 1000)],
    "bush": [(["...ggg......", ".ggggggg.gg.", "gggGgggggggg", "ggggggGggggg", "gGgggggggGgg", "gggggGgggggg",
               ".GGGGGGGGGG."], 1000)],
    "shroom_red": [([".rrr.", "rwrrr", "rrrwr", "..w..", "..w.."], 1000)],
    "shroom_brown": [([".ooo.", "ooYoo", "..w..", "..w.."], 1000)],
    "fern": [(["l..l..l", ".l.g.l.", "..ggg..", "...G..."], 1000)],
    "stump": [([".tttt.", "tTttTt", "tttttt", "tTtttT"], 1000)],
    "reed": [(["..t..", "..t.t", "..T.t", "l.g.T", "g.g.g", ".gg.g", ".gggg"], 1000)],
    "pebble": [([".Ws..", "WssS.", "sssSS"], 1000)],
    "lilypad": [(["..p....", ".pyp...", "GggggG.", ".GggG.."], 1000)],
    "rock": [(["..WWs..", ".WsssS.", "WssssSS", "sssSSSS"], 1000)],
    "stalagmite": [(["..W..", "..s..", ".Ws..", ".WsS.", ".ssS.", "WssSS", "sssSS"], 1000)],
    "gem": [(["..c..", ".ccC.", ".ccC.", "cfcCC", "sSsSs"], 1000)],
    "pine": [(["...G...", "..GgG..", "..ggG..", ".GgggG.", ".fggGf.", "GgggggG", "ffgggff", "...T...", "...T..."],
              1000)],
    "snowrock": [(["..fff..", ".fffis.", "fisssSS", "sssSSSS"], 1000)],
    "drift": [(["...fff...", ".fffffii.", "fffffiiii"], 1000)],
    # What the pet leaves behind while nobody is there (scene.drawTrace): built from the bottom
    # up, a drawing from left to right. A little tower of stacked stones,
    "trace_tower": [(["...Ws..", "...sS..", "..WssS.", "..sSSS.", ".Wnnnn.", ".nnnNNN", "WsssssS", "sssSSSS"],
                     1000)],
    # a tiny snowman with twig arms and a carrot nose (only in real snow),
    "trace_snowman": [(["..fff..", ".fSfSf.", ".fffoo.", "..fWW..", "t.fff.t", ".tfSft.", "ffffffW", "fffSffW",
                        "fffffWW", ".WWWWW."], 1000)],
    # and drawings scratched into the ground: a sun and the pet itself.
    "trace_drawing_0": [(["D..d..D", ".ddddd.", "Dd...dD", ".ddddd.", "D..d..D"], 1000)],
    "trace_drawing_1": [(["..ddddd..", ".d.D.D.d.", "d.......d", "d..DDD..d", ".ddddddd."], 1000)],
}

# Opponents on a trip. They look to the left, towards the pet. Mostly light, few dark pixels:
# that reads best on the panel. Each is an animal plus one more idea (see *Designing a
# creature* in docs/gameplay.md).
BUMBLEBOP = [  # a fat bumblebee that holds a boxing glove out in front of it
    ".......ww.ww....",
    "......wWwwWWw...",
    "......wWwwWWw...",
    ".....yyTTyyTTy..",
    "....yyyTTyyTTyy.",
    ".rr.wByyTTyyTTyT",
    "rrrryyyyTTyyTTyT",
    "rRr..yyyTTyyTTy.",
    ".....YYTTYYTTY..",
]
BUMBLEBOP_DOWN = ["................"] * 2 + ["....wwWWwwWWww.."] + BUMBLEBOP[3:]
DIGGLE = [  # a mole in its molehill, with a miner's helmet; the lamp at the front is lit
    "....yyyyy...",
    ".wsyyyyyyyy.",
    ".YYYYYYYYYYY",
    ".ttwttttttt.",
    "pptBtttttttt",
    "pttttttttttt",
    ".ttttttttttt",
    "wwtTttttTtww",
    "TTTTTTTTTTTT",
]
PRICKLEROLL = [  # a hedgehog that carries a toadstool and a leaf on its spines
    ".....rr......",
    "....rwrr..o..",
    "....TwT.ToOT.",
    "...TtTtTtTtT.",
    "..yTtTtTtTtTT",
    ".yytTtTtTtTtT",
    "wByytTtTtTtTT",
    "pyyyytTtTtTtT",
    ".yyyyytTtTtT.",
    "..YY.YY.TT...",
]
DRIZZLESHELL = [  # a snail that carries a rain cloud instead of a shell; it rains behind it
    "w.w....nn....",
    "l.l..nnnnnn..",
    "l.l.nnnnnnnnn",
    "lll.nnnnnnnnN",
    "lll..NNNNNNN.",
    ".lllllllll.b.",
    "..GGGGGGGG..b",
]
DRIZZLESHELL_STRETCH = dots(DRIZZLESHELL, {(0, 0): ".", (2, 0): ".", (0, 1): "w", (2, 1): "w",
                                           (11, 5): ".", (12, 6): ".", (12, 5): "b", (10, 6): "b"})
PUDDLIN = [  # a puddle that wears a paper boat for a hat (only in rain)
    "......w.......",
    ".....ww.......",
    "....www.......",
    "..WwwwwwwW....",
    "...WWWWWW.....",
    "..bbbbbbbbbb..",
    ".bibbbbbbbbbb.",
    "bbwBbbbwBbbbbb",
    "bibbbbbbbbbbbB",
    ".BBBBBBBBBBBB.",
]
CARROTNOSE = [  # a snowman stacked upside down: the big ball on top, the carrot pointing backwards (only in snow)
    "....fffffff....",
    "..fffffffffff..",
    ".fffffffffffff.",
    ".ffffSfffffffi.",
    ".fffffffffffii.",
    "..fffSfffffii..",
    "t..IiiiiiiiI..t",
    ".tt.fffffff.tt.",
    "...ffffSfffi...",
    "...fffffffii...",
    "....IiiiiiI....",
    "....fffffff....",
    "...fSffSffoooo.",
    "...ffffffffi...",
    "....ffffiii....",
]
DUSKWISP = [  # a dandelion seed that glows and drifts (only at dusk)
    "...eee...",
    ".eeEeEee.",
    "eeEefeEee",
    ".eeeEeee.",
    "...eEe...",
    "....E....",
    "...ttt...",
    "..tetet..",
    "..ttttt..",
    "...ttt...",
]
RIBBOP = [  # a frog that blows its throat up into a bubblegum bubble
    "......ww..ww...",
    ".....wBlgwBl...",
    "....lggggggggl.",
    "...lgggggggggg.",
    ".PPpgggggggggG.",
    "PPpppggggggggGG",
    "PpppplgggGggggG",
    "ppppplggGGgggGG",
    ".ppp.gg.GG.ggG.",
    "....ll.....ll..",
]
RIBBOP_SMALL = RIBBOP[:4] + [
    "...lgggggggggG.",
    "..PpgggggggggGG",
    ".PppplgggGggggG",
    ".pppplggGGgggGG",
    "..pp.gg.GG.ggG.",
    "....ll.....ll..",
]
SIDLECLAW = [  # a wind-up toy crab: the key in its back turns, and it charges sideways
    "........yy.yy...",
    "........yyYyy...",
    "rr........Y...rr",
    "r.R.w..w..Y..R.r",
    "rrR.B..B..Y..Rrr",
    ".RR.o..o.oo.RR..",
    "..RoooooooooR...",
    "...ooooooooooO..",
    "...OoooooooOOO..",
    "..R.R.R..R.R.R..",
]
SIDLECLAW_TURN = [  # the key seen edge-on
    "..........y.....",
    "..........Y.....",
] + SIDLECLAW[2:9] + [
    ".R.R.R....R.R.R.",
]
ECHOFLIT = [  # a bat whose ears are gramophone horns; its call goes out in rings
    "...yy.....yy.....",
    "..yYYy...yYYy....",
    "...yY.....Yy.....",
    "....vvvvvvv......",
    "v...vwBvwBv...v..",
    "vv.vvvvvvvvv.vv..",
    "vvvvvvvppvvvvvv..",
    "vVvVvvvvvvvVvVv..",
    "v.V..vvvvv..V.v..",
    "......v.v........",
]
ECHOFLIT_CALL = [
    "...yy.....yy.....",
    "c.yYYy...yYYy....",
    ".c.yY.....Yy.....",
    ".c..vvvvvvv......",
    ".c..vwBvwBv......",
    ".c.vvvvvvvvv.....",
    "c.vvvvvrrvvvvv...",
    ".vvVvvvvvvvvVvv..",
    ".vV..vvvvv..Vv...",
    ".v....v.v....v...",
]
GLINTBUG = [  # a beetle that is a geode: opened up, it is full of glittering crystal
    "....sssssss...",
    "..ssccvccvcss.",
    ".sscfccvcccvcs",
    "wBsvcccccvfccs",
    "ssscccvccccvss",
    ".sSSSSSSSSSSS.",
    "..S.S..S..S.S.",
]
GLINTBUG_GLINT = dots(GLINTBUG, {(4, 2): "c", (10, 3): "c", (7, 1): "f", (5, 4): "f"})
GLINTBUG_CURL = [  # curled up: a plain gray stone
    "...sssssss...",
    ".ssWWsssssss.",
    "ssWsssssSssss",
    "sssssssssssSs",
    "ssSssssssssSs",
    ".sSSSSSSSSSS.",
]
TUMBLESNOW = [  # a mountain hare that has pulled a lost mitten over one ear; curled up, it is a snowball
    "....SS.rr.......",
    "....fi.rrr......",
    "....fi.rrRr.....",
    "....fi.rrR......",
    "....fi.RRR......",
    "...ffffffi......",
    "..fBffffffiffi..",
    ".pfffffffffffffi",
    "..ffffffffffffff",
    "...fffffffffffi.",
    "...ffffffffffii.",
    "...ifffffffffii.",
    "...fi.fffffffi..",
    "..ffi.iIffffffi.",
]
TUMBLESNOW_TWITCH = dots(TUMBLESNOW, {(1, 7): "f", (0, 7): "p", (8, 0): ".", (9, 1): "r", (10, 2): "r", (11, 2): "R"})
TUMBLESNOW_CURL = [  # only the ear tip and the mitten stick out of the snowball
    "......S..rr.....",
    "......fSrrRr....",
    "....fffffRRfi...",
    "...fffffffffii..",
    "..fffffffffffii.",
    "..fffffffffffii.",
    "..ifffffffffiii.",
    "..iifffffffiiii.",
    "...iiiffffiiii..",
    "....IIiiiiiII...",
]
CRAGHORN = [  # an ibex with a big cowbell; it rings when the ibex charges
    "....wwww........",
    "..ww....ww......",
    ".w..dd...w......",
    ".w.dddd..w......",
    "..dddddd........",
    ".wBdddddd.......",
    "ddddddddddddddd.",
    "Dddd.ddddddddddd",
    "...tdddddddddddd",
    "..yyy.ddddddddD.",
    "..yYy.dd.dd.dd.d",
    "..yyy.dd.dd.dd.d",
    "...Y..DD.DD.DD.D",
]
CRAGHORN_RING = dots(CRAGHORN, {(2, 9): ".", (5, 9): "y", (2, 10): ".", (5, 10): "y", (4, 10): "Y", (3, 10): "y",
                                (2, 11): ".", (5, 11): "y", (3, 12): ".", (4, 12): "Y"})

# Guardians: one per area, 24 pixels instead of a small opponent's dozen. They look to the left too.
CROWCOMB = [  # a rooster whose comb is a crown: the self-appointed king of the meadow
    ".....y.y.y..............",
    ".....yyyyy..............",
    ".....yryry.........GG...",
    ".....YYYYY........GggG..",
    "....fffffff......GgbbgG.",
    "...fffffffff.....GgbbgG.",
    "..offBffffff....GgbbggG.",
    "ooofffffffff....GgbbgG..",
    ".ooffffffff....GGgbbgG..",
    "..rrfffffff...GGggbgG...",
    "..rrfffffff..GGgggggG...",
    "...rffffffffffGGgggG....",
    "....fffffffffffGGGG.....",
    "....ffffffffffffff......",
    "...ffffffwwwwffffff.....",
    "...fffffwwWWwwfffff.....",
    "...ffffffwwWWwwffff.....",
    "....ffffffwwwwwfff......",
    ".....fffffffffffW.......",
    "......WWWWWWWWWW........",
    "........o....o..........",
    "........o....o..........",
    "......ooo..ooo..........",
]
CROWCOMB_STRUT = CROWCOMB[:20] + [
    "........o.....o.........",
    ".......o......o.........",
    ".....ooo....ooo.........",
]
MOSSWART = [  # an old toad whose back is a mossy boulder with mushrooms on it
    "..........rr....r.......",
    ".........rwrr..rrw......",
    "..........w.....w.......",
    ".......gglsslggssgg.....",
    ".....gglllsssggglsss....",
    "....sgglsssssssgggsss...",
    "...sssssssSsssssssgsSS..",
    "..sssWssssssssSsssssSS..",
    "..ssssssssssssssssssSSS.",
    ".ssssssSssssssssWsssSSS.",
    ".sssssssssssssssssssSSS.",
    ".ggggggggssssssssssSSSS.",
    "gEEggEEgggggsssssssSSSG.",
    "gEBggEBggggggggggggggGG.",
    "ggggggggggggggggggggGGG.",
    "gTTTTTTTTgggggggggggGGGG",
    ".ggggggggggggglllgggGGGG",
    "..llll.gggggglll.lllGGG.",
    ".ll.ll.......ll..ll.ll..",
]
MOSSWART_BLINK = dots(MOSSWART, {(1, 12): "G", (2, 12): "G", (5, 12): "G", (6, 12): "G",
                                 (1, 13): "g", (2, 13): "g", (5, 13): "g", (6, 13): "g"})
RIPPLESPRITE = [  # a living wave: its tip curls over like a breaker, it surfs along on itself and twirls a hoop
    ".....fffff..............",
    "....fibbbbb.............",
    "...fib..bbbb............",
    "...fb....bbbb...........",
    "....b....bbbbb..........",
    "........ibbbbbB.........",
    ".......ibbbbbbbB........",
    "......ibbbbbbbbbB.......",
    ".....ibBBBbbBBBbbB......",
    ".....bbffBbbffBbbB......",
    "....ibbBfBbbBfBbbBB.....",
    "....ibbbbbbbbbbbbBB.....",
    "..ccbbbbbBBBbbbBbBBcc...",
    ".c..bbbbbbbbBBBbbBB..c..",
    "c..bbbbbbbbbbbbbbbBBb..c",
    ".cbbcbbbbbbbbbbbbBBcbbc.",
    "..c..ccccccccccccc...c..",
    "......bbbbbbbbbbBB......",
    "...ff..iBBBBBBBBB.......",
    ".f.fiiiiibbbbbbbbbbBB...",
    "f.fiiibbbbbbbbbbbbbbbBB.",
    ".fiiiiiiiiibbbbbbbbbBBBB",
]
RIPPLESPRITE_SPIN = RIPPLESPRITE[:12] + [  # the hoop seen edge-on as it spins
    "....bbbbbBBBbbbBbBB.....",
    "....bbbbbbbbBBBbbBB.....",
    "bccccccccccccccccccccb..",
    "...bbbbbbbbbbbbbbbBB....",
    "....bbbbbbbbbbbbbBB.....",
    "......bbbbbbbbbbBB......",
    "...ff..iBBBBBBBBB.......",
    "f..fiiiiibbbbbbbbbbBB...",
    ".ffiiibbbbbbbbbbbbbbbBB.",
    "fiiiiiiiiiibbbbbbbbbBBBB",
]
GLOOMPEEP = [  # in the dark just two big glowing eyes ...
    "...eeeee.......eeeee....",
    "..eeeeeee.....eeeeeee...",
    ".eeeeeeeee...eeeeeeeee..",
    ".eeEE.eeee...eeEE.eeee..",
    ".eeE..eeee...eeE..eeee..",
    ".eeEEEeeee...eeEEEeeee..",
    ".eeeeeeeee...eeeeeeeee..",
    "..eeeeeee.....eeeeeee...",
    "...eeeee.......eeeee....",
]
GLOOMPEEP_BLINK = ["." * 24] * 3 + [
    ".eeeeeeeee...eeeeeeeee..",
    ".eeE..eeee...eeE..eeee..",
    ".eeeeeeeee...eeeeeeeee..",
] + ["." * 24] * 3
GLOOMPEEP_BEATEN = [  # ... and once the light falls on it, a tiny ball of fluff
    "..v.vv.v..",
    ".vvvvvvvv.",
    "vee.vvee.v",
    "veE.vveE.v",
    ".vvvppvvv.",
    "..VvvvvV..",
    "..V....V..",
]
FROSTFLUFF = [  # a yeti that is a giant bobble hat, with eyes peeking out under the brim
    ".........ffff...........",
    "........ffffff..........",
    "........ffffii..........",
    ".........fiii...........",
    "........bbbbbb..........",
    "......bbbbbbbbbb........",
    ".....bbbbbbbbbbbB.......",
    "....bfbbfbbfbbfbBB......",
    "....fbfbbfbbfbbfBB......",
    "...bbbbbbbbbbbbbbBB.....",
    "...brrrrrrrrrrrrrRB.....",
    "...bbbbbbbbbbbbbbBB.....",
    "..bbfbbfbbfbbfbbfBBB....",
    "..bfbfbbfbbfbbfbbBBB....",
    "..bbbbbbbbbbbbbbbBBB....",
    ".ffffffffffffffffffii...",
    "fffffffffffffffffffiii..",
    ".ffffffffffffffffffii...",
    "..IeeE.IIeeE.IIIIIII....",
    "..IeE..IIeE..IIIIIII....",
    ".ffIIIIIIIIIIIIIIIiff...",
    "fffiffffffffffffffiiff..",
    "ff.ifffffffffffffii.ff..",
    "...ffff.......iiii......",
]
FROSTFLUFF_PEEK = dots(FROSTFLUFF, {(3, 18): "I", (4, 18): "I", (5, 18): "I", (9, 18): "I", (10, 18): "I",
                                    (11, 18): "I", (3, 19): "e", (4, 19): "e", (9, 19): "e", (10, 19): "e"})
FOE_TAGS = {
    "foe_bumblebop": [(BUMBLEBOP, 120), (BUMBLEBOP_DOWN, 120)],
    "foe_diggle": [(DIGGLE, 600), (drop_rows(DIGGLE, 6), 600)],
    "foe_prickleroll": [(PRICKLEROLL, 600), (drop_rows(PRICKLEROLL, 5), 600)],
    "foe_drizzleshell": [(DRIZZLESHELL, 700), (DRIZZLESHELL_STRETCH, 700)],
    "foe_puddlin": [(PUDDLIN, 600), (drop_rows(PUDDLIN, 5), 600)],
    "foe_carrotnose": [(CARROTNOSE, 500), (lean(CARROTNOSE, 1, 6), 500)],
    "foe_duskwisp": [(DUSKWISP, 500), (swap(DUSKWISP[:5], "e", "E") + DUSKWISP[5:], 500)],
    "foe_ribbop": [(RIBBOP, 900), (RIBBOP_SMALL, 300)],
    "foe_sidleclaw": [(SIDLECLAW, 250), (SIDLECLAW_TURN, 250)],
    "foe_echoflit": [(ECHOFLIT, 200), (ECHOFLIT_CALL, 200)],
    "foe_glintbug": [(GLINTBUG, 500), (GLINTBUG_GLINT, 500)],
    "foe_glintbug_curl": [(GLINTBUG_CURL, 1000)],  # "_curl": shown while it makes that move
    "foe_tumblesnow": [(TUMBLESNOW, 1400), (TUMBLESNOW_TWITCH, 300)],
    "foe_tumblesnow_curl": [(TUMBLESNOW_CURL, 1000)],
    "foe_craghorn": [(CRAGHORN, 500), (CRAGHORN_RING, 500)],
    "foe_crowcomb": [(CROWCOMB, 500), (CROWCOMB_STRUT, 500)],
    "foe_mosswart": [(MOSSWART, 2600), (MOSSWART_BLINK, 400)],
    "foe_ripplesprite": [(RIPPLESPRITE, 300), (RIPPLESPRITE_SPIN, 300)],
    "foe_gloompeep": [(GLOOMPEEP, 2400), (GLOOMPEEP_BLINK, 200)],
    "foe_gloompeep_beaten": [(GLOOMPEEP_BEATEN, 1000)],  # "_beaten": shown once the pet has got past it
    "foe_frostfluff": [(FROSTFLUFF, 1800), (FROSTFLUFF_PEEK, 500)],
}

# ---------------------------------------------------------------- The coast and the ruins

# The two areas behind the mountain (core/src/trip.ts): what stands along the path, the finds, the
# opponents and the guardians. Sand for the coast; the ruins are built of the stone grays.
TRIP_PALETTE |= {"z": (230, 205, 145), "Z": (185, 150, 95)}


def pad_top(grid, height):
    """Empty rows on top, so that a frame stands on the ground like the others of its sprite."""
    return ["." * len(grid[0])] * (height - len(grid)) + grid


# ---- Along the path
COAST_NEAR = {
    "beachgrass": [(["l...l..", ".l.ly.l", ".gl.gl.", "..ggG.y", ".zzgzz.", "zzzzzZZ"], 1000)],
    "shell": [(["..pP.", ".pfpP", "pPpPP", ".ZZZ."], 1000)],
    "driftwood": [([".t.......", "dddddddd.", "TtTTTtdTt", ".zz.zzz.."], 1000)],
}
# a torch on a post: it glimmers once the evening comes (scene: "_lit")
TORCH = ["..o..", ".oyo.", ".oyo.", "TtttT", ".TtT.", "..t..", "..t..", "..t..", "..T..", ".sSs."]
RUINS_NEAR = {
    "rubble": [(["...WWs..", "..WssS..", ".WsS.Ws.", "WssSWssS", "sSSSsSSS"], 1000)],
    "ivy": [(["..l..l.", ".lgGlg.", "lg.gGgl", ".gGg.Gg", "..gGg..", "...G..."], 1000)],
    "column": [(["WWWWWW", ".WssS.", ".WsSS.", ".W.sS.", ".WssS.", ".Wsss.", ".WssS.", "WWsssS", "sSSSSS"], 1000)],
    "torch": [([r.translate(str.maketrans("yo", "TT")) for r in TORCH], 1000)],
    "torch_lit": [(TORCH, 300), (dots(TORCH, {(2, 0): ".", (1, 1): "y", (3, 1): "o", (2, 1): "f"}), 300)],
}

# ---- Finds: food, decorations, hats
LIFERING = [  # a life ring hung on a post by the water
    "...rrrrr...",
    "..rrwwwrr..",
    ".wwR.t.Rww.",
    ".ww..t..ww.",
    ".wR..t..Rw.",
    ".rrR.t.Rrr.",
    "..rrwwwrR..",
    "....rtR....",
    ".....t.....",
    ".....t.....",
    "....tTT....",
]
SANDCASTLE = [  # two towers and a wall, a flag on top and a shell over the gate
    "...r.......",
    "...rr......",
    "...T.......",
    "..zZz...z.z",
    "..zzZ...zzZ",
    "z.zzZz.zzzZ",
    "zzzzZzzzzzZ",
    "zzzzpzzzzZZ",
    "zzzZTTzzzZZ",
    "zzzTTTTzzZZ",
    "ZZZZZZZZZZZ",
]
BOTTLE = [  # a message in a bottle, stuck in the sand: a rolled-up letter behind the glass
    "...t...",
    "...T...",
    "...c...",
    "..cic..",
    ".ciwwC.",
    ".cwwhC.",
    ".cwwhC.",
    ".ciwhC.",
    ".ccCCC.",
    "zzZzzzz",
    ".zzzZZ.",
]
BREAD = [  # castle bread: a round loaf with battlements on top
    "d.d.d.d",
    "dddddDd",
    "hdhdddD",
    "dddddDD",
    "DdhddDT",
    ".TTTTT.",
]
BANNER = [  # a banner on a pole, red with a yellow tower, a tail cut into points
    "yTTTTTTT",
    "..t.....",
    "..rrrrr.",
    "..ryryr.",
    "..ryyyr.",
    "..ryyyR.",
    "..ryRyR.",
    "..rrrRR.",
    "..rR.rR.",
    "..t.....",
    "..t.....",
    ".TtT....",
]
ARCH = [  # a stone arch left standing, ivy growing over it
    "..lgWWWWs..",
    ".gWsGgsSsS.",
    "WsGg...SsSS",
    "Wsg.....SsS",
    "WsS.....lS.",
    "Wss.....gSS",
    "Wss.....SgS",
    "WsS.....SsS",
    "Wss.....Ssl",
    "sSS.....SSS",
]
BELL = [  # a bronze bell in a little wooden frame
    "TtttttttT",
    "T...Y...T",
    "T..yyY..T",
    "T.yyyYY.T",
    "T.yyyYY.T",
    "T.yfyYY.T",
    "TyyyyyYYT",
    "T...O...T",
    "T.......T",
    "T.......T",
    "TT.....TT",
]
COAST_FINDS = {
    "bread": [(BREAD, 1000)],
    "lifering": [(LIFERING, 1000)],
    "sandcastle": [(SANDCASTLE, 1000)],
    "bottle": [(BOTTLE, 1000)],
    "banner": [(BANNER, 1000)],
    "arch": [(ARCH, 1000)],
    "bell": [(BELL, 1000)],
    # a sailor's cap: navy, a white band, two ribbons fluttering at the back
    "hat_sailor": [(["..bbbbbbbbbbb....", ".bbbbbbbbbbbbbB..", "BBBBBBBBBBBBBBBB.", "..wwwwwwywwwww.B.",
                     "..BBBBBBBBBBBB..B"], 1000)],
    "hat_sailor_small": [([".bbbbbbbbb..", "BBBBBBBBBBB.", ".wwwwywwww.B", ".BBBBBBBBB.B"], 1000)],
    # a knight's helmet: steel, a slit to look out of, a red plume
    "hat_knight": [(["..........uu...", ".........uuUu..", "....WWWWWuU....", "..WWsWsssWWs...",
                     ".WssssssssssS..", ".WSSSSSSSSSSS..", "WsssWsssWsssSS.", "WWsssssssssSSS."], 1000)],
    "hat_knight_small": [([".......uu..", "......uuU..", "...WWWWuU..", ".WsssssWs..", "WsSSSSSSsS.",
                           "WsssssssSS."], 1000)],
}

# ---- Opponents at the coast
SNATCHGULL = [  # a gull that has snatched a carton of chips and won't let go of it
    ".....wwww.......",
    "....wSSwww......",
    "...wwBwwwww.....",
    "yyyywwwwwwwW....",
    ".rYYwwwwwwwWss..",
    "rhhrwwwwwwwsssss",
    "rhhrwwwwwwssssSS",
    "rRRrwwwwwwwsssSS",
    ".RR..wwwwwwwW.S.",
    "......wwwwwW....",
    "......o...o.....",
    ".....oo..oo.....",
]
SNATCHGULL_POUNCE = [  # crouched, wings up: about to jump
    "..........ss....",
    "..........sssS..",
    ".....wwww.ssssS.",
    "....wSSwwwwsssSS",
    "...wwBwwwwwwsssS",
    "yyyywwwwwwwwwssS",
    ".rYYwwwwwwwwwwsS",
    "rhhrwwwwwwwwwW..",
    "rhhrwwwwwwwwW...",
    "rRRr.wwwwwwW....",
    ".RR.oo....oo....",
    "...oo....oo.....",
]
JELLYBRELLA = [  # a jellyfish whose bell is an umbrella; its handle is one long tentacle (only in rain)
    ".......c.......",
    ".....vpppv.....",
    "....vvpppvv....",
    "...vvvpppvvv...",
    "..pvvvpppvvvp..",
    ".ppwBvpppwBvpp.",
    "pppvvvpVpvvvppp",
    "PPPVVVPPPVVVPPP",
    ".P..V..v..V..P.",
    ".P..V..v..V..P.",
    "..P..V.v.V..P..",
    "..P..V.v.V..P..",
    ".P..V..v..V..P.",
    ".......v..v....",
    "........vv.....",
]
JELLYBRELLA_CURL = pad_top([  # folded shut like a closed umbrella, its tentacles wrapped round it
    ".......c.......",
    "......vpv......",
    "......vpv......",
    ".....vvpvv.....",
    ".....wBpwB.....",
    ".....vvpvv.....",
    ".....PvpvP.....",
    ".....vPvPv.....",
    ".....PvpvP.....",
    "......PvP......",
    ".......v.......",
    ".......v..v....",
    "........vv.....",
], 15)
STARCURL = [  # a starfish that walks on two of its arms and waves with another
    "......o......",
    ".....ooo.....",
    ".....oyo.....",
    "....ooooO....",
    "oooyoooooOyOO",
    ".owBowBoooOO.",
    "..oooppooOO..",
    "...oooooOO...",
    "...ooyOooO...",
    "..ooO..ooyO..",
    "..oO....oOO..",
    ".oO......OO..",
    "OO........OO.",
]
STARCURL_CURL = pad_top([  # rolled up into a ball, the five arm tips still poking out round it
    "......o......",
    ".....ooO.....",
    "...ooyooOO...",
    "..oyooOoyoO..",
    "ooooOoOoOooOO",
    ".ooyoOOOoyOO.",
    ".oOoOoOoOoOO.",
    "..ooyoOoyOO..",
    "..oOOoooOOO..",
    ".oO.OOOOO.OO.",
    "OO.........OO",
], 13)

# ---- Opponents in the ruins
RATWATCH = [  # a rat on guard at the castle gate: a kettle helmet and a halberd taller than itself
    "..W.............",
    ".WWt............",
    "WWWt.....ww.....",
    "WWWt....wWWW....",
    ".WWt...WWWWWW...",
    "...t..sssssssss.",
    "...t..dddddddpp.",
    "..pdddwBdddddDp.",
    "...tddddddddD...",
    "...ddrrrrrrD....",
    "...t.rryrrrD....",
    "...t.rrrrrrD..pp",
    "...t.ddddddD.p..",
    "...t.dd..dd.p...",
    "...t.DD..DDpp...",
]
RATWATCH_CHARGE = [  # halberd lowered, running at the pet
    "................",
    "................",
    ".........ww.....",
    "........wWWW....",
    ".......WWWWWW...",
    "......sssssssss.",
    "......dddddddpp.",
    ".....pdwBddddDp.",
    "W.....dddddddD..",
    "WWWttttttrrrrD..",
    "WW....rryrrrD..p",
    ".W....rrrrrrD.p.",
    "......ddddddD.p.",
    ".....dd....dd.p.",
    "....DD......DD..",
]
DRAPEGHOST = [  # a ghost made of an old velvet curtain, still on its rings, fringe at the hem (only in the evening)
    "...a.a.a.a.a..",
    "...kkKkkKkkK..",
    "..kkkKkkKkkKk.",
    ".kkkkKkkKkkKkk",
    ".keEkKeEkkKkkK",
    "kkEEkKEEkkKkkK",
    "kkkkkKkkkkKkkK",
    "kkkKKKkkKkKkkK",
    ".kkKKKkkKkKkkK",
    ".kkkkKkkKkKkkK",
    "..kkkKkkKkKkKK",
    "..kkkKkkKkKkKK",
    "..aAaAkkKkKkK.",
    "...a.aAakKkKK.",
    "......a.aAaAa.",
    ".........a.a..",
]
DRAPEGHOST_POUNCE = [  # it throws its folds wide: boo!
    "....a.a.a.a.a.",
    "....kkKkkKkkK.",
    "k..kkkKkkKkkKk",
    "kk.kkkKkkKkkKk",
    "kkkeEkKeEkkKkK",
    "kkkEEkKEEkkKkK",
    ".kkkkKKKkkkKkK",
    "..kkkKKKkKkKkK",
    "..kkkkKkkKkKkK",
    "...kkkKkkKkKKK",
    "...kkkKkkKkKKK",
    "...aAaAkkKkKK.",
    "....a.aAaKkKK.",
    ".......a.aAaA.",
    "..........a.a.",
    "..............",
]
IVYCURL = [  # a creeping ivy: its first leaf has a face, the rest follow along the stem, the tail curls up
    "..l...l.........",
    ".lgg.ggl........",
    ".gggggggG...lg..",
    "lgwBgwBgG..lggG.",
    ".ggggggGG.lgggG.",
    "..gGgGGG..ggGG..",
    "...gGG..lgtGG..l",
    "....tt.lggtt..l.",
    ".....ttgGGG.tl..",
    "......ttGG.tt...",
    "........ttt.....",
]
IVYCURL_CURL = pad_top([  # rolled up into a wreath of leaves, the face leaf in front
    ".....lggl.......",
    "...lgggggGG.....",
    "..lgGt..tgGG....",
    ".lgGt.....tGG...",
    ".lgwBgwBgg.gG...",
    ".lggggggGG.gG...",
    "..gGgGGG..tGG...",
    "...ggGttttGG....",
    ".....GGGGG......",
], 11)

# ---- The guardians
BARKGUARD = [  # a sea lion on lifeguard duty: a red cap, the whistle in its mouth, the ring under its flipper
    ".....rrrr...............",
    "....rrwrrrr.............",
    "...rrrwrrrrR............",
    ".RRRRRRRRRRR............",
    "...dhhhdddD.............",
    "..dhSSddddD.............",
    "..dhwBddddD.............",
    "Tddddddddddd............",
    "dwddddddddDD............",
    ".wyYhhdddddD............",
    "..YYhhddddddD...........",
    "...Yhhhddddddd..........",
    "...Yhhhhddddddd.........",
    "..rrrwwhhddddddDD.......",
    ".rrrrwwwhdddddddD.......",
    "rrR...wwwhdddddddD......",
    "rRddddddhhhddddddD......",
    "wwdDDDDDhhhddddddDD.....",
    "ww...DDrrhhddddddDD.....",
    "rR.....wwhhdddddddD.....",
    "rrR...wwwhhddddddddD....",
    ".rrrrwwwhhhddddddddDD.DD",
    "..rrrwwhhhdddddddddDDDD.",
    "....ddddd.ddddddddDDD...",
    "...dddDD...DDDDDDDD.....",
]
BARKGUARD_BLINK = dots(BARKGUARD, {(4, 6): "d", (5, 6): "D"})
BARKGUARD_BLOW = dots(BARKGUARD, {(1, 5): "c", (0, 6): "c", (0, 10): "c", (1, 11): "c", (4, 8): "h", (3, 9): "h"})  # tweeet!
RUSTKNIGHT = [  # an empty suit of armour; a snail lives in it and now and then looks out of the visor
    "............uu..........",
    "ww.ww......uuUu.........",
    "wB.wB......uU...........",
    ".P..P..wwWWWWWs.........",
    ".P..P..WWWWWWWss........",
    ".PP.P.WSSSSSSSsS........",
    "PPPPPPPPPSSSSSsS........",
    "PkPPPPPPPSSSSSsS........",
    ".pppppPWSSSSSssS........",
    "......WWWWWWWssS........",
    "......WWsWWWsssS........",
    ".....WWWWWWWWsSSS.......",
    ".sssssssssssssSSS.......",
    "sWWWWWWWsWWWsssSSS......",
    "sWhhhhhWsWWOWssSSs......",
    "sWhHHHhWsWWWWsSSSs......",
    "sWhHhhHWssWWOsSSSs......",
    "sWhHhHhWssWWWsSS........",
    "sWhhHHhWsSSSSSSS........",
    ".sWhhhWs.sWWss..........",
    "..sWWWs..sWOs.sWs.......",
    "...sss...sWWs.sWOs......",
    "........WWWWs.sWWWs.....",
    "......iiSSSSSiSSSSSii...",
]
RUSTKNIGHT_SHUT = [  # visor down: nobody home
    "............uu..........",
    "...........uuUu.........",
    "...........uU...........",
    ".......wwWWWWWs.........",
    "......wWWWWWWWss........",
    "......WWWWWWWWsS........",
    "......WSSSSSSSsS........",
    "......WWWWWWWWsS........",
    "......WWsWsWsssS........",
] + RUSTKNIGHT[9:]
RUSTKNIGHT_CURL = pad_top([  # hunkered down behind its shield, helmet pulled into its shoulders
    "........uu..............",
    ".......uuUu.............",
    ".......uU...............",
    ".....wWWWWWss...........",
    "....WWSSSSSSsSS.........",
    "...sssssssssssSS........",
    "sWWWWWWWsWWWsssSS.......",
    "sWhhhhhWsWWOWssSSs......",
    "sWhHHHhWsWWWWsSSSs......",
    "sWhHhhHWssWWOsSSSs......",
    "sWhHhHhWssWWWsSSSs......",
    "sWhhHHhWsSSSSSSSs.......",
    ".sWhhhWssWWss.sWs.......",
    "..sWWWs.sWWWssWWWs......",
    "......iiSSSSSiSSSSSii...",
], 24)
# "_<move>": shown while it makes that move (scene.ts)
FOE_TAGS |= {
    "foe_snatchgull": [(SNATCHGULL, 400), (dots(SNATCHGULL, {(4, 5): "h", (1, 6): "y"}), 400)],
    "foe_snatchgull_pounce": [(SNATCHGULL_POUNCE, 1000)],
    "foe_jellybrella": [(JELLYBRELLA, 500), (drop_rows(JELLYBRELLA, 9), 500)],
    "foe_jellybrella_curl": [(JELLYBRELLA_CURL, 1000)],
    "foe_starcurl": [(STARCURL, 600), (dots(STARCURL, {(0, 4): ".", (1, 3): "o", (11, 4): "O", (12, 4): ".", (12, 3): "O"}), 600)],
    "foe_starcurl_curl": [(STARCURL_CURL, 1000)],
    "foe_ratwatch": [(RATWATCH, 600), (drop_rows(RATWATCH, 12), 600)],
    "foe_ratwatch_charge": [(RATWATCH_CHARGE, 1000)],
    "foe_drapeghost": [(DRAPEGHOST, 600), (dots(DRAPEGHOST, {(6, 14): ".", (8, 14): ".", (9, 15): "a", (11, 15): "."}), 600)],
    "foe_drapeghost_pounce": [(DRAPEGHOST_POUNCE, 1000)],
    "foe_ivycurl": [(IVYCURL, 700), (dots(IVYCURL, {(15, 6): ".", (14, 7): ".", (13, 8): "l", (14, 6): "l"}), 700)],
    "foe_ivycurl_curl": [(IVYCURL_CURL, 1000)],
    "foe_barkguard": [(BARKGUARD, 2400), (BARKGUARD_BLINK, 200)],
    "foe_barkguard_charge": [(BARKGUARD_BLOW, 1000)],
    "foe_rustknight": [(RUSTKNIGHT_SHUT, 1800), (RUSTKNIGHT, 1400)],
    "foe_rustknight_curl": [(RUSTKNIGHT_CURL, 1000)],
}
TRIP_TAGS |= COAST_NEAR | RUINS_NEAR | COAST_FINDS


# ---------------------------------------------------------------- The house

# The house grows in three steps (core/src/home.ts): a hut of thatch, a wooden cabin with a window,
# then a whole house with a tiled roof. Outside it stands on the left (scene.HOUSE_X), with its door
# shut ("house_N"), open ("house_N_open") and, at night with the pet inside, with its windows lit
# ("house_N_lit"). Inside, a room fills the panel ("room_N"): its window, or the hut's doorway, is
# left transparent, so the real sky shows through. "room_N_lit" is the room at night with its
# light on, and "blanket_N" is laid over the sleeping pet.
HOUSE_PALETTE = {
    "O": (120, 78, 36), "T": (196, 156, 72), "t": (150, 112, 52), "h": (228, 196, 112),  # thatch
    "D": (26, 18, 14),  # an open doorway: dark
    "W": (160, 104, 60), "w": (124, 78, 45), "o": (95, 58, 32), "d": (132, 84, 48),  # wood, the door
    "F": (235, 214, 170), "G": (140, 190, 230), "L": (215, 238, 252), "k": (235, 200, 90),  # frame, glass
    "g": (70, 150, 60), "r": (225, 75, 85), "y": (245, 212, 80),  # flowers
    "C": (236, 222, 190), "c": (205, 188, 152), "B": (112, 70, 40),  # plaster, beams
    "R": (196, 78, 58), "q": (228, 112, 82), "e": (150, 55, 42), "E": (128, 50, 38),  # tiles
    "S": (150, 142, 138), "s": (115, 108, 104),  # chimney
    "Y": (240, 220, 150),  # the round attic window
}
LIT = {"G": (255, 200, 110), "L": (255, 230, 160), "Y": (255, 210, 120), "D": (120, 70, 30)}
NIGHT = 0.4  # how dark the scene makes a sprite at night (scene.dimmedSprite); a lit one is drawn as it is

HUT = [
    "......Og.......",
    "....OOOOOOO....",
    "..OOhhhhhTTOO..",
    ".OhhTTTTTTTttO.",
    ".OttttttttttttO",
    "OhTTTTTTtTTTTtO",
    "OTTtTOOOOTTtTtO",
    "OttttODDDOttttO",
    "OhTTODDDDDOTTtO",
    "OTtTODDDDDOTttO",
    "OttODDDDDDDOttO",
    "OTTODDDDDDDOTtO",
    "OOOODDDDDDDOOOO",
]


def cabin():
    roof = []
    for i in range(10):
        row = ""
        for x in range(19):
            d = abs(x - 9)
            if d > i:
                row += "."
            elif d == i:
                row += "O"
            elif i % 3 == 0:
                row += "t"
            elif x - 9 == -(i - 1):
                row += "h"
            else:
                row += "t" if (x + i) % 5 == 0 else "T"
        roof.append(row)
    roof[9] = "O" + "t" * 17 + "O"
    return roof + [
        ".oWWWWWWWWWWWWWWWo.",
        ".owFFFFFFFwwoooowo.",
        ".oWFGGFGGFWoDDDDoo.",
        ".owFGLFGGFwoDDDDoo.",
        ".oWFFFFFFFWoDDDDoo.",
        ".owFGGFGGFwoDDDDoo.",
        ".oWFGGFGGFWoDDDDoo.",
        ".owFFFFFFFwoDDDDoo.",
        ".oWgrgygrgWoDDDDoo.",
    ]


def house():
    rows = []
    for i in range(13):
        row = ""
        for x in range(25):
            d = abs(x - 12)
            if 17 <= x <= 20 and i <= 6:  # chimney
                row += "s" if i == 0 or x in (17, 20) else ("s" if (x + i) % 3 == 0 else "S")
                continue
            if d > i:
                row += "."
            elif d == i:
                row += "E"
            elif 4 <= i <= 7 and d <= 2:  # round attic window
                row += "B" if d == 2 or i in (4, 7) else "Y"
            elif i % 2 == 0:
                row += "e"
            else:
                row += "q" if (x + i // 2) % 3 == 0 else "R"
        rows.append(row)
    rows[12] = "E" + "e" * 23 + "E"
    return rows + [
        ".BCCCCCBCCCCCCCCCBCCCCCB.",
        ".BCFFFFFBCCCBBBCCBFFFFFB.",
        ".BcFGGFFBCcBDDDBcBFGGFFB.",
        ".BCFGLFFBCBDDDDDBBFGLFFB.",
        ".BBBBBBBBBBDDDDDBBBBBBBB.",
        ".BCFFFFFBCBDDDDDBBFFFFFB.",
        ".BcFGGFFBcBDDDDDBBFGGFFB.",
        ".BCFFFFFBCBDDDDDBBFFFFFB.",
        ".BCgrgygBCBDDDDDBBgygrgB.",
        ".BBBBBBBBBBDDDDDBBBBBBBB.",
        ".BCCcCCCBCBDDDDDBBCCCcCB.",
        ".BBBBBBBBBBDDDDDBBBBBBBB.",
    ]


HOUSES = [HUT, cabin(), house()]


def shut(grid, step):
    """The door shut: the hut has none, the others a wooden one with a knob."""
    if step == 1:
        return grid
    rows = [r.replace("D", "d") for r in grid]
    knob = next(y for y, r in enumerate(rows) if "d" in r) + 4
    x = rows[knob].rindex("d")
    rows[knob] = rows[knob][:x] + "k" + rows[knob][x + 1:]
    return rows


def darkened(img, factor=NIGHT, keep=()):
    """The picture as dark as the scene makes it at night, apart from the pixels in `keep`."""
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and (x, y) not in keep:
                px[x, y] = (int(r * factor), int(g * factor), int(b * factor), a)
    return out


def lit_house(grid):
    """At night with the pet inside: as dark as the scene, but the windows (or the hut's doorway) glow."""
    img = to_image(grid, HOUSE_PALETTE | LIT)
    keep = {(x, y) for y, r in enumerate(grid) for x, ch in enumerate(r) if ch in LIT}
    return darkened(img, keep=keep)


class Canvas:
    """A picture drawn with rectangles and points, like the scene draws its landscapes."""

    def __init__(self, w=64, h=64):
        self.img = Image.new("RGBA", (w, h))
        self.px = self.img.load()

    def point(self, x, y, c):
        if 0 <= x < self.img.width and 0 <= y < self.img.height:
            self.px[x, y] = tuple(c) + (255,)

    def clear(self, x, y):
        if 0 <= x < self.img.width and 0 <= y < self.img.height:
            self.px[x, y] = (0, 0, 0, 0)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.point(x, y, c)

    def hline(self, x0, x1, y, c):
        self.rect(x0, y, x1, y, c)

    def ellipse(self, x0, y0, x1, y1, c):
        cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 0.5, (y1 - y0) / 2 + 0.5
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    self.point(x, y, c)

    def window(self, x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.clear(x, y)


FLOOR = 55  # the first row of the floor (scene.GROUND + 1)
# Where the bed is (the pet sleeps in the middle) and where the light is, per step
ROOM_LIGHT = {2: (6, 25), 3: (31, 14)}


def room(step):
    """The inside of the house; the window (or the doorway) stays transparent for the sky."""
    c = Canvas()
    if step == 1:
        # a dome of thatch, darker towards the edges; the round doorway on the left
        for y in range(FLOOR):
            band = (92, 66, 30) if y % 6 == 0 else (140, 104, 50) if y % 6 == 1 else (118, 86, 40)
            c.hline(0, 63, y, band)
            for x in range((y * 7) % 5, 64, 5):
                c.point(x, y, (132, 98, 46))
        for y in range(FLOOR):
            for x in range(64):
                if ((x - 32) / 34) ** 2 + ((y - 60) / 56) ** 2 > 1:
                    c.point(x, y, (70, 50, 26))
        x0, y0, x1 = 1, 30, 12
        for y in range(y0, FLOOR):
            cut = round(4 - (16 - (4 - (y - y0)) ** 2) ** 0.5) if y < y0 + 4 else 0
            for x in range(x0 + cut, x1 - cut + 1):
                c.clear(x, y)
            c.point(x0 + cut - 1, y, (90, 62, 30))
            c.point(x1 - cut + 1, y, (90, 62, 30))
        c.hline(x0 + 4, x1 - 4, y0 - 1, (90, 62, 30))
        # floor of packed earth, the grass outside the doorway
        c.rect(0, FLOOR, 63, 63, (92, 64, 40))
        c.hline(0, 63, FLOOR, (120, 86, 52))
        for x in range(3, 64, 6):
            c.point(x, 58 + x % 3, (76, 52, 32))
        c.hline(x0, x1, FLOOR, (70, 150, 60))
        # a bed of leaves
        c.ellipse(13, 49, 53, 58, (60, 115, 45))
        c.ellipse(15, 50, 51, 57, (80, 135, 55))
        for x in range(15, 52, 3):
            c.point(x, 50 + x % 4, (110, 160, 60))
    elif step == 2:
        # a wooden cabin: planks, a window with a cross, a shelf with a candle
        for x in range(64):
            plank = (150, 98, 58) if (x // 6) % 2 == 0 else (138, 88, 52)
            c.rect(x, 0, x, FLOOR - 1, (96, 60, 34) if x % 6 == 0 else plank)
        for x in range(2, 64, 6):
            c.point(x + 3, 20 + (x * 7) % 25, (96, 60, 34))
        c.rect(0, 7, 63, 9, (90, 56, 32))  # a beam
        x0, y0, x1, y1 = 40, 13, 58, 30
        c.rect(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (235, 214, 170))
        c.window(x0, y0, x1, y1)
        c.rect((x0 + x1) // 2, y0, (x0 + x1) // 2, y1, (235, 214, 170))
        c.hline(x0, x1, (y0 + y1) // 2, (235, 214, 170))
        c.rect(x0 - 2, y1 + 2, x1 + 2, y1 + 3, (200, 170, 120))  # sill
        c.rect(3, 30, 16, 31, (96, 60, 34))  # shelf
        c.rect(6, 26, 7, 29, (240, 230, 210))  # candle
        c.point(6, 25, (200, 150, 70))
        c.rect(11, 27, 14, 29, (90, 140, 190))  # a jar
        c.rect(0, FLOOR, 63, 63, (110, 70, 40))
        c.hline(0, 63, FLOOR, (150, 100, 60))
        for y in range(57, 64, 3):
            c.hline(0, 63, y, (90, 56, 32))
        # a straw mattress on a low frame
        c.rect(12, 49, 53, 54, (210, 180, 110))
        for x in range(13, 53, 3):
            c.point(x, 50 + x % 2, (180, 150, 80))
        c.rect(11, 54, 54, 55, (96, 60, 34))
        c.rect(10, 42, 12, 55, (96, 60, 34))
    else:
        # the whole house: wallpaper, a big window with curtains, a picture, a lamp, a rug, a bed
        for y in range(FLOOR):
            for x in range(64):
                col = (214, 196, 160)
                if x % 8 == 0:
                    col = (196, 176, 140)
                if x % 8 == 4 and y % 6 == 3:
                    col = (190, 110, 110)
                c.point(x, y, col)
        c.rect(0, 44, 63, 54, (150, 96, 60))  # wainscoting
        for x in range(0, 64, 5):
            c.rect(x, 44, x, 54, (120, 76, 46))
        c.hline(0, 63, 43, (110, 70, 40))
        x0, y0, x1, y1 = 41, 12, 57, 30
        c.rect(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (245, 235, 215))
        c.window(x0, y0, x1, y1)
        c.rect((x0 + x1) // 2, y0, (x0 + x1) // 2, y1, (245, 235, 215))
        c.hline(x0, x1, 21, (245, 235, 215))
        for cx0, cx1 in ((37, 40), (58, 61)):  # curtains
            c.rect(cx0, 10, cx1, 33, (180, 70, 80))
            for y in range(10, 34, 2):
                c.point(cx0 + 2, y, (150, 50, 62))
        c.rect(36, 9, 62, 9, (110, 70, 40))  # curtain rail
        # a picture of the hut it started in
        c.rect(6, 14, 18, 24, (110, 70, 40))
        c.rect(7, 15, 17, 23, (140, 190, 230))
        c.hline(7, 17, 23, (70, 150, 60))
        c.ellipse(9, 17, 15, 23, (196, 156, 72))
        c.rect(11, 20, 13, 23, (60, 40, 25))
        # a lamp hangs from the ceiling over the bed
        c.rect(31, 0, 31, 10, (90, 70, 50))
        for i, w in enumerate((1, 2, 3, 4)):
            c.hline(31 - w, 31 + w, 10 + i, (220, 180, 120))
        c.hline(28, 34, 14, (200, 150, 90))
        # a shelf on the wall (a spot for a decoration)
        c.rect(18, 30, 32, 31, (110, 70, 40))
        c.rect(0, FLOOR, 63, 63, (130, 84, 50))
        c.hline(0, 63, FLOOR, (160, 108, 66))
        for x in range(4, 64, 9):
            c.rect(x, 56, x, 63, (105, 66, 40))
        c.rect(14, 58, 50, 62, (120, 140, 180))  # rug
        c.hline(14, 50, 60, (200, 200, 220))
        # the bed: a headboard, a sheet and a pillow
        c.rect(10, 36, 14, 55, (110, 70, 40))
        c.ellipse(10, 33, 14, 38, (110, 70, 40))
        c.rect(51, 44, 54, 55, (110, 70, 40))
        c.rect(14, 49, 51, 53, (240, 236, 226))
        c.rect(14, 45, 22, 50, (250, 248, 240))
    return c.img


def lit_room(step):
    """The room at night, as dark as the scene makes it, with its light on and a warm glow around it."""
    img = darkened(room(step))
    if step not in ROOM_LIGHT:
        return None
    lx, ly = ROOM_LIGHT[step]
    px = img.load()
    radius = 14 if step == 2 else 24
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            d = ((x - lx) ** 2 + (y - ly) ** 2) ** 0.5 / radius
            if a and d < 1:
                f = 0.6 * (1 - d) ** 1.5
                px[x, y] = (min(255, int(r + 255 * 0.6 * f)), min(255, int(g + 200 * 0.5 * f)), min(255, int(b + 120 * 0.3 * f)), a)
    if step == 2:
        px[6, 25] = (255, 200, 90, 255)
        px[6, 24] = (255, 240, 160, 255)
    else:
        for i, w in enumerate((1, 2, 3, 4)):
            for x in range(31 - w, 32 + w):
                px[x, 10 + i] = (255, 225, 150, 255)
    return img


def blanket(step):
    c = Canvas(26, 7)
    if step == 2:
        c.rect(0, 1, 25, 6, (90, 130, 170))
        for x in range(1, 25, 4):
            c.rect(x, 1, x + 1, 6, (200, 200, 210))
        c.hline(0, 25, 0, (60, 95, 135))
    else:
        for y in range(1, 7):
            for x in range(26):
                c.point(x, y, (196, 78, 90) if (x // 3 + y // 3) % 2 == 0 else (240, 200, 120))
        c.hline(0, 25, 0, (150, 50, 62))
    return c.img


def house_sheet():
    tags = {}
    for step, grid in enumerate(HOUSES, 1):
        tags[f"house_{step}"] = [(to_image(shut(grid, step), HOUSE_PALETTE), 1000)]
        tags[f"house_{step}_open"] = [(to_image(grid, HOUSE_PALETTE), 1000)]
        tags[f"house_{step}_lit"] = [(lit_house(shut(grid, step)), 1000)]
        tags[f"room_{step}"] = [(room(step), 1000)]
        lit = lit_room(step)
        if lit:
            tags[f"room_{step}_lit"] = [(lit, 1000)]
        if step > 1:
            tags[f"blanket_{step}"] = [(blanket(step), 1000)]
    return tags


# ---------------------------------------------------------------- Output


def to_image(rows, palette, canvas=None):
    w, h = len(rows[0]), len(rows)
    for r in rows:
        assert len(r) == w, f"row has {len(r)} instead of {w} characters: {r!r}"
    img = Image.new("RGBA", (w, h))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                img.putpixel((x, y), palette[ch] + (255,))
    if canvas:
        # bottom center of the fixed frame
        framed = Image.new("RGBA", canvas)
        framed.paste(img, ((canvas[0] - w) // 2, canvas[1] - h))
        return framed
    return img


def write_sheet(name, tags, **extra_meta):
    """tags: {name: [(image, duration ms), ...]} → name.png + name.json (Aseprite json-array)."""
    entries = [(tag, img, ms) for tag, frames in tags.items() for img, ms in frames]
    width = sum(img.width for _, img, _ in entries)
    height = max(img.height for _, img, _ in entries)
    sheet = Image.new("RGBA", (width, height))
    frames, frame_tags, x = [], [], 0
    for i, (tag, img, ms) in enumerate(entries):
        sheet.paste(img, (x, 0))
        frames.append({"filename": f"{name} {tag} {i}", "frame": {"x": x, "y": 0, "w": img.width, "h": img.height},
                       "duration": ms})
        if not frame_tags or frame_tags[-1]["name"] != tag:
            frame_tags.append({"name": tag, "from": i, "to": i, "direction": "forward"})
        frame_tags[-1]["to"] = i
        x += img.width
    OUT.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT / f"{name}.png", optimize=True)
    meta = {"app": "tools/build_blob_sprites.py", "image": f"{name}.png",
            "size": {"w": width, "h": height}, "frameTags": frame_tags, **extra_meta}
    (OUT / f"{name}.json").write_text(json.dumps({"frames": frames, "meta": meta}, indent=1) + "\n",
                                      newline="\n")  # Unix line endings, on Windows too
    print(f"{name}.png: {len(frames)} frames, {len(frame_tags)} tags")


def body_sheet(tags, palette):
    """Poses of a body, each frame on the fixed canvas."""
    return {tag: [(to_image(g, palette, (CANVAS, CANVAS)), ms) for g, ms in frames] for tag, frames in tags.items()}


def face_sheet(grid, palette, faces=FACES):
    """Every face (FACES, or a form's own list with the same names), drawn by `grid`."""
    return {name: [(to_image(grid(*spec), palette), 1000)] for name, spec in faces.items()}


def main():
    write_sheet("blob_body", body_sheet(BODY_TAGS, BODY_PALETTE))
    write_sheet("blob_faces", face_sheet(face_grid, FACE_PALETTE))
    write_sheet("blob_adult_body", body_sheet(ADULT_TAGS, BODY_PALETTE))
    write_sheet("sneezle_body", body_sheet(SNEEZLE_TAGS, SNEEZLE_PALETTE),
                faceTop=SNEEZLE_FACE_TOP, faceCenter="bottom")
    for name, tags, palette, face_top in (("flicker", FLICKER_TAGS, FLICKER_PALETTE, FLICKER_FACE_TOP),
                                          ("cyclopuff", CYCLOPUFF_TAGS, CYCLOPUFF_PALETTE, CYCLOPUFF_FACE_TOP),
                                          ("grumpcap", GRUMPCAP_TAGS, GRUMPCAP_PALETTE, GRUMPCAP_FACE_TOP),
                                          ("lumoth", LUMOTH_TAGS, LUMOTH_PALETTE, LUMOTH_FACE_TOP),
                                          ("lanternling", LANTERNLING_TAGS, EMBER_PALETTE, LANTERNLING_FACE_TOP),
                                          ("flarelet", FLARELET_TAGS, EMBER_PALETTE, FLARELET_FACE_TOP),
                                          ("glimmerock", GLIMMEROCK_TAGS, STONE_PALETTE, GLIMMEROCK_FACE_TOP),
                                          ("bouldergrin", BOULDERGRIN_TAGS, STONE_PALETTE, BOULDERGRIN_FACE_TOP)):
        write_sheet(f"{name}_body", body_sheet(tags, palette), faceTop=face_top)
    # the stick and the tail stick out to the side: the face is centered on the feet
    for name, tags, face_top in (("roamtail", ROAMTAIL_TAGS, ROAMTAIL_FACE_TOP),
                                 ("filchfox", FILCHFOX_TAGS, FILCHFOX_FACE_TOP)):
        write_sheet(f"{name}_body", body_sheet(tags, FOX_PALETTE), faceTop=face_top, faceCenter="bottom")
    write_sheet("roamtail_faces", face_sheet(roamtail_face_grid, FOX_ADULT_FACE_PALETTE, ROAMTAIL_FACES))
    write_sheet("filchfox_faces", face_sheet(filchfox_face_grid, FOX_ADULT_FACE_PALETTE, FILCHFOX_FACES))
    write_sheet("bouldergrin_faces", face_sheet(bouldergrin_face_grid, BOULDERGRIN_FACE_PALETTE, BOULDERGRIN_FACES))
    write_sheet("glimmerock_faces", face_sheet(glimmerock_face_grid, GLIMMEROCK_FACE_PALETTE, GLIMMEROCK_FACES))
    write_sheet("lanternling_faces", face_sheet(lanternling_face_grid, DARK_FACE_PALETTE, LANTERNLING_FACES))
    write_sheet("flarelet_faces", face_sheet(flarelet_face_grid, DARK_FACE_PALETTE, FLARELET_FACES))
    write_sheet("flicker_faces", face_sheet(flicker_face_grid, FLICKER_FACE_PALETTE, FLICKER_FACES))
    write_sheet("lumoth_faces", face_sheet(lumoth_face_grid, DARK_FACE_PALETTE, LUMOTH_FACES))
    write_sheet("angloop_body", body_sheet(ANGLOOP_TAGS, ANGLOOP_PALETTE),
                faceTop=ANGLOOP_FACE_TOP, faceCenter="bottom")  # its raised fin sticks out to the side
    write_sheet("angloop_faces", face_sheet(angloop_face_grid, ANGLOOP_FACE_PALETTE, ANGLOOP_FACES))
    write_sheet("purrloop_body", body_sheet(PURRLOOP_TAGS, PURRLOOP_PALETTE), faceTop=PURRLOOP_FACE_TOP)
    write_sheet("purrloop_faces", face_sheet(purrloop_face_grid, PURRLOOP_FACE_PALETTE, PURRLOOP_FACES))
    write_sheet("gemperor_body", body_sheet(GEMPEROR_TAGS, GEMPEROR_PALETTE),
                faceTop=GEMPEROR_FACE_TOP, faceCenter="bottom")  # its raised fist sticks out to the side
    write_sheet("gemperor_faces", face_sheet(gemperor_face_grid, GEMPEROR_FACE_PALETTE, GEMPEROR_FACES))
    write_sheet("sneezle_faces", face_sheet(sneezle_face_grid, SNEEZLE_FACE_PALETTE, SNEEZLE_FACES))
    write_sheet("grumpcap_faces", face_sheet(grumpcap_face_grid, GRUMPCAP_FACE_PALETTE, GRUMPCAP_FACES))
    write_sheet("cyclopuff_faces", face_sheet(cyclops_face_grid, CYCLOPUFF_FACE_PALETTE, CYCLOPUFF_FACES))
    write_sheet("blob_baby_body", body_sheet(BABY_TAGS, BODY_PALETTE))
    write_sheet("blob_baby_faces", face_sheet(baby_face_grid, FACE_PALETTE))
    write_sheet("ember_baby_body", body_sheet(EMBER_BABY_TAGS, EMBER_PALETTE))
    write_sheet("cindlet_body", body_sheet(CINDLET_TAGS, EMBER_PALETTE))
    write_sheet("ember_faces", face_sheet(face_grid, EMBER_FACE_PALETTE))
    write_sheet("ember_baby_faces", face_sheet(baby_face_grid, EMBER_FACE_PALETTE))
    write_sheet("stone_baby_body", body_sheet(STONE_BABY_TAGS, STONE_PALETTE))
    write_sheet("pebblet_body", body_sheet(PEBBLET_TAGS, STONE_PALETTE), faceTop=PEBBLET_FACE_TOP,
                faceCenter="bottom")
    write_sheet("stone_faces", face_sheet(face_grid, STONE_FACE_PALETTE))
    write_sheet("stone_baby_faces", face_sheet(baby_face_grid, STONE_FACE_PALETTE))
    write_sheet("fox_baby_body", body_sheet(FOX_BABY_TAGS, FOX_PALETTE))
    write_sheet("kitlet_body", body_sheet(KITLET_TAGS, FOX_PALETTE), faceTop=KITLET_FACE_TOP,
                faceCenter="left")  # on the body, not between it and the tail
    write_sheet("fox_faces", face_sheet(fox_face_grid, FOX_FACE_PALETTE))
    write_sheet("fox_baby_faces", face_sheet(baby_face_grid, FOX_BABY_FACE_PALETTE))
    write_sheet("cloud_baby_body", body_sheet(CLOUD_BABY_TAGS, CLOUD_PALETTE))
    write_sheet("nimbit_body", body_sheet(NIMBIT_TAGS, CLOUD_PALETTE), faceTop=NIMBIT_FACE_TOP)
    write_sheet("cloud_faces", face_sheet(face_grid, CLOUD_FACE_PALETTE))
    write_sheet("cloud_baby_faces", face_sheet(baby_face_grid, CLOUD_FACE_PALETTE))
    write_sheet("rumblefluff_body", body_sheet(RUMBLEFLUFF_TAGS, RUMBLEFLUFF_PALETTE), faceTop=RUMBLEFLUFF_FACE_TOP,
                faceShift=RUMBLEFLUFF_FACE_SHIFT)
    write_sheet("rumblefluff_faces", face_sheet(rumblefluff_face_grid, RUMBLEFLUFF_FACE_PALETTE, RUMBLEFLUFF_FACES))
    write_sheet("prismist_body", body_sheet(PRISMIST_TAGS, PRISMIST_PALETTE), faceTop=PRISMIST_FACE_TOP,
                faceShift=PRISMIST_FACE_SHIFT)
    write_sheet("prismist_faces", face_sheet(prismist_face_grid, PRISMIST_FACE_PALETTE, PRISMIST_FACES))
    for line, palette, face_palette, baby_tags, child, child_tags, child_faces in (
            ("leaf", LEAF_PALETTE, LEAF_FACE_PALETTE, LEAF_BABY_TAGS, "sproutlet", SPROUTLET_TAGS, face_grid),
            ("duck", DUCK_PALETTE, DUCK_FACE_PALETTE, DUCK_BABY_TAGS, "paddlet", PADDLET_TAGS, duck_face_grid),
            ("hippo", HIPPO_PALETTE, HIPPO_FACE_PALETTE, HIPPO_BABY_TAGS, "soakling", SOAKLING_TAGS, face_grid),
            ("beak", BEAK_PALETTE, BEAK_FACE_PALETTE, BEAK_BABY_TAGS, "crestling", CRESTLING_TAGS, beak_face_grid)):
        write_sheet(f"{line}_baby_body", body_sheet(baby_tags, palette))
        write_sheet(f"{line}_baby_faces", face_sheet(baby_face_grid, face_palette))
        name = child.upper()
        write_sheet(f"{child}_body", body_sheet(child_tags, palette), faceTop=globals()[f"{name}_FACE_TOP"],
                    faceShift=globals()[f"{name}_FACE_SHIFT"])
        write_sheet(f"{line}_faces", face_sheet(child_faces, face_palette))
    for name, palette, faces in (("twiggle", LEAF_ADULT_PALETTE, TWIGGLE_FACES),
                                 ("needlenub", LEAF_ADULT_PALETTE, NEEDLENUB_FACES),
                                 ("drakwing", DUCK_ADULT_PALETTE, BEAKED_FACES),
                                 ("quill", DUCK_ADULT_PALETTE, BEAKED_FACES),
                                 ("steamo", HIPPO_ADULT_PALETTE, STEAMO_FACES),
                                 ("lillypot", HIPPO_ADULT_PALETTE, FACES),
                                 ("rapierre", BEAK_ADULT_PALETTE, BEAKED_FACES),
                                 ("parcelbeak", BEAK_ADULT_PALETTE, BEAKED_FACES)):
        upper = name.upper()
        write_sheet(f"{name}_body", body_sheet(globals()[f"{upper}_TAGS"], palette),
                    faceTop=globals()[f"{upper}_FACE_TOP"], faceShift=globals()[f"{upper}_FACE_SHIFT"])
        write_sheet(f"{name}_faces", face_sheet(globals()[f"{name}_face_grid"], globals()[f"{upper}_FACE_PALETTE"],
                                                faces))
    for name, faces in SPECIAL_FORMS:
        upper = name.upper()
        write_sheet(f"{name}_body", body_sheet(globals()[f"{upper}_TAGS"], globals()[f"{upper}_PALETTE"]),
                    faceTop=globals()[f"{upper}_FACE_TOP"], faceShift=globals()[f"{upper}_FACE_SHIFT"])
        write_sheet(f"{name}_faces", face_sheet(globals()[f"{name}_face_grid"], globals()[f"{upper}_FACE_PALETTE"],
                                                faces))
    for line, child, baby_faces, child_faces in GARDEN_LINES:
        upper, name = line.upper(), child.upper()
        palette, face_palette = globals()[f"{upper}_PALETTE"], globals()[f"{upper}_FACE_PALETTE"]
        write_sheet(f"{line}_baby_body", body_sheet(globals()[f"{upper}_BABY_TAGS"], palette))
        write_sheet(f"{line}_baby_faces", face_sheet(baby_faces, face_palette))
        write_sheet(f"{child}_body", body_sheet(globals()[f"{name}_TAGS"], palette), faceTop=globals()[f"{name}_FACE_TOP"],
                    faceShift=globals()[f"{name}_FACE_SHIFT"])
        write_sheet(f"{line}_faces", face_sheet(child_faces, face_palette))
    for name, faces in GARDEN_FORMS:
        upper = name.upper()
        write_sheet(f"{name}_body", body_sheet(globals()[f"{upper}_TAGS"], globals()[f"{upper}_PALETTE"]),
                    faceTop=globals()[f"{upper}_FACE_TOP"], faceShift=globals()[f"{upper}_FACE_SHIFT"])
        write_sheet(f"{name}_faces", face_sheet(globals()[f"{name}_face_grid"], globals()[f"{upper}_FACE_PALETTE"],
                                                faces))
    for line, child in WATER_LINES + GRANDMA_LINES:
        upper, name = line.upper(), child.upper()
        palette, face_palette = globals()[f"{upper}_PALETTE"], globals()[f"{upper}_FACE_PALETTE"]
        write_sheet(f"{line}_baby_body", body_sheet(globals()[f"{upper}_BABY_TAGS"], palette),
                    faceTop=globals()[f"{upper}_BABY_FACE_TOP"], faceShift=globals()[f"{upper}_BABY_FACE_SHIFT"])
        write_sheet(f"{line}_baby_faces", face_sheet(baby_face_grid, face_palette))
        write_sheet(f"{child}_body", body_sheet(globals()[f"{name}_TAGS"], palette), faceTop=globals()[f"{name}_FACE_TOP"],
                    faceShift=globals()[f"{name}_FACE_SHIFT"])
        write_sheet(f"{line}_faces", face_sheet(face_grid, face_palette))
    for line, child, baby_faces, child_faces in ADVENTURE_LINES + FESTIVAL_LINES + COAST_LINES:
        upper, name = line.upper(), child.upper()
        palette, face_palette = globals()[f"{upper}_PALETTE"], globals()[f"{upper}_FACE_PALETTE"]
        write_sheet(f"{line}_baby_body", body_sheet(globals()[f"{upper}_BABY_TAGS"],
                                                    globals().get(f"{upper}_BABY_PALETTE", palette)),
                    faceTop=globals()[f"{upper}_BABY_FACE_TOP"], faceShift=globals()[f"{upper}_BABY_FACE_SHIFT"])
        write_sheet(f"{line}_baby_faces", face_sheet(baby_faces, face_palette))
        write_sheet(f"{child}_body", body_sheet(globals()[f"{name}_TAGS"], palette), faceTop=globals()[f"{name}_FACE_TOP"],
                    faceShift=globals()[f"{name}_FACE_SHIFT"])
        write_sheet(f"{line}_faces", face_sheet(child_faces, face_palette))
    for name, faces in WATER_FORMS + GRANDMA_FORMS + ADVENTURE_FORMS + FESTIVAL_FORMS + COAST_FORMS:
        upper = name.upper()
        write_sheet(f"{name}_body", body_sheet(globals()[f"{upper}_TAGS"], globals()[f"{upper}_PALETTE"]),
                    faceTop=globals()[f"{upper}_FACE_TOP"], faceShift=globals()[f"{upper}_FACE_SHIFT"])
        write_sheet(f"{name}_faces", face_sheet(globals()[f"{name}_face_grid"], globals()[f"{upper}_FACE_PALETTE"],
                                                faces))
    items = {name: [(to_image(rows, ITEM_PALETTE), 1000)] for name, rows in ITEMS.items()}
    items |= {tag: [(to_image(g, ITEM_PALETTE), ms) for g, ms in frames] for tag, frames in EGG_TAGS.items()}
    for line, palette in RARE_EGG_PALETTES.items():
        items |= {f"{line}_{tag}": [(to_image(g, palette), ms) for g, ms in frames]
                  for tag, frames in egg_tags(EGG_GRIDS.get(line, EGG)).items()}
    write_sheet("items", items)
    trip = {tag: [(to_image(g, TRIP_PALETTE), ms) for g, ms in frames]
            for tag, frames in (TRIP_TAGS | FOE_TAGS).items()}
    # the eggs as finds, and as they lie in the nest
    trip |= {f"egg_{line}": [(to_image(EGG_GRIDS.get(line, EGG), palette), 1000)]
             for line, palette in ({"blob": ITEM_PALETTE} | RARE_EGG_PALETTES).items()}
    write_sheet("trip", trip)
    write_sheet("house", house_sheet())


if __name__ == "__main__":
    main()
