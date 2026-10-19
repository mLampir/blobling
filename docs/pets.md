# The pets

Every pet starts as an egg and grows up into one of several adult forms. Which
one depends on how you look after it.

Finding that out by yourself is part of the fun, so everything that would give
it away is folded shut on this page. Open only what you want to know.

## Growing up

| | Stage | Lasts |
|---|---|---|
| ![Egg](images/pets/egg.png) | **Egg** – keep it warm by petting it | up to 1 hour |
| ![Baby](images/pets/baby.png) | **Baby** – a small slime with a sprout | 3 days |
| ![Child](images/pets/child.png) | **Child** – the sprout has grown into a lure with a glowing bulb | 7 days |
| ![Angloop](images/pets/angloop.png) | **Adult** – one of three forms; this one is Angloop | forever |

What the stages mean for the game is in [gameplay.md](gameplay.md#growing-up).

## The adult forms

There are three, and every one of them is still a slime, only grown. The first
one is shown here, so that you know what an adult can look like; the others
are hidden. Each has a line that says roughly what kind of care leads to it.

### Form 1: Angloop

*What a pet becomes when nothing else fits.*

![Angloop](images/pets/angloop.png)

The child grown up, with its lure turned into a real anglerfish's: it arcs
over its head, and the bulb hangs in front of its brow as a light that swings
when it breathes and glows at night. Its sides have grown into fins it uses as
arms, and bubbles float in its jelly. It has the child's round eyes and a wide
grin with two little fangs, and that big mouth makes it a little hungrier.

<details>
<summary>Show how to get it</summary>

None of the other rules matched: the care was fine, but not outstanding, or
not even that.

</details>

### Form 2

*The reward for looking after it really well.*

<details>
<summary>Show this form</summary>

![Gemperor](images/pets/gemperor.png)

**Gemperor**, the slime grown into a king. The jelly on its back has hardened
into a crown of crystals, one of them broken off, and the bulb of the lure has
sunk into its belly, where it glows as its core. One crystal fist is planted
on the ground, the other raised, and it looks out from under brave brows. It
rarely gets sick. At night its crystals and its core glow.

</details>

<details>
<summary>Show how to get it</summary>

The child was well cared for at least 85 % of the time.

</details>

### Form 3 (secret)

*It is about affection.*

<details>
<summary>Show this form</summary>

![Purrloop](images/pets/purrloop.png)

**Purrloop**, a cat of jelly: ears of jelly (one folded over at the tip), a
heart where the bulb was, whiskers and two little paws that knead. Its amber
cat eyes mostly give you the slow, content blink of a cat that loves you.
Hearts mean more to it, and it stays clean longer.

</details>

<details>
<summary>Show how to get it</summary>

The child was petted at least 8 times a day.

</details>

## Reading the lure

<details>
<summary>Show what the bulb on the child's lure tells you</summary>

From its second day on, the bulb takes the color of the form the child is
heading for right now. It changes as soon as the care points somewhere else.

| Bulb | Heading for |
|---|---|
| pale yellow | nothing yet (the first day) |
| warm gold | Angloop |
| lilac | Gemperor |
| pink | Purrloop |

</details>

## How the game decides

<details>
<summary>Show the exact rules</summary>

During the child stage the pet keeps a care diary: how many minutes it was
well cared for, and how often it was played with and petted. When it grows up,
the first rule in this order that matches decides the form:

| Order | Form | Rule |
|---|---|---|
| 1 | Purrloop | petted at least 8 times a day |
| 2 | Gemperor | well cared for at least 85 % of the time |
| 3 | Angloop | everything else |

The values are in `core/src/life.ts`.

</details>

## The slime's first forms

<details>
<summary>Show the forms the slime used to grow into</summary>

Until the slime was redrawn, it had five adult forms of its own. They don't
grow out of a slime any more, but they still live in the wild and may come to
visit as friends. A pet that grew into one of them before the change turns
into its new form the first time it is loaded after it:

| Before | Now |
|---|---|
| ![Sneezle](images/pets/sneezle.png) Sneezle, a teapot dragon | Gemperor |
| ![Lumoth](images/pets/lumoth.png) Lumoth, a cuddly moth | Purrloop |
| ![Cyclopuff](images/pets/cyclopuff.png) Cyclopuff, a one-eyed ram calf | Angloop |
| ![Grumpcap](images/pets/grumpcap.png) Grumpcap, a grumpy toad under a toadstool | Angloop |
| ![Flicker](images/pets/flicker.png) Flicker, a candle of melted slime | Angloop |

The album has no slot for them, unless one of the pets has been one: then it
keeps its place there.

</details>

## Rare eggs

Not every egg is a slime's. A pet can bring a rare egg home from a trip, and
what hatches from it grows up in its own way: another baby, another child,
other adults, and another rule for which adult it becomes.

<details>
<summary>Show where a rare egg comes from</summary>

The guardian of the cave has been sitting on the **ember egg**. It leaves the
egg behind the first time a pet gets past it, so every pet can earn it once.
After unpacking, the egg is among the finds and stays there, from one pet to
the next, until you tap **brood** next to it.

</details>

## Eggs of its own

An adult that has made friends with a wild pet lays an egg with it
([gameplay.md](gameplay.md#friends) has the rules). That egg is of the pet's
own line or of its friend's, half of the time each.

<details>
<summary>Show which wild pets live where</summary>

Wild slimes live in the meadow, in all five adult forms. Cyclopuff is the one
a pet meets most often, Lumoth the rarest, and Grumpcap only comes out in the
rain.

At the stream live the two adults of the stone line (below): Bouldergrin, and
more rarely Glimmerock. A friend of theirs is the only way to a stone egg.

The forest, the cave and the mountain have no wild pets so far. The ember line
has none: its egg comes from a guardian. An ember pet with a slime for a
friend can still lay an ember egg, though.

The values are in `core/src/wild.ts`.

</details>

### The ember line

<details>
<summary>Show the ember line</summary>

| | Stage |
|---|---|
| ![Ember egg](images/pets/ember_egg.png) | **Ember egg** – a cooled crust with spots that glow |
| ![Ember baby](images/pets/ember_baby.png) | **Baby** – a small ember with a spark on top |
| ![Cindlet](images/pets/cindlet.png) | **Child: Cindlet** – an ember slime with glowing cracks and eyes, and a flame for a curl |

The stages last as long as the slime's. What the adults keep is the flame.
With a fire of its own, nothing of this line ever shivers on a cold morning.

![Lanternling](images/pets/lanternling.png)

**Lanternling**, a flame that has moved into a lantern. It is snug in there:
its mood drops more slowly, it gets sick less often, and in the rain it needs
no umbrella. Its face is calm, with soft round eyes and rosy cheeks. Asleep,
it burns low.

![Flarelet](images/pets/flarelet.png)

**Flarelet**, a flame that has burst out of its crust and burns in the open;
what is left of the crust is the bowl it sits in. It burns through its food
and hardly gets tired, and it throws sparks. It looks eager: wide eyes under
brows that flick up, and a big grin with a fang.

</details>

<details>
<summary>Show how to get them</summary>

Only playing counts for this line (training and the guessing game are playing,
too):

| Form | Rule |
|---|---|
| Flarelet | the child was played with at least 3 times a day |
| Lanternling | everything else |

From its second day on, the flame on Cindlet's head shows where it is heading:

| Flame | Heading for |
|---|---|
| red and orange | nothing yet (the first day) |
| blue | Lanternling |
| white-hot | Flarelet |

The values are in `core/src/life.ts`.

</details>

### The stone line

<details>
<summary>Show the stone line</summary>

| | Stage |
|---|---|
| ![Stone egg](images/pets/stone_egg.png) | **Stone egg** – a river pebble with specks of quartz |
| ![Stone baby](images/pets/stone_baby.png) | **Baby** – a small pebble with a speck of quartz on top |
| ![Pebblet](images/pets/pebblet.png) | **Child: Pebblet** – a river pebble on two stubby feet, with a white quartz band around its middle and a chipped corner that shows the lighter stone inside |

The stages last as long as the slime's. What the adults keep is the quartz
band. Pebblet does the flip in its own way: it skips like a flat stone across
water.

![Glimmerock](images/pets/glimmerock.png)

**Glimmerock**, a boulder on stubby stone feet whose quartz band has grown
into a crown of crystals, worn a little askew. It is polished and knows it:
one fist on its hip, it looks out from under half-shut lids with a smug
little smile, and there is a glint of crystal in its eyes. It stays clean
longer, and petting means more to it. It walks slow and heavy, its spin is a
show in which its crystals flash, and at night they light up from inside.

![Bouldergrin](images/pets/bouldergrin.png)

**Bouldergrin**, a cairn that came alive. The middle stone still wears the
band and a wide, toothy grin; the stones at the bottom are its feet, two
pebbles are its fists, and the little stone on top wears a cap of moss. It
eats a lot, and its mood drops more slowly. It sways, but it never falls
over. For its flip it tosses its top stone, which turns over in the air and
lands back on top.

</details>

<details>
<summary>Show how to get them</summary>

Only petting counts for this line: petting polishes the pebble.

| Form | Rule |
|---|---|
| Glimmerock | the child was petted at least 5 times a day |
| Bouldergrin | everything else |

From its second day on, the quartz band of Pebblet shows where it is heading:

| Band | Heading for |
|---|---|
| white | nothing yet (the first day) |
| lilac, like crystal | Glimmerock |
| sunny yellow | Bouldergrin |

The values are in `core/src/life.ts`.

</details>

More lines are ideas so far; the [issues](https://github.com/mLampir/blobling/issues) collect them.
