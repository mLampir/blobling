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
- items                            – eggs, bowl, food, poop, ball, umbrella, clouds, medicine
- trip                             – backpack, plants, decorations, hats, things along the path,
                                     opponents and guardians

The pixels are written out below as text: one character per pixel, "." is
transparent, and the letters are defined in the palettes. This script is the
only source of the sheets: change the pixels here and run it again, don't
edit the generated PNG and JSON files.

Rules for the LED panel: no black outlines (black doesn't light up), no dark
grays, white only for highlights. How a new creature is designed, and where it
goes in the code: *Designing a creature* in docs/gameplay.md.
"""

import json
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
    }


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
    }



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


EGG_CRACKED = crack(EGG)
EGG_OPEN = EGG_CRACKED[:7] + ["." * len(EGG[0])] + EGG_CRACKED[7:]  # the lid lifts
EGG_TAGS = {
    "egg": [(EGG, 1000)],
    "egg_wobble": [(lean(EGG, -1), 150), (EGG, 150), (lean(EGG, 1), 150), (EGG, 150)],
    "egg_crack": [(EGG_CRACKED, 1000)],
    "egg_open": [(EGG_OPEN, 1000)],
}
# Rare eggs are the same egg in other colors: "<line>_egg", "<line>_egg_wobble", ...
# The ember egg is a cooled crust with spots that glow.
RARE_EGG_PALETTES = {
    "ember": {"o": (95, 22, 14), "e": (160, 45, 30), "E": (120, 30, 20), "h": (195, 70, 40), "t": (255, 190, 50),
              "x": (255, 240, 170)},
    # The stone egg is a river pebble with specks of quartz.
    "stone": {"o": (70, 82, 108), "e": (170, 182, 202), "E": (125, 138, 162), "h": (225, 232, 245),
              "t": (250, 244, 222), "x": (90, 100, 125)},
}
ITEMS = {
    "bowl": ["BBBBBBBBBBB", ".bbbbbbbbD.", "..bbbbbbD..", "...DDDDD..."],
    "food_full": ["...fffff...", "..fffffFf..", ".fffffffFf."],
    "food_half": ["...........", "....fff....", "..ffffFf..."],
    "food_low": ["...........", "...........", "...ff.f...."],
    "poop": ["....p...", "...pP...", "..pPPq..", ".pPPPPq.", "pPPPPPPq", ".qqqqqq."],
    "ball": [".aaa.", "asaaa", "aaaaA", "aaaAA", ".AAA."],
    "umbrella": [".....uuuuu.....", "...uuwuuuwuu...", "..uwuuuuuuuwu..", ".uuuuuuuuuuuuu.",
                 "UU.UU.UkU.UU.UU", ".......k.......", ".......k.......", ".......k......."],
    "cloud": ["....ccc......", "..cccccccc...", ".ccccccccccc.", "ccccccccccccc", ".CCCCCCCCCCC."],
    "cloud_small": ["..ccc...", ".cccccc.", "cccccccc", ".CCCCCC."],
    "cookie": [".KKKKK.", "KKnKKKj", "KKKKnKj", "KnKKKKj", "KKKKnjj", ".jjjjj."],
    "icecream": [".iii.", "iiiiI", "iiiII", "zZzZz", ".zZz.", ".zzZ.", "..z..", "..Z.."],
    "fruit": ["...g..", "..g...", ".RRRR.", "RWRRRQ", "RRRRRQ", "RRRRQQ", ".RQQQ."],
    "medicine": [".hhh.", ".hhh.", "RRRRR", "RRhRR", "RhhhR", "RRhRR", "QQQQQ"],  # thrown from the app
    "sponge": ["L.....L.", ".L.YYYYY", "YYYYOYYY", "YOYYYYOY", "YYYOYYYY", "OOOOOOOO"],  # the app's, for cleaning
    "baton": ["......Y.", ".....YYY", "....h.Y.", "...h....", "..h.....", ".nn.....", "nn......"],  # the app's, for tricks
}

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
SUNFLOWER = [
    ".........",
    "...lgl...",
    "..lgggl..",
    "..ggGgg..",
    "...gGg...",
    "....G....",
    "..l.G....",
    ".lggG....",
    "..ggG.l..",
    "....Gggl.",
    "....Ggg..",
    "....G....",
    "....G....",
    "....G....",
]
SUNFLOWER_RIPE = ["..yy.yy..", ".yyTTTyy.", ".yTTtTTy.", ".yyTTTyy.", "..yyGyy.."] + SUNFLOWER[5:]
CHERRY = [
    "...lggl....",
    "..lgggggl..",
    ".lgggggggl.",
    "lgggGggggg.",
    "ggggggGgggg",
    "gGggggggggG",
    ".ggggGgggG.",
    "..GGggGGG..",
    "....tT.....",
    "....tT.....",
    "....tT.....",
    "....tT.....",
    "...ttTT....",
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
TRIP_TAGS = {
    "backpack": [([".TT.TT.", ".ooooo.", "ooooooo", "oYYYYYo", "ooTTToo", "ooooooo", ".OOOOO."], 1000)],
    "seed": [(["..l.", ".tt.", "tTTt", ".tt."], 1000)],
    # woven twigs and straw; the egg sits in it (scene.NEST_X)
    "nest": [(["t..............t", "TtdTtdtDdtdTtdtT", ".TdtDdtTDtdDtdT.", "..TTtTTtTtTTtT.."], 1000)],
    # a friend's gift, wrapped, until it is unwrapped (scene.GIFT_X); then what was in it, held up
    "gift": [(["..y.y..", "...Y...", "rrryrrr", "yyyyyyy", "rrryrrr", "RRRyRRR"], 1000)],
    "fruit_berry": [(["..l.", ".vv.", "vvVv", ".vV."], 1000)],
    "fruit_cherry": [(["..G..", ".G.G.", "rr.rr", "rR.rR"], 1000)],
    "fruit_sunflower": [([".yy.", "yOOy", "yOOy", ".yy."], 1000)],
    "fruit_herb": [([".w.", "wyw", ".w.", ".g."], 1000)],
    # Plant: sprout, young plant, then per kind without and with a ripe fruit
    "sprout": [(["l...l", "gl.lg", ".ggg.", "..g..", "..G.."], 1000)],
    "young": [(["..lgl..", ".lgggl.", "lggGggl", ".ggGgg.", "..gGg..", "...G...", "..gGg..", "...G..."], 1000)],
    "berry": [(BERRY, 1000)],
    "berry_ripe": [(dots(BERRY, {(6, 3): "v", (7, 3): "v", (6, 4): "v", (7, 4): "V", (5, 4): "V"}), 1000)],
    "sunflower": [(SUNFLOWER, 1000)],
    "sunflower_ripe": [(SUNFLOWER_RIPE, 1000)],
    "cherry": [(CHERRY, 1000)],
    "cherry_ripe": [(dots(CHERRY, {(2, 5): "r", (3, 5): "r", (2, 6): "r", (3, 6): "R",
                                   (7, 6): "r", (8, 6): "r", (7, 7): "r", (8, 7): "R"}), 1000)],
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
    # Hats: the bottom two rows sit on the head
    "hat_daisy": [([".w...p...w.", "wywgpypgwyw"], 1000)],
    "hat_leaf": [(["....lg.", "..lggg.", ".lgGgg.", "...G..."], 1000)],
    "hat_cap": [(["...rrrrrr...", ".rrwrrrrwrr.", "rrrrrwrrrrrr", "rwrrrrrrrwrr", ".RRRRRRRRRR."], 1000)],
    "hat_bobble": [(["....ww....", "....ww....", "...bbbb...", "..bbbbbb..", ".bBbBbBbB.", ".bbbbbbbb.",
                     "wwwwwwwwww"], 1000)],
    "hat_lily": [(["...p.p.p...", "...ppypp...", ".GGgpppgGG.", "GggggggggGg"], 1000)],
    "hat_batears": [(["v.........v", "vv.......vv", "vpv.....vpv", "vpv.....vpv", "VvV.....VvV"], 1000)],
    "hat_edelweiss": [(["..w.w.w..", ".wwwywww.", "..wyyyw..", ".wwwywww.", "..w.g.w.."], 1000)],
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
    items = {name: [(to_image(rows, ITEM_PALETTE), 1000)] for name, rows in ITEMS.items()}
    items |= {tag: [(to_image(g, ITEM_PALETTE), ms) for g, ms in frames] for tag, frames in EGG_TAGS.items()}
    for line, palette in RARE_EGG_PALETTES.items():
        items |= {f"{line}_{tag}": [(to_image(g, palette), ms) for g, ms in frames]
                  for tag, frames in EGG_TAGS.items()}
    write_sheet("items", items)
    trip = {tag: [(to_image(g, TRIP_PALETTE), ms) for g, ms in frames]
            for tag, frames in (TRIP_TAGS | FOE_TAGS).items()}
    # the eggs as finds, and as they lie in the nest
    trip |= {f"egg_{line}": [(to_image(EGG, palette), 1000)]
             for line, palette in ({"blob": ITEM_PALETTE} | RARE_EGG_PALETTES).items()}
    write_sheet("trip", trip)


if __name__ == "__main__":
    main()
