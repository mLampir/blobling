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

Three guardians have been sitting on a rare egg:

| Area | Guardian | Egg |
|---|---|---|
| Meadow | Crowcomb | **beak egg** |
| Stream | Ripplesprite | **duck egg** |
| Cave | Gloompeep | **ember egg** |

A guardian leaves its egg behind the first time a pet gets past it, so every
pet can earn each of them once. A pet that got past a guardian before that
guardian had an egg for it (or while there was no room for one among the
finds) finds the egg at the end of the path on a later trip to that area.
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

The cave has no wild pets so far. The ember, duck and beak lines have none:
their eggs come from guardians. A pet of one of them with a slime for a friend
can still lay an egg of its own line, though.

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

Only playing counts for this line (training and the guessing game are playing,
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

More lines are ideas so far; the [issues](https://github.com/mLampir/blobling/issues) collect them.
