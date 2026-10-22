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
| ![Child](images/pets/child.png) | **Child: Bloblet** – the sprout has grown into a lure with a glowing bulb | 7 days |
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
For its bow it casts out its lure, lets the bulb dangle and flash, and snaps; in a scuffle its special move is a swarm of little lights like its bulb.

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
A king doesn't somersault: for its flip it leaps up and lands so hard that crystals shoot up out of the ground, and crystal shards are its special move.

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
Its bow is a cat's stretch, front down with a yawn, and its special move leaves paw prints.

</details>

<details>
<summary>Show how to get it</summary>

The child was petted 56 times in its week (8 a day).

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
well cared for, and how often it was played with and petted. A number "a day"
is a total for the whole child stage: a day away is made up on the others, and
with the ember stone (a shorter stage) the total is smaller. Until then the
lure shows whether the child is on its way. When it grows up, the first rule in
this order that matches decides the form:

| Order | Form | Rule |
|---|---|---|
| 1 | Purrloop | petted 56 times (8 a day) |
| 2 | Gemperor | well cared for at least 85 % of the time |
| 3 | Angloop | everything else |

The values are in `core/src/life.ts`.

</details>

## The slime's first forms

<details>
<summary>Show the forms the slime used to grow into</summary>

Until the slime was redrawn, it had five adult forms of its own. They don't
grow out of a slime any more, but they still live in the wild and may come to
visit as friends:

| Form | |
|---|---|
| ![Sneezle](images/pets/sneezle.png) | Sneezle, a teapot dragon |
| ![Lumoth](images/pets/lumoth.png) | Lumoth, a cuddly moth |
| ![Cyclopuff](images/pets/cyclopuff.png) | Cyclopuff, a one-eyed ram calf |
| ![Grumpcap](images/pets/grumpcap.png) | Grumpcap, a grumpy toad under a toadstool |
| ![Flicker](images/pets/flicker.png) | Flicker, a candle of melted slime |

They have no slot in the album.

</details>

## Rare eggs

Not every egg is a slime's. A pet can bring a rare egg home from a trip, and
what hatches from it grows up in its own way: another baby, another child,
other adults, and another rule for which adult it becomes.

<details>
<summary>Show where a rare egg comes from</summary>

Every guardian has been sitting on a rare egg:

| Area | Guardian | Egg |
|---|---|---|
| Meadow | Crowcomb | **beak egg** |
| Mushroom forest | Mosswart | **bear egg** |
| Stream | Ripplesprite | **duck egg** |
| Cave | Gloompeep | **ember egg** |
| Mountain | Frostfluff | **penguin egg** |
| Coast | Barkguard | **octopus egg** |
| Ruins | Rustknight | **gargoyle egg** |

A guardian leaves its egg behind the first time a pet gets past it, so every
pet can earn each of them once. A pet that got past a guardian before that
guardian had an egg for it (or while there was no room for one in the
bag) finds the egg at the end of the path on a later trip to that area.
After unpacking, the egg is in the bag and stays there, from one pet to
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
more rarely Glimmerock. A friend of theirs is the only way to a stone egg. The
two adults of the hippo line bathe there too: Lillypot, and more rarely
Steamo; they are the only way to a hippo egg.

In the forest live the two adults of the fox line (below): Filchfox, and more
rarely Roamtail. A friend of theirs is the only way to a fox egg. The two
adults of the leaf line live there too: Twiggle, and more rarely Needlenub;
they are the only way to a leaf egg.

On the mountain live the two adults of the cloud line (below): Rumblefluff,
which only comes out in the rain, and more rarely Prismist. A friend of theirs
is the only way to a cloud egg.

In the cave live the two adults of the bat line (below): Umbrabat, and more
rarely Batbeat. A friend of theirs is the only way to a bat egg.

At the coast lives Teacrab, the first adult of the crab line, and more rarely
Inkasso of the octopus line; in the ruins Sir Thimble of the mouse line, a
knight at home in the castle, and more rarely Gargard of the gargoyle line.
So the octopus and the gargoyle, whose eggs the two guardians behind the
mountain sit on, can be found without them too.

The ember, duck, beak, bear and penguin lines have no wild pets: their eggs
come from guardians. A pet of one of them with a slime for a friend
can still lay an egg of its own line, though.

The values are in `core/src/wild.ts`.

</details>

## Guests in the garden

Four lines live nowhere on a trip: their pets come to the garden when
something there draws them ([gameplay.md](gameplay.md#guests-in-the-garden)
has how a guest comes in). A guest's egg is always of its own line.

<details>
<summary>Show which guest comes for what</summary>

| Guest | Line | What draws it |
|---|---|---|
| Mothmuff | caterpillar | a plant bore all three of its fruits |
| Digby | dog | the pet played with you (a game, or the ball) on 5 of the last 7 days |
| Rotorfly | dragonfly | the pond is set out, and it rained at home in the last week |
| Dambert | beaver | the pond and the woodpile are both set out |

The pond turns up at the stream, the woodpile in the mushroom forest, once
each. The pond only stands outside.

The values are in `core/src/garden.ts`.

</details>

## Out of the water

Two lines hatch from eggs that come up on the fishing line
([gameplay.md](gameplay.md#fishing)).

<details>
<summary>Show which egg comes out of which water</summary>

| Water | Egg |
|---|---|
| The pond in the garden, the stream and the sea at the coast | **crab egg** |
| The lake in the cave | **axolotl egg** |

An egg is a rare catch, but it can't be missed: after fifteen catches at a
water without its egg, the next one is the egg. After that it still comes up now and then, and with
Angloop at the rod more often.

The values are in `core/src/fishing.ts`.

</details>

## From Grandma's attic

One line hatches from an old egg that Grandma finds in her attic, when a pet
visits her ([gameplay.md](gameplay.md#at-grandmas)).

<details>
<summary>Show which egg is in the attic</summary>

The first egg from the attic is always the **mouse egg**, in one of Grandma's
knitted egg cosies. It comes on a visit with her things, sure by the third
such visit. Later the attic has eggs of the lines the pet knows.

The values are in `core/src/grandma.ts`.

</details>

## Under the stars, on the stage and in the ground

Four lines hatch from eggs that come from the shooting stars, the trick
festival and digging ([gameplay.md](gameplay.md#shooting-stars)).

<details>
<summary>Show which eggs they are</summary>

| Where | Egg |
|---|---|
| On the roof, after the fifth evening with a shooting star: the owl that sat there left it | **owl egg** |
| The first first place at the trick festival | **chameleon egg** |
| The second first place at the trick festival | **kite egg** |
| The first dig at a treasure map's cross, for every pet | **scarab egg** |

The dog and the beaver lines are diggers by nature: they dig twice as fast and
find a seed more.

The values are in `core/src/stars.ts`, `core/src/festival.ts` and
`core/src/digging.ts`.

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
With a fire of its own, nothing of this line ever shivers on a cold morning
or minds a hot afternoon.

![Lanternling](images/pets/lanternling.png)

**Lanternling**, a flame that has moved into a lantern. It is snug in there:
its mood drops more slowly, it gets sick less often, and in the rain it needs
no umbrella. Its face is calm, with soft round eyes and rosy cheeks. Asleep,
it burns low.
For its spin it swings to and fro like a lantern on its handle, and its special move is a flight of moths drawn to its light.

![Flarelet](images/pets/flarelet.png)

**Flarelet**, a flame that has burst out of its crust and burns in the open;
what is left of the crust is the bowl it sits in. It burns through its food
and hardly gets tired, and it throws sparks. It looks eager: wide eyes under
brows that flick up, and a big grin with a fang.
For its flip its flame shoots up out of the bowl and rains embers, and tongues of flame are its special move.

</details>

<details>
<summary>Show how to get them</summary>

Only playing counts for this line (training and hide and seek are playing,
too):

| Form | Rule |
|---|---|
| Flarelet | the child was played with 18 times (2.5 a day) |
| Lanternling | everything else |

From its second day on, the flame on Cindlet's head shows where it is heading:

| Flame | Heading for |
|---|---|
| red and orange | nothing yet (the first day) |
| blue | Lanternling |
| white-hot | Flarelet |

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about something it ate.*

<details>
<summary>Show this form</summary>

![Salamber](images/pets/salamber.png)

**Salamber**, a fire salamander of glowing crust. A crest of flames runs over its head, its tail curls up into a torch, glowing spots dot its back, and it sits on a lump of cooling lava. It burns through its food, dirt burns off its crust, and it rarely gets sick. At night its spots glow brighter.
Its dance leaves a ring of embers round it; for its special move it rolls itself up into a wheel of fire.

</details>

<details>
<summary>Show how to get it</summary>

The child ate 3 glowberries from the bag. A glowberry kept from an earlier pet counts too. This rule goes before the others of the line. While the child is on its way there, its hint color is glowing lava.

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

For this line, the care diary doesn't count: the night does, the moment the
child grows up. Its crystals want the dark to light up in.

| Form | Rule |
|---|---|
| Glimmerock | the sun is down when the child grows up |
| Bouldergrin | everything else |

So whoever wants Glimmerock taps **Evolve** after sunset, before bedtime. On a
short summer evening it can be woken at night for it, at the cost of a grumpy
pebble. From its second day on, the quartz band of Pebblet shows what it would
become right now:

| Band | Heading for |
|---|---|
| white | nothing yet (the first day) |
| lilac, like crystal, after sunset | Glimmerock |
| sunny yellow | Bouldergrin |

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about a night.*

<details>
<summary>Show this form</summary>

![Lunarock](images/pets/lunarock.png)

**Lunarock**, a stone giant with a geode for a heart. Its chest has cracked open, and in a ring of amethyst sits a moonstone that waxes and wanes with the real moon. Big fists, and little stones circle it like moons. It hardly tires and rarely gets sick; at night the moonstone and the amethyst glow.
For its bow the moonstone flashes and sends glints up into the sky; its special move is blades of moonlight.

</details>

<details>
<summary>Show how to get it</summary>

It grows up at night under a full moon (a day and a half either side of it counts). This rule goes before the others of the line. While the child is on its way there, its hint color is moonlight.

</details>

### The fox line

<details>
<summary>Show the fox line</summary>

| | Stage |
|---|---|
| ![Fox egg](images/pets/fox_egg.png) | **Fox egg** – a russet shell with cream speckles, like a fox's chest |
| ![Fox baby](images/pets/fox_baby.png) | **Baby** – a small round cub with two pointed ears, one of them bent a little |
| ![Kitlet](images/pets/kitlet.png) | **Child: Kitlet** – a fox cub as round as a slime, with a cream belly, little paws and a bushy tail that curls up to a white tip |

The stages last as long as the slime's. What the adults keep is the tail with
its white tip. Both adults walk rather than hop.

![Roamtail](images/pets/roamtail.png)

**Roamtail**, the fox that has seen the world. A turquoise scarf is wrapped
round its neck, one end blowing out behind it in the wind, and it leans on a
knotty walking stick with a ribbon of the scarf tied round it. It needs no
backpack of its own: on a trip it wears the one everybody gets. Used to long
roads, it hardly tires. It looks calm and friendly, under lids lowered in
peace, with a gentle smile.
For its spin it chases its own tail.

![Filchfox](images/pets/filchfox.png)

**Filchfox**, the fox that has got up to mischief. It wears a bandit mask tied
at the back, one ear is bent, its fur is ruffled and the tip of its tail is
ragged. It is always after something to eat and up for any game. Its look is
cheeky: one eye narrowed, the other with a glint in it, and a sly grin with a
fang.
For its spin it vanishes in a puff of smoke and pops up a little further on.

</details>

<details>
<summary>Show how to get them</summary>

Only trips count for this line: a fox is made for roaming. A trip it was
called straight back from doesn't count.

| Form | Rule |
|---|---|
| Roamtail | the child went on 7 trips (1 a day) |
| Filchfox | everything else |

From its second day on, the white tip of Kitlet's tail shows where it is
heading:

| Tip | Heading for |
|---|---|
| white | nothing yet (the first day) |
| turquoise, like the scarf | Roamtail |
| dusky violet, like the mask | Filchfox |

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about a place.*

<details>
<summary>Show this form</summary>

![Foxfire](images/pets/foxfire.png)

**Foxfire**, a white fox spirit with three tails, a blue fox fire burning at the tip of each, and red marks round its eyes. Calm and content, its mood drops more slowly, and it loves a game. At night its fox fires glow.
Its spin sends fox fires whirling round it, and three fox fires are its special move.

</details>

<details>
<summary>Show how to get it</summary>

The child went on 4 trips to the mushroom forest. This rule goes before the others of the line. While the child is on its way there, its hint color is a blue fox fire.

</details>

### The cloud line

<details>
<summary>Show the cloud line</summary>

| | Stage |
|---|---|
| ![Cloud egg](images/pets/cloud_egg.png) | **Cloud egg** – a sky-blue shell with little white clouds drifting across it |
| ![Cloud baby](images/pets/cloud_baby.png) | **Baby** – a small sky-blue blob with a puff of cloud fleece on its head and two dark lamb's feet |
| ![Nimbit](images/pets/nimbit.png) | **Child: Nimbit** – a lamb whose fleece is a white cloud, with a sky-blue face, one ear flipped up, stubby legs and a yellow bell on a pink ribbon |

The stages last as long as the slime's. What the adults keep is the cloud
fleece. Both adults walk rather than hop, and a cloud needs no umbrella.

![Rumblefluff](images/pets/rumblefluff.png)

**Rumblefluff**, the thundercloud ram. Its fleece is a dark storm cloud piled
high, and its horns are two golden curls of lightning that end in a bolt; the
right one is bigger and forks. In a real thunderstorm they flash now and then.
It looks stern, under heavy brows, and even a bad day hardly makes it grumpier
than it is.
For its bow it lowers its head, scrapes the ground and charges, sparks flying off its horns.

![Prismist](images/pets/prismist.png)

**Prismist**, the fair-weather ewe. Its fleece is a light, sunlit cloud with a
blush of evening underneath, and a rainbow arches over its back. In the rain the
rainbow fades; when the sun comes out after it, its colors run along the arch
for half an hour. It still wears
Nimbit's bell. It looks kind, with lashes and a small smile, loves being
petted, and dirt hardly weighs it down.
When it spins, the colors of its rainbow run round as they do after the rain.

</details>

<details>
<summary>Show how to get them</summary>

For this line, the care diary doesn't count: the weather does, the moment the
child grows up. The real weather where the pet lives, as on the panel.

| Form | Rule |
|---|---|
| Rumblefluff | it rains (or storms) when the child grows up |
| Prismist | everything else |

So whoever wants a thundercloud waits for rain before tapping **Evolve**.
From its second day on, Nimbit's bell shows what it would become right now:

| Bell | Heading for |
|---|---|
| yellow | nothing yet (the first day) |
| storm blue, while it rains | Rumblefluff |
| rainbow pink | Prismist |

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the weather.*

<details>
<summary>Show this form</summary>

![Flurrbleat](images/pets/flurrbleat.png)

**Flurrbleat**, a snow cloud that has become a sheep. Curly cloud wool, a dark sheep's face with curled horns, a knitted scarf, and under it it always snows a little. The snow keeps its wool clean, and petting it is worth more: there is no softer wool.
It dances round and round in a flurry of snow, and a volley of snowballs is its special move.

</details>

<details>
<summary>Show how to get it</summary>

It snows when it grows up. The **snow globe**, now and then found on the mountain, makes it snow around the house while it is set out, so that this form can be reached anywhere. This rule goes before the others of the line. While the child is on its way there, its hint color is snow white.

</details>

### The leaf line

<details>
<summary>Show the leaf line</summary>

| | Stage |
|---|---|
| ![Leaf egg](images/pets/leaf_egg.png) | **Leaf egg** – a seed with an acorn cap of woven husk and small leaves for speckles |
| ![Leaf baby](images/pets/leaf_baby.png) | **Baby** – a green slime wearing the top of its seed as a tilted cap, with a sprout on top |
| ![Sproutlet](images/pets/sproutlet.png) | **Child: Sproutlet** – a seedling with its seed cap pulled down to the eyes like a helmet, two leaves on top (a small one and a big one that flops to the right) and two little roots for feet |

The stages last as long as the slime's. What the adults keep is the seed cap,
grown and woven into a pot. A plant likes the rain, so nothing of this line
needs an umbrella.

![Twiggle](images/pets/twiggle.png)

**Twiggle**, an old bonsai master that walks around in its pot. Pads of
leaves like clouds sit on a gnarled trunk, one reaching far to the right, and
the pot stands on its roots. It has a calm old face with half-shut eyes and a
beard of moss, and it is patient: it gets tired more slowly. In a scuffle,
leaves fly off its crown.
When it spins, leaves whirl off its crown.

![Needlenub](images/pets/needlenub.png)

**Needlenub**, a round cactus in the same pot that wants nothing more than to
be petted. Its little arms are always up for a hug, petting means more to it
than to anyone, and the one flower on its head only opens when it is happy;
otherwise it is a bud. It stays in its pot rather than walking.
For its bow it closes into a bud and blooms with a pop, petals flying.

</details>

<details>
<summary>Show how to get them</summary>

Only petting counts for this line: a cactus that gets cuddled.

| Form | Rule |
|---|---|
| Needlenub | the child was petted 35 times (5 a day) |
| Twiggle | everything else |

From its second day on, Sproutlet's leaves show where it is heading:

| Leaves | Heading for |
|---|---|
| fresh green | nothing yet (the first day) |
| the deep green of an old tree | Twiggle |
| pink, like a cactus flower | Needlenub |

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about its own plant.*

<details>
<summary>Show this form</summary>

![Sakurin](images/pets/sakurin.png)

**Sakurin**, a cherry tree in full bloom. A cloud of blossom for a crown, a painted fan in one hand and a red lacquer pot with a gold band, and petals drifting round it. It is always a little festive: its mood drops more slowly.
Its dance is a fan dance with drifting blossom, and its special move is cherries that burst.

</details>

<details>
<summary>Show how to get it</summary>

The child picked 6 fruits off its own plant and ate them. This rule goes before the others of the line. While the child is on its way there, its hint color is cherry blossom pink.

</details>

### The duck line

<details>
<summary>Show the duck line</summary>

| | Stage |
|---|---|
| ![Duck egg](images/pets/duck_egg.png) | **Duck egg** – a cream egg whose lower half floats in pond water |
| ![Duck baby](images/pets/duck_baby.png) | **Baby** – a yellow slime with a curl of down on top, a little bill and orange webbed feet |
| ![Paddlet](images/pets/paddlet.png) | **Child: Paddlet** – a duckling that still sits in the bottom half of its eggshell and paddles it like a little boat |

The stages last as long as the slime's. What the adults keep is the curl. A
duck likes the rain, so nothing of this line needs an umbrella.

![Drakwing](images/pets/drakwing.png)

**Drakwing**, a duck that is a little dragon. Its mallard-green head has a
horn where the curl was, its wide orange bill puffs little flames, it has
small bat wings and a spiky tail, and its belly is still duckling yellow. A
fire needs feeding: it gets hungry faster. In a scuffle, it breathes embers.
For its flip it flaps up and glides down in a long arc with a puff of fire, and its special move is a burst of fire.

![Captain Quill](images/pets/quill.png)

**Captain Quill**, an old sea duck in a captain's cap with the curl sticking
out under it, a sailor collar and a red scarf. It loves a good game, and in a
scuffle it blows bubbles.
Its dance is a sailor's hornpipe, and in a scuffle it fires cannonballs.

</details>

<details>
<summary>Show how to get them</summary>

Only scuffles count for this line, on trips (guardians included), whether
it wins them or not. A child that is ready to grow up can still go on a few
more trips first.

| Form | Rule |
|---|---|
| Drakwing | the child had 14 scuffles (2 a day) |
| Captain Quill | everything else |

From its second day on, Paddlet's curl shows where it is heading:

| Curl | Heading for |
|---|---|
| yellow | nothing yet (the first day) |
| a mallard's green | Drakwing |
| the navy of a captain's cap | Captain Quill |

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the weather on the way.*

<details>
<summary>Show this form</summary>

![Bubblehelm](images/pets/bubblehelm.png)

**Bubblehelm**, a deep-sea diver. A brass helmet with three portholes, the duck looking out of the front one, an air hose, a canvas suit, lead boots and a lantern; bubbles rise from its valve. The helmet keeps the muck out, it loves a game, and it needs no umbrella.
For its flip it dives head first into the ground and pops out again in a burst of bubbles; for its special move it swings its anchor.

</details>

<details>
<summary>Show how to get it</summary>

The child went on 3 trips with rain on the way. This rule goes before the others of the line. While the child is on its way there, its hint color is brass.

</details>

### The hippo line

<details>
<summary>Show the hippo line</summary>

| | Stage |
|---|---|
| ![Hippo egg](images/pets/hippo_egg.png) | **Hippo egg** – a lavender egg that has been in the mud, caked at the bottom with drips going up |
| ![Hippo baby](images/pets/hippo_baby.png) | **Baby** – a round lavender baby with two little ears, a big pale muzzle and pink cheeks; wider and lower than the slime |
| ![Soakling](images/pets/soakling.png) | **Child: Soakling** – a young hippo on its way to the bath, a striped towel folded on its head with its little ears poking out |

The stages last as long as the slime's. What the adults keep is the towel.

![Lillypot](images/pets/lillypot.png)

**Lillypot**, a pond hippo. Lily pads grow on its back like a coat and a lotus
is tucked into the towel on its head. It is calm and half asleep anyway: it
gets tired more slowly, and it is wet enough not to need an umbrella. In a
scuffle, it blows bubbles.
For its bow it sinks low, as into its pond, and blows bubbles.

![Steamo](images/pets/steamo.png)

**Steamo**, the sauna master. Pink from the heat, eyes closed in bliss, a
towel wound round its head like a turban and steam rising off it. It is
always fresh from the sauna: it stays clean longer and gets sick less often.
In a scuffle, it lets off steam.
Its dance is a sauna dance in clouds of steam, and clouds of steam are its special move.

</details>

<details>
<summary>Show how to get them</summary>

Only baths count for this line.

| Form | Rule |
|---|---|
| Steamo | the child was bathed 14 times (twice a day) |
| Lillypot | everything else |

From its second day on, the stripe on Soakling's towel shows where it is
heading:

| Stripe | Heading for |
|---|---|
| pink | nothing yet (the first day) |
| red hot | Steamo |
| the green of a lily pad | Lillypot |

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about bedtime.*

<details>
<summary>Show this form</summary>

![Hippula](images/pets/hippula.png)

**Hippula**, an eloquent vampire count. A cape with a high collar and red lining, slicked-back hair, a monocle on a chain, two little fangs and a glass of berry juice (so it says); the line's towel hangs over its arm like a waiter's napkin. It looks at you from under heavy lids. Up all night, it tires sooner, but nothing ruffles a count.
Its bow is a deep one with a sweep of the cape, and bats flutter up; a swarm of little bats is its special move.

</details>

<details>
<summary>Show how to get it</summary>

The child was tucked in by hand on 6 evenings. This rule goes before the others of the line. While the child is on its way there, its hint color is a red as dark as its cape's lining.

</details>

### The beak line

<details>
<summary>Show the beak line</summary>

| | Stage |
|---|---|
| ![Beak egg](images/pets/beak_egg.png) | **Beak egg** – a wild bird's egg, robin blue with brown freckles of every size |
| ![Beak baby](images/pets/beak_baby.png) | **Baby** – a fluffy chick, grey-brown down with a lighter belly and a red crest |
| ![Crestling](images/pets/crestling.png) | **Child: Crestling** – a round young bird whose crest has grown into three feathers, with flying goggles pushed up on it: it wants to fly long before it can |

The stages last as long as the slime's. What the adults keep is the red
crest; only the beak tells them apart.

![Rapierre](images/pets/rapierre.png)

**Rapierre**, a hummingbird fencer. Slim and shimmering green, it holds its
long needle beak like a rapier, the crest swept back like a musketeer's plume.
It never lands: it hovers, one wing a blur. A hummingbird burns through
everything: it gets tired and hungry faster.
Its spin is a fencer's lunge, twice, with a flash at the tip of its beak, and in a scuffle its blade flashes.

![Parcelbeak](images/pets/parcelbeak.png)

**Parcelbeak**, a pelican mail carrier with a postman's cap, the crest
sticking through it, a huge orange bill and a mail bag across its chest. With
a letter for everyone, it is always in a good mood: its mood drops more
slowly. In a scuffle, letters fly out of its bag.
For its bow a letter flies out of its pouch.

</details>

<details>
<summary>Show how to get them</summary>

Only practicing tricks together counts for this line (showing a trick it
already knows doesn't).

| Form | Rule |
|---|---|
| Rapierre | the child practiced tricks 14 times (twice a day) |
| Parcelbeak | everything else |

From its second day on, Crestling's goggles show where it is heading:

| Goggles | Heading for |
|---|---|
| light blue lenses in a brown frame | nothing yet (the first day) |
| shimmering green | Rapierre |
| orange, with a post-blue frame | Parcelbeak |

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the guardians.*

<details>
<summary>Show this form</summary>

![Acewing](images/pets/acewing.png)

**Acewing**, a swift who flies stunts: wings held out stiff like a little plane's, a leather flying cap with the goggles pushed up, an open flying jacket and a long white scarf. All those stunts tire it sooner, and it is always up for a game.
Its flip is a loop with a trail of smoke, and its special move is a dive so fast that the air bangs.

</details>

<details>
<summary>Show how to get it</summary>

As a child it got past 2 guardians for the first time. This rule goes before the others of the line. While the child is on its way there, its hint color is the white of its scarf and the leather of its cap.

</details>

### The caterpillar line

<details>
<summary>Show the caterpillar line</summary>

| | Stage |
|---|---|
| ![Caterpillar egg](images/pets/caterpillar_egg.png) | **Caterpillar egg** – a leaf-green egg in soft rings like a caterpillar's body, with a bite out of its top |
| ![Caterpillar baby](images/pets/caterpillar_baby.png) | **Baby** – a plump green slime in rings, two feelers with pink pompoms and little feet |
| ![Munchlet](images/pets/munchlet.png) | **Child: Munchlet** – a fat caterpillar with a bib on, its pompom feelers grown long, and a row of stubby feet |

The stages last as long as the slime's. What the adults keep is the feelers.

![Mothmuff](images/pets/mothmuff.png)

**Mothmuff**, a ball of fur with feathery feelers, its wings hanging round it
like a cloak. A moth naps the day away anyway: it gets tired more slowly, and
it loves being petted. For its spin it circles as round a lamp, and in a
scuffle it shakes out a cloud of wing dust.

![Sunflutter](images/pets/sunflutter.png)

**Sunflutter**, a butterfly whose head is the middle of a sunflower, with a
ring of petal wings, standing on leaf legs. Sunny by nature: its mood drops
more slowly. For its dance its petals open like a blossom, and its special
move is a whirl of pollen.

</details>

<details>
<summary>Show how to get them</summary>

This line goes by the fruit the child ate most, from the bag or off the plant.

| Form | Rule |
|---|---|
| Sunflutter | sunflower seeds were its favorite: at least 4, and more than of any other fruit |
| Mothmuff | everything else |

From its second day on, the pompoms on Munchlet's feelers show where it is
heading: a soft moth gray for Mothmuff, sunflower yellow for Sunflutter.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the fruit it likes best.*

<details>
<summary>Show this form</summary>

![Jesterwing](images/pets/jesterwing.png)

**Jesterwing**, a harlequin butterfly. Tall diamond wings, a jester's cap with
bells, and it floats instead of walking. Always up to some fooling and always
wanting an audience: it gets tired and glum sooner. Its flip is a somersault
in the air with jingling bells, and its special move is confetti that makes
the opponent laugh.

</details>

<details>
<summary>Show how to get it</summary>

Giggle cherries were the fruit the child ate most: at least 4, and more than
of any other. This rule goes before the others of the line. While the child is
on its way there, its hint color is the red and violet of a harlequin.

</details>

### The dog line

<details>
<summary>Show the dog line</summary>

| | Stage |
|---|---|
| ![Dog egg](images/pets/dog_egg.png) | **Dog egg** – a cream egg with one big brown patch and a paw print |
| ![Dog baby](images/pets/dog_baby.png) | **Baby** – a tan puppy slime, one ear pricked up and one hanging down its side, and a wagging tail |
| ![Pupplet](images/pets/pupplet.png) | **Child: Pupplet** – a puppy chasing its own tail, which curls round in front of it |

The stages last as long as the slime's. What the adults keep is the one
floppy ear.

![Digby](images/pets/digby.png)

**Digby**, a dog with a garden bed growing on its back: sprouts and a carrot
top, earth on its nose and paws. Its nose is always in the soil, so it gets
dirty sooner, and it loves a game. For its spin it chases round three times
and lies down, and in a scuffle it digs in and comes up under the opponent.

![Barrelbard](images/pets/barrelbard.png)

**Barrelbard**, a huge shaggy rescue dog like a snowy mountain, snowflakes
caught in its fur and a little barrel under its chin. Big and calm, it tires
more slowly, and every bond heart means a little more to it. For its bow it
shakes the snow off, and its special move is an avalanche.

</details>

<details>
<summary>Show how to get them</summary>

This line goes by how close the child is to you when it grows up.

| Form | Rule |
|---|---|
| Barrelbard | it has 4 bond hearts or more when it grows up |
| Digby | everything else |

From its second day on, Pupplet's ears and tail show where it is heading:
sprout green for Digby, snow white for Barrelbard.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about tricks.*

<details>
<summary>Show this form</summary>

![Pawdini](images/pets/pawdini.png)

**Pawdini**, a circus dog standing on a big striped ball, a small ball
balanced on its nose, a frilled ruff, and stars glitter round it. The show
never stops: it tires sooner, and it loves a game. For its dance it rolls to
and fro on its ball, and balls fly in arcs as its special move.

</details>

<details>
<summary>Show how to get it</summary>

It knows all four tricks when it grows up. This rule goes before the others of
the line. While the child is on its way there, its hint color is circus red.

</details>

### The dragonfly line

<details>
<summary>Show the dragonfly line</summary>

| | Stage |
|---|---|
| ![Dragonfly egg](images/pets/dragonfly_egg.png) | **Dragonfly egg** – a glassy blue egg with a shimmer of green, blue and violet running across it |
| ![Dragonfly baby](images/pets/dragonfly_baby.png) | **Baby** – a sky-blue slime with two pairs of shimmering wings spread out sideways |
| ![Nymphlet](images/pets/nymphlet.png) | **Child: Nymphlet** – a dragonfly larva with wing stubs and diving goggles made of dew |

The stages last as long as the slime's. What the adults keep is the
shimmering wings.

![Rotorfly](images/pets/rotorfly.png)

**Rotorfly**, a dragonfly that is a little helicopter: its head is a glass
cockpit with its face behind it, its tail a tail boom with a small rotor, its
legs are skids, and its wings turn on top as the rotor. All that hovering
tires it sooner. For its spin it lifts off and turns on the spot, and in a
scuffle its downwash pushes the opponent away.

![Jewelwing](images/pets/jewelwing.png)

**Jewelwing**, a knight whose body is plate armour in jewel green, its wings
hanging behind it like two banners, a lance in its hand. Armour wipes clean
and keeps sickness out. For its bow it kneels with its lance lowered, and its
special move is a lance thrust that sparkles.

</details>

<details>
<summary>Show how to get them</summary>

Only baths count for this line.

| Form | Rule |
|---|---|
| Jewelwing | the child was bathed 14 times |
| Rotorfly | everything else |

From its second day on, Nymphlet's goggles show where it is heading:
cockpit-glass cyan for Rotorfly, jewel green for Jewelwing.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the weather.*

<details>
<summary>Show this form</summary>

![Prismfly](images/pets/prismfly.png)

**Prismfly**, a dragonfly of glass with wings of prism shards in every color,
throwing rainbow light; it glows at night. It lives half on light, so it gets
hungry more slowly. For its dance spots of light in every color dance round
it, and its special move is light broken into seven rays.

</details>

<details>
<summary>Show how to get it</summary>

It grows up in the daytime, while it doesn't rain, within three hours after
it last rained at home. This rule goes before the others of the line. While
the child is on its way there, its hint color is a rainbow pink.

</details>

### The beaver line

<details>
<summary>Show the beaver line</summary>

| | Stage |
|---|---|
| ![Beaver egg](images/pets/beaver_egg.png) | **Beaver egg** – an egg of wood, with growth rings and gnaw marks bitten into one side |
| ![Beaver baby](images/pets/beaver_baby.png) | **Baby** – a brown slime with round ears, buck teeth, a pencil behind one ear and a flat tail |
| ![Gnawlet](images/pets/gnawlet.png) | **Child: Gnawlet** – a young beaver, the pencil still behind its ear, gnawing on a twig |

The stages last as long as the slime's. What the adults keep is the buck teeth
and the flat tail.

![Dambert](images/pets/dambert.png)

**Dambert**, half beaver, half dam: it carries its dam of logs on its back
like a shell, branches poking out, and its tail is a mason's trowel. It gnaws
all day, so it gets hungry sooner. For its flip it raises its trowel and jumps
over a little stack of wood, and in a scuffle it builds a dam in one go.

![Timberjack](images/pets/timberjack.png)

**Timberjack**, broad and bearded, the plaid of a lumberjack's shirt grown
into its fur and its tail ending in an axe blade. A lumberjack's appetite, and
tough as an old oak: it gets hungry sooner and sick less often. For its spin
its axe tail swings round and wood chips fly, and its special move is a tree
trunk that falls on the opponent.

</details>

<details>
<summary>Show how to get them</summary>

This line goes by the child's battle stats when it grows up.

| Form | Rule |
|---|---|
| Timberjack | strength is its highest battle stat, higher than speed and smarts |
| Dambert | everything else |

From its second day on, Gnawlet's pencil shows where it is heading: the color
of fresh-cut wood for Dambert, plaid red for Timberjack.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the house.*

<details>
<summary>Show this form</summary>

![Archibeaver](images/pets/archibeaver.png)

**Archibeaver**, the master builder. It sits on a little tower it built from
branches and hops along with it, holds a blueprint that glows blue, and its
compass throws sparks; the pencil is still behind its ear. Content with its
plans, its mood drops more slowly. For its bow it unrolls the plan, and its
special move is a tower of branches that grows up under the opponent.

</details>

<details>
<summary>Show how to get it</summary>

The house is built to its last step when the child grows up. This rule goes
before the others of the line. While the child is on its way there, its hint
color is blueprint blue.

</details>

### The crab line

<details>
<summary>Show the crab line</summary>

| | Stage |
|---|---|
| ![Crab egg](images/pets/crab_egg.png) | **Crab egg** – a peach egg striped in diagonal bands like a seashell |
| ![Crab baby](images/pets/crab_baby.png) | **Baby** – a red slime in a spiral shell far too big for it, two little pincers in front |
| ![Shellbit](images/pets/shellbit.png) | **Child: Shellbit** – a hermit crab leaning out of a tall conch, one pincer bigger than the other |

The stages last as long as the slime's. A hermit crab moves house as it
grows, and each adult has grown together with the house it found.

![Teacrab](images/pets/teacrab.png)

**Teacrab**, crab and teapot in one: round and bellied, its big pincer is the
spout that steams, its legs carry the pot, and the lid is its hat. There is
always a cup of tea, so its mood drops more slowly, and it is warm to the
touch: petting it does more. For its bow it pours a cup, and in a scuffle it
pours a hot stream of tea over the opponent.

![Lightclaw](images/pets/lightclaw.png)

**Lightclaw**, tall and narrow, its shell ringed red and white like a
lighthouse, and its big pincer up top is the lamp. Up all night keeping the
light, it tires sooner. For its spin it turns like a lighthouse with its beam
sweeping round, and its special move is a beam that dazzles the opponent.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Lightclaw | it grows up after dark while a decoration that glows stands outside (the lantern, the glow mushroom, the crystal or the ember stone) |
| Teacrab | everything else |

From its second day on, the stripes of Shellbit's conch show where it is
heading: porcelain and tea green for Teacrab, lamp yellow for Lightclaw.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the sea.*

<details>
<summary>Show this form</summary>

![Castlecrab](images/pets/castlecrab.png)

**Castlecrab**, the crab that is a whole castle: broad, with battlements and a
keep, its two pincers are the gate towers that open as the gate, a flag waves
on every tower, and a moat foams round its feet. At night its windows light
up. It hops along all of a piece, and a whole castle needs feeding: it gets
hungry sooner. For its bow the drawbridge comes down and a fanfare of sparkle
goes up over the keep; its special move is its moat rising into a wave that
rolls over the opponent while the towers fire sand.

</details>

<details>
<summary>Show how to get it</summary>

Three trips to the coast while it is a child. This rule goes before the others
of the line. While the child is on its way there, its hint color is sandstone.

</details>

### The axolotl line

<details>
<summary>Show the axolotl line</summary>

| | Stage |
|---|---|
| ![Axolotl egg](images/pets/axolotl_egg.png) | **Axolotl egg** – a pink, glassy egg with the little one curled up inside, two gill frills on top |
| ![Axolotl baby](images/pets/axolotl_baby.png) | **Baby** – a pink slime with feathery gill fronds on each side of its head |
| ![Axolittle](images/pets/axolittle.png) | **Child: Axolittle** – a smiling axolotl, its gill fronds standing up like a crown, a long soft tail |

The stages last as long as the slime's. What the adults keep is the pink and
the gills.

![Mossolotl](images/pets/mossolotl.png)

**Mossolotl** lies flat and broad like a mossy stone on the lake floor, all
overgrown, its gill fronds sprouted into pink coral mushrooms. Calm as a
stone, with half-closed eyes, it hardly moves, so it tires more slowly. For
its spin its gills slowly unfurl and moss drifts off its back, and in a
scuffle moss grows up round the opponent's feet.

![Medilotl](images/pets/medilotl.png)

**Medilotl**, upright and round like a water bag, its gill fronds hanging down
long like a stethoscope's tubes and ending in heart blossoms; its tail is a
broad spoon for handing out medicine. A healer keeps clean, and heals itself
first: it gets dirty more slowly and sick less often. For its dance hearts
float up, and its special move is a plaster that bursts into hearts on the
opponent.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Medilotl | its health never dropped below 80 while it was a child |
| Mossolotl | everything else |

From its second day on, Axolittle's gills show where it is heading: moss
green for Mossolotl, heart red for Medilotl.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the cave.*

<details>
<summary>Show this form</summary>

![Axodrake](images/pets/axodrake.png)

**Axodrake**, a long, slender dragon floating in an S-curve above the ground.
Its gill fronds have grown into big pink fan wings, and bubbles rise from it
all the time. At night its gills and wings glow. All that floating tires it
sooner, and it loves to play: playing cheers it up more. For its flip it flies
a loop with a trail of bubbles, and its special move is a long stream of
glowing bubbles it breathes at the opponent.

</details>

<details>
<summary>Show how to get it</summary>

It got past Gloompeep, the guardian of the cave, while it was a child. This
rule goes before the others of the line. While the child is on its way there,
its hint color is wing pink.

</details>

### The mouse line

This is the line from Grandma's attic.

<details>
<summary>Show the mouse line</summary>

| | Stage |
|---|---|
| ![Mouse egg](images/pets/mouse_egg.png) | **Mouse egg** – in one of Grandma's knitted egg cosies, red with a white bobble |
| ![Mouse baby](images/pets/mouse_baby.png) | **Baby** – a small grey slime with two big round ears |
| ![Squeaklet](images/pets/squeaklet.png) | **Child: Squeaklet** – a little grey mouse with big round ears and a ringed tail, holding a crumb of cheese in both paws |

The stages last as long as the slime's. What the adults keep is the big round
ears and the ringed tail.

![Sir Thimble](images/pets/sirthimble.png)

**Sir Thimble**, a mouse knight, upright with a proud chest. Its ears have
grown hard as two nutshell shields, its tail stands up beside it as a lance
with a needle for a tip, and Grandma's thimble is its helmet. It marches. A
knight doesn't lose heart, and under its helmet it gets sick less often.
For its bow it dubs itself: a glint runs down
the lance to its shoulder. In a scuffle it charges behind its shield ears and
knocks the opponent back.

![Cogsqueak](images/pets/cogsqueak.png)

**Cogsqueak**, a wind-up tin-toy mouse, low and long on three little wheels.
Its ears are two cogs, its tail a spiral spring, and the winding key in its
back turns as it rolls along. Wound up, it keeps going: it tires more slowly.
For its spin it winds itself up until it whirrs round, throwing sparks and
little cogs, and its special move is a wind-up toy mouse that rolls over to
the opponent and pops.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Cogsqueak | its satiety never dropped below 25 while it was a child |
| Sir Thimble | everything else |

From its second day on, Squeaklet's crumb of cheese shows where it is heading:
nutshell brown for Sir Thimble, brass for Cogsqueak.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about Grandma.*

<details>
<summary>Show this form</summary>

![Woolwhisk](images/pets/woolwhisk.png)

**Woolwhisk**, the queen of Grandma's wool basket. She sits up tall on a big
ball of red wool, her fur grown into knitted wool, two crossed knitting needles
on her head for a crown. Her tail has become a golden thread that loops round
her in rings, and where it crosses itself it knits little stars that shine and
fade; at night the thread and the stars glow. She is soft as wool, so petting
cheers her up more, and wool picks up everything: she gets dirty sooner.
For
her spin her golden thread unwinds round her and winds back in, and in a
scuffle she wraps the opponent in loops of wool that knit up into stars.

</details>

<details>
<summary>Show how to get it</summary>

It wears one of the hats Grandma knitted when it grows up. This rule goes
before the others of the line. While the child is on its way there, its hint
color is red wool.

</details>

### The bear line

This is the line from Mosswart's egg in the mushroom forest.

<details>
<summary>Show the bear line</summary>

| | Stage |
|---|---|
| ![Bear egg](images/pets/bear_egg.png) | **Bear egg** – a caramel egg with honey dripping over its top, sitting in a cushion of moss |
| ![Bear baby](images/pets/bear_baby.png) | **Baby** – a round brown cub with round ears and a little honey pot on its head, honey running down onto its brow |
| ![Cubble](images/pets/cubble.png) | **Child: Cubble** – a bear cub with a pale muzzle and stubby paws, the honey pot worn as a hat and honey welling over its rim |

The stages last as long as the slime's. What the adults keep is the honey pot
on their head, the round ears and the muzzle.

![Hivebear](images/pets/hivebear.png)

**Hivebear**, a bear that has become a beehive. Its body is a round straw dome
coiled in rings with an entrance on its belly, the honey pot is the tip of the
hive, and bees fly in and out round it; only the ears, the muzzle and the
stubby paws are still bear fur. It walks. With honey of its own it gets hungry
more slowly, and warm and humming as it is, it loves to be petted.
For its bow it lifts its honey pot like a hat and the bees fly up, and in a
scuffle it sends a cloud of buzzing bees.

![Snorbear](images/pets/snorbear.png)

**Snorbear**, a bear that has become its own winter den. It lies flat and wide
like an earth mound with moss and snow on its back; only its sleepy head, one
paw and the moss-grown honey pot show, and it snores. Half asleep all the time
anyway, it tires more slowly, and nothing cheers it up like a scratch behind
the ears. For its spin it rolls up in its mound and tumbles, and its special
move is a yawn that sends the opponent to sleep.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Snorbear | it ate 4 honeycombs while it was a child |
| Hivebear | everything else |

From its second day on, the glaze of Cubble's honey pot shows where it is
heading: gold for Hivebear, moss green for Snorbear.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the two of you.*

<details>
<summary>Show this form</summary>

![Ursastra](images/pets/ursastra.png)

**Ursastra**, the bear of the night sky and the biggest of its line. It stands
up on its hind legs with its paws raised, its fur night blue, and the seven
stars of the Great Bear shine on its body. Star honey drips from its pot and
rises again as little lights round it; at night its stars, its pot and the
lights glow. It is as calm as the night sky, so its mood sinks more slowly,
and it grew out of a strong bond: hearts mean more to it. For its dance the
seven stars leave its body and wander into a heart, and in a scuffle shooting
stars rain down on the opponent.

</details>

<details>
<summary>Show how to get it</summary>

It has all five bond hearts when it grows up. This rule goes before the others
of the line. While the child is on its way there, its hint color is the blue
of the night sky.

</details>

### The penguin line

This is the line from Frostfluff's egg on the mountain.

<details>
<summary>Show the penguin line</summary>

| | Stage |
|---|---|
| ![Penguin egg](images/pets/penguin_egg.png) | **Penguin egg** – an ice-blue egg with snow on its top and frost on its shell, in a tuft of the yeti's white fur |
| ![Penguin baby](images/pets/penguin_baby.png) | **Baby** – a fluffy grey chick with a white face, a tuft of down on top, orange feet and red earmuffs |
| ![Waddlet](images/pets/waddlet.png) | **Child: Waddlet** – an upright young penguin with a slate back and a last tuft of down, a white heart-shaped face and belly, little flippers held out for balance and its earmuffs on their band |

The stages last as long as the slime's. What the adults keep is the
earmuffs, the white face and the orange feet.

![Tuxwaddle](images/pets/tuxwaddle.png)

**Tuxwaddle**, a penguin butler whose body has become a tailcoat. Tall and very
upright, its white front a shirt between dark lapels and its tail feathers
grown into coat tails, it holds one flipper out flat as a tray with a steaming
cup on it. Its earmuffs are a deeper red. It waddles. Always neat in its
tailcoat, it gets dirty more slowly, and a loyal butler: hearts mean more to
it. For its bow it serves with a waiter's bow, and its special move is a stack
of flying plates.

![Glidepin](images/pets/glidepin.png)

**Glidepin**, a penguin whose feet have grown into skate blades. Streamlined and
leaning far forward, one flipper swung forward and one swept back, its belly
smooth and shining like ice and its earmuffs ice blue, it skates along with
frost spraying behind it. Always skating, it tires faster, and it is always up
for a race: playing cheers it up more. For its spin it pirouettes on its
blades, and in a scuffle it lays an ice track the opponent slips on.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Glidepin | it has learned the spin when it grows up |
| Tuxwaddle | everything else |

From its second day on, Waddlet's earmuffs show where it is heading: deep red
for Tuxwaddle, ice blue for Glidepin.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the time of day.*

<details>
<summary>Show this form</summary>

![Aurorapin](images/pets/aurorapin.png)

**Aurorapin**, the penguin of the polar night and the biggest of its line.
Round and big, its belly is a window of ice into the night with one calm band
of the northern lights in it; ribbons of light stream from its back as a
train, snowflakes drift round it, and its earmuffs shine green and violet. At
night the lights glow. The frost keeps it clean, so it gets dirty more slowly,
and used to the polar cold, it gets sick less often. For its dance aurora
ribbons wave round it, and in a scuffle a curtain of aurora light comes down on
the opponent.

</details>

<details>
<summary>Show how to get it</summary>

It grows up in the last hour before sunrise, by the sun where it lives. This
rule goes before the others of the line. While the child is on its way there,
its hint colors are the green and violet of the northern lights.

</details>

### The bat line

This is the line from the cave, where its adults live as wild pets.

<details>
<summary>Show the bat line</summary>

| | Stage |
|---|---|
| ![Bat egg](images/pets/bat_egg.png) | **Bat egg** – a purple egg wrapped in two folded wings like a sleeping bat, hanging from the cave's ceiling by two little claws |
| ![Bat baby](images/pets/bat_baby.png) | **Baby** – a purple slime with two huge pointed ears, a little fang and two small wings folded at its sides |
| ![Flapling](images/pets/flapling.png) | **Child: Flapling** – a young bat with its huge pointed ears and real wings now, half spread, with finger bones, a scalloped edge and a thumb claw |

The stages last as long as the slime's. What the adults keep is the big
pointed ears and the little fang.

![Umbrabat](images/pets/umbrabat.png)

**Umbrabat**, a bat that has become an umbrella. Its wings have grown together
over its head, the finger bones are the ribs with a claw at each tip, its body
is the shaft and its tail the hooked handle, and its big ears stick up through
the top. Rain runs off its edge, and it floats along like an umbrella in the
wind. The rain washes it, so it gets dirty more slowly, and keeping the rain
off itself, it gets sick less often. It needs no umbrella of yours. For its flip it hangs from its hook tail and
swings round, and in a scuffle it opens its umbrella wings and rain pelts
off.

![Batbeat](images/pets/batbeat.png)

**Batbeat**, a bat for the dance floor. Its big ears have become two
loudspeaker horns whose membranes throb to the beat, its wings bob up and down
like arms over a mixing desk, and its eyes are shut with joy. Dancing all
night, it tires faster, and anything to dance to cheers it up: playing means
more to it. For its dance it nods to the bass while lights flash, and its
special move is sound waves on the beat, then the drop.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Batbeat | speed is its highest battle stat when it grows up (higher than each of the others) |
| Umbrabat | everything else |

From its second day on, Flapling's wing membrane shows where it is heading:
grey for Umbrabat, neon pink for Batbeat.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the sky.*

<details>
<summary>Show this form</summary>

![Lunaflap](images/pets/lunaflap.png)

**Lunaflap**, the moon's bat and the biggest of its line. Its wings are made of
moonlight, silver and spread so wide they fill the sky, the tips of its big
ears are two crescent moons, and silver sparks trickle down from the edge of
its wings. It flies, and at night its wings, its moons and its sparks glow. It
sleeps the day away and glides on moonlight, so it tires more slowly, and its
wings are soft: petting cheers it up more. For its spin it wraps itself in its wings and
opens them as a full-moon disc, and in a scuffle a swarm of silver light
moths flies at the opponent.

</details>

<details>
<summary>Show how to get it</summary>

It grows up at night under a full moon. This rule goes before the others of
the line. While the child is on its way there, its hint color is moonlight
silver.

</details>

### The owl line

This is the line a shooting star brings.

<details>
<summary>Show the owl line</summary>

| | Stage |
|---|---|
| ![Owl egg](images/pets/owl_egg.png) | **Owl egg** – a night-blue egg with two feather tufts and stars on it, a shooting star falling across it, lying on red roof tiles |
| ![Owl baby](images/pets/owl_baby.png) | **Baby** – a round tawny owlet with feather tufts, a cream face disc and far too big gold glasses |
| ![Hootlet](images/pets/hootlet.png) | **Child: Hootlet** – an upright young owl with long ear tufts and folded wings, its glasses even more too big: two huge round rims with a glint |

The stages last as long as the slime's. What the adults keep is the glasses
that are far too big for them.

![Owlbert](images/pets/owlbert.png)

**Owlbert**, an owl that has become a book. Its body stands square and upright
like a book's spine with gold bands and a title plate, its ear tufts are the
spine's corners pulled up into feathers, and its wings are the open pages
fanned out at its sides, written all over; a red bookmark hangs from one of
them, and the glasses have tortoiseshell rims. There is always another book,
so its mood sinks more slowly, and a quiz is a game too: playing means more to
it. For its bow it shuts its book and nods, and in a scuffle pages fly at the
opponent.

![Stargazer](images/pets/stargazer.png)

**Stargazer**, an owl that has become a telescope. It sits ducked low, wings
folded flat, and its neck pulls out in brass tubes, each thinner than the
last; the head at the top looks up into the sky, the glasses are the lenses,
and a star sparkles where it is looking. It sleeps the day away and watches
the sky at night, so it tires more slowly, and it wishes on every star for
you: hearts mean more to it. For its spin its head turns all the way round,
and its special move is a constellation that lights up.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Stargazer | it grows up after sunset under a clear sky |
| Owlbert | everything else |

From its second day on, the rims of Hootlet's glasses show where it is
heading: tortoiseshell brown for Owlbert, brass for Stargazer.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about its scuffles.*

<details>
<summary>Show this form</summary>

![Ninjowl](images/pets/ninjowl.png)

**Ninjowl**, the owl of shadow, a ninja, and the biggest of its line. Its
wings spread into a wide fan of feathers behind it, each ending in a steel
blade tip, a red band is knotted round its brow and a red sash round its slim
body, and its glasses have gone soot-black round its narrowed eyes. It stands
on one foot, perfectly still, and at night its blades glint. A ninja lives on
little, so it gets hungry more slowly, and nothing catches it: it gets sick
less often. For its flip it vanishes and lands behind itself, and in a
scuffle it throws stars made of feathers.

</details>

<details>
<summary>Show how to get it</summary>

It got through 3 scuffles as a child without being knocked over once. This rule goes
before the others of the line. While the child is on its way there, its hint
colors are its red band and soot.

</details>

### The chameleon line

This is a line from the trick festival.

<details>
<summary>Show the chameleon line</summary>

| | Stage |
|---|---|
| ![Chameleon egg](images/pets/chameleon_egg.png) | **Chameleon egg** – a speckled leaf-green egg turning yellow and orange at its bottom, a blue first-prize rosette pinned to its side |
| ![Chameleon baby](images/pets/chameleon_baby.png) | **Baby** – a leaf-green slime with a helmet crest, its bottom turning yellow and orange, its tail rolled into a curl |
| ![Colorlet](images/pets/colorlet.png) | **Child: Colorlet** – a young chameleon with a taller helmet crest and turret eyes, its colors rolling over it, four gripping legs and a big tail rolled into a tight spiral |

The stages last as long as the slime's. What the adults keep is the curled
tail and the changing colors.

![Palettino](images/pets/palettino.png)

**Palettino**, a chameleon that has become a painter's palette. Its body is
flat and round like a palette, with the thumb hole near its back and a bay cut
into its belly, and blobs of paint sit on its back. Its curled tail is striped
in paint colors and ends in a brush, which it holds over its back to dab the
paint. With paint everywhere it gets dirty sooner, and anything can be
painted: playing means more to it. For its spin colors run round its body, and
in a scuffle its tongue flicks a blob of paint.

![Hidewell](images/pets/hidewell.png)

**Hidewell**, a chameleon that has hidden so well it has become a twig. Its
body is a stick of bark on legs like twigs, ivy has grown all over its back,
and it grips a branch with its feet and winds its tail once round it; only its
big turret eye gives it away. It keeps still for hours, so it tires more
slowly, and hide and seek means more to it than anything. It likes the rain
and needs no umbrella. For its bow it almost vanishes into the scene, and its
special move is to turn up unseen and give the opponent a nudge.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Hidewell | it played hide and seek 7 times as a child |
| Palettino | everything else |

From its second day on, Colorlet's tail spiral shows where it is heading:
paint colors for Palettino, ivy green and bark for Hidewell.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about friends.*

<details>
<summary>Show this form</summary>

![Mirrorleon](images/pets/mirrorleon.png)

**Mirrorleon**, the legendary chameleon and the biggest of its line. It rears
up tall, its skin all mirror facets, a tall prism casque on its lizard head
splits the light into a rainbow, and its tail rolls into one huge round spiral
beside it. At night its prism and the rainbow glow. A mirror wipes clean, so it
gets dirty more slowly, and it grew out of a friendship: hearts mean more to
it. For its dance it copies its friend's dance in its friend's colors, and in
a scuffle it uses its friend's special move in its own colors. Without a
friend, the rainbow runs over its mirrors when it dances, and in a scuffle its
prism breaks a beam of light into the rainbow.

</details>

<details>
<summary>Show how to get it</summary>

It has a friend when it grows up. This rule goes before the others of the
line. While the child is on its way there, its hint color is mirror silver.

</details>

### The scarab line

This is the line that is dug up.

<details>
<summary>Show the scarab line</summary>

| | Stage |
|---|---|
| ![Scarab egg](images/pets/scarab_egg.png) | **Scarab egg** – a scarab-green egg split by the gold seam of wing cases, half dug out of a sand heap marked with a red cross |
| ![Scarab baby](images/pets/scarab_baby.png) | **Baby** – a domed metallic-green beetle with a gold seam, club antennae and six short legs, a sand ball in front of it |
| ![Rollet](images/pets/rollet.png) | **Child: Rollet** – a sturdier scarab with a darker head plate, its front legs pressing on the bigger sand ball it rolls ahead |

The stages last as long as the slime's. What the adults keep is the ball they
push.

![Solroll](images/pets/solroll.png)

**Solroll**, a scarab that works like a real dung beetle. Head down on the
ground and its rear raised high, it pushes its ball along; its shell has
turned gold with a pattern of sun rays, and the ball is a small warm sun.
Always pushing, it tires faster, and its sun keeps it warm: petting cheers it
up more. For its flip it jumps over its ball, and in a scuffle it rolls the
sun at the opponent.

![Clockbeetle](images/pets/clockbeetle.png)

**Clockbeetle**, a scarab that has become a pocket watch. It stands upright,
its body flat and round as a dial in a gold case; its wing cases have grown
into one lid, swung open on a hinge at its side, its horns are the clock's
hands, and the ball is now a brass cog it keeps beside it. Wound up, it keeps
going and tires more slowly, and well oiled as it is, it gets sick less often.
For its dance its cog ticks round to the beat, and its special move stops the
time: the opponent stands frozen and gray and loses its move that round.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Clockbeetle | it grows up within 5 minutes after a full hour |
| Solroll | everything else |

From its second day on, Rollet's ball shows where it is heading: sun orange
for Solroll, the cream of a watch dial for Clockbeetle.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the weather.*

<details>
<summary>Show this form</summary>

![Pharabug](images/pets/pharabug.png)

**Pharabug**, the legendary scarab, as on an old wall painting, and the
biggest of its line. Its wings spread wide to both sides in rows of feathers,
its wing cases are gold with turquoise stripes and frame its head like a
pharaoh's headdress, and above its head it holds up a big sun with its front
legs; sand trickles down from it, and at night the sun glows. Used to the
desert, it gets hungry more slowly, and the sun keeps it healthy: it gets sick
less often. For its bow it greets you as a pharaoh, raising its sun high, and
in a scuffle it sends a sandstorm.

</details>

<details>
<summary>Show how to get it</summary>

It is 27 °C or warmer when it grows up. This rule goes before the others of
the line. While the child is on its way there, its hint colors are lapis,
gold and turquoise.

</details>

### The paper kite line

This is a line from the trick festival.

<details>
<summary>Show the paper kite line</summary>

| | Stage |
|---|---|
| ![Paper kite egg](images/pets/kite_egg.png) | **Paper kite egg** – a red festival-paper egg folded like a kite with a gold frame, a string tail with two blue bows off its point |
| ![Paper kite baby](images/pets/kite_baby.png) | **Baby** – a little paper dragon, its head a folded sheet like an origami mask with one corner dog-eared, gold antlers and whiskers, its pleated body ending in a blue bow |
| ![Kitelet](images/pets/kitelet.png) | **Child: Kitelet** – a long paper dragon with a bigger folded head and branching antlers, its pleated body on two little folded paper feet, a bow on its tail and a bigger one at the tip |

The stages last as long as the slime's. What the adults keep is the tail with
its bows.

![Origrane](images/pets/origrane.png)

**Origrane**, a paper dragon folded sharp like an origami crane. It sits as a
triangle on its folded base, its two wings are pointed folded faces standing
up behind it, its head is the folded mask with little gold antlers, and its
tail is a strip folded into a zigzag with crane-white bows. Crisp, clean paper
gets dirty more slowly, and a folded crane brings luck: hearts mean more to
it. For its bow it folds itself small and unfolds again, and in a scuffle it
sends a swarm of paper planes.

![Lionkite](images/pets/lionkite.png)

**Lionkite**, a paper dragon that has become a festival lion dance. Its body is
a long band of paper and cloth flowing in waves, red and gold by turns, on
little feet; in front a big lion head with a fringe of mane, pompoms on its
brow and cheeks and a wide grin full of teeth. Dancing through the festival,
it tires faster, and every day is a festival: playing means more to it. For
its dance it does the lion dance with its pompoms flying, and its special move
is fireworks.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Lionkite | it has learned the dance when it grows up |
| Origrane | everything else |

From its second day on, Kitelet's bows show where it is heading: crane white
for Origrane, festival gold and pink for Lionkite.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the weather.*

<details>
<summary>Show this form</summary>

![Stormkite](images/pets/stormkite.png)

**Stormkite**, the legendary kite and the biggest of its line. It is stretched
like a big diamond stunt kite of dark thunderstorm paper, its spars crossing
behind it, with lightning-yellow horns and whiskers; its long tail zigzags
down and its bows twitch as bolts of lightning. It flies, and at night its
lightning glows. It is as changeable as the weather, so its mood sinks
faster, but nothing gets through storm paper: it gets sick less often, and it
needs no umbrella. For its flip it shoots up in the wind and dives, and in a
scuffle lightning runs down its string.

</details>

<details>
<summary>Show how to get it</summary>

There is a thunderstorm when it grows up. This rule goes before the others of
the line. While the child is on its way there, its hint colors are storm blue
and lightning yellow.

</details>

### The octopus line

This is a line from the coast.

<details>
<summary>Show the octopus line</summary>

| | Stage |
|---|---|
| ![Octopus egg](images/pets/octopus_egg.png) | **Octopus egg** – a pale coral egg held by a curve of cream suckers like an arm round it, an indigo ink splash dripping down from its top, lying in the sand by a strand of seaweed |
| ![Octopus baby](images/pets/octopus_baby.png) | **Baby** – a round coral octopus with a tall soft mantle and an ink spot on it, four little arms curling at their ink-dark tips and one arm raised, waving |
| ![Inklet](images/pets/inklet.png) | **Child: Inklet** – a taller young octopus with a painter's beret cocked on its mantle, a big ink blot with a drip on it, and one arm raised high like a brush, a drop of ink on its tip |

The stages last as long as the slime's. What the adults keep is the ink.

![Inkasso](images/pets/inkasso.png)

**Inkasso**, an octopus that has become a painter. It sits on the ground with
its mantle in front and fans five arms up behind itself like a peacock's tail;
every arm tip is a brush soaked in its own color, the red one raised highest,
and two more arms curl on the ground in front of it. Inklet's ink blot is now
paint splashed in every color. With paint everywhere it gets dirty sooner, and
any game is something to paint: playing means more to it. For its spin it
turns round and round and paints a circle in the air all round itself, and in
a scuffle it flings blobs of paint at the opponent.

![Octavio](images/pets/octavio.png)

**Octavio**, an octopus that has become a juggler. Tall and slim, it balances
on the tip of a single arm, its mantle stretched up high and its other arms
winding out in every direction; its suckers have become red and yellow
juggling balls, and some of them are always flying in an arc over its head
while it watches them, the tip of its tongue out. Eight arms keep it busy, so
it tires faster, and anything can be juggled: playing means much more to it.
For its dance it juggles with all its arms, and in a scuffle it throws its
balls up out of sight and they come down on the opponent from all
directions.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Octavio | it knows 3 tricks when it grows up |
| Inkasso | everything else |

From its second day on, Inklet's ink blot and drop show where it is heading:
paint green and lilac for Inkasso, juggling red and gold for Octavio.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about its skills.*

<details>
<summary>Show this form</summary>

![Abyssink](images/pets/abyssink.png)

**Abyssink**, the octopus of the deep sea and the biggest of its line. It
floats like a great bell, its arms joined by a webbing of ink into a wide
umbrella, their tips curling out below its hem; rows of glowing dots run
along every arm and round its mantle, a glowing lure hangs over its brow and
bubbles rise round it. The line's ink has grown into the sea itself and curls
away below it in wisps. It floats, needs no umbrella, and at night it glows.
It drifts in the deep and saves its strength, so it tires more slowly, and it
is soft and cool as the deep sea: petting cheers it up more. For its flip it
vanishes in a cloud of ink and appears again on top of it, and in a scuffle
the lights of the deep dance round the opponent's head until it doesn't know
which way to look.

</details>

<details>
<summary>Show how to get it</summary>

Its smarts are 60 or more when it grows up. This rule goes before the others
of the line. While the child is on its way there, its hint colors are deep-sea
indigo and the cyan of its lights.

</details>

### The gargoyle line

This is a line from the ruins.

<details>
<summary>Show the gargoyle line</summary>

| | Stage |
|---|---|
| ![Gargoyle egg](images/pets/gargoyle_egg.png) | **Gargoyle egg** – an egg of old weathered stone, a crack zig-zagging down from its top, moss on its crown and ivy climbing up one side, on a broken flagstone |
| ![Gargoyle baby](images/pets/gargoyle_baby.png) | **Baby** – a stone puppy sturdy like a carved block, with a broad pale muzzle, heavy floppy ears, horn nubs with a tuft of moss between them and stubby slate wings |
| ![Gargit](images/pets/gargit.png) | **Child: Gargit** – a sturdy young gargoyle dog on four stumpy legs, a big square head, a block of a body with a crack, two little slate wings held up proudly and an arrow-tipped tail |

The stages last as long as the slime's. What the adults keep is the small
stone wings.

![Gargard](images/pets/gargard.png)

**Gargard**, a gargoyle that has become a piece of wall, a guardian on its
plinth. It crouches square and blocky, its haunches and plinth one block of
masonry; its stone wings are laid forward round its chest like a shield with
iron rims, and it rests its paws on the shield's edge and peers over it under
heavy brows, curled horns on its head. A stone guard lives on little, so it
gets hungry more slowly, and being stone it gets sick less often. For its bow
it turns to stone and wakes again with a shake, and in a scuffle its stony
gaze turns the opponent to stone, so that it loses its move that round.

![Fountaingle](images/pets/fountaingle.png)

**Fountaingle**, a gargoyle that has become a waterspout. Its body is long and
level like a spout leaning out from a roof, its back is a gutter with water
running in it, and rain gushes out of its wide-open mouth in an arc; its two
little wings are swept back, and its arrow-tipped tail curls up behind. It
loves the rain and needs no umbrella. Rinsed all the time, it gets dirty more
slowly, and a cool splash makes petting mean more to it. For its flip it
leaps head over heels and leaves an arc of water in the air, and in a
scuffle the water runs under the ground and shoots up under the opponent as a
fountain.

</details>

<details>
<summary>Show how to get them</summary>

| Form | Rule |
|---|---|
| Fountaingle | it is raining when it grows up |
| Gargard | everything else |

From its second day on, the edges of Gargit's wings show where they are
heading: shield iron and brick red for Gargard, verdigris and water blue for
Fountaingle.

The values are in `core/src/life.ts`.

</details>

#### The secret form

*It is about the clock.*

<details>
<summary>Show this form</summary>

![Bellfry](images/pets/bellfry.png)

**Bellfry**, the gargoyle that has become the bell of its own tower, the
legendary form of its line and the biggest. Its body is a bronze bell flared
at the hem, with the dog's head on top where the bell hangs from; its stone
wings have grown into two tall pointed tower roofs with slate tiles and a
golden finial on each, and its tail is the clapper, swinging out under the
hem. It needs no umbrella, and at night it glows warm. It sings to itself, so
its mood sinks more slowly, and a heart makes it ring: hearts mean more to
it. For its spin it swings itself like a bell and rings, and in a scuffle it
strikes itself with all its might and a shock wave rolls to the opponent.

</details>

<details>
<summary>Show how to get it</summary>

It grows up in the noon hour, between 12:00 and 12:59. This rule goes before
the others of the line. While the child is on its way there, its hint colors
are two shades of bronze.

</details>

More lines are ideas so far; the [issues](https://github.com/mLampir/blobling/issues) collect them.
