# How the pet works

A virtual pet lives on the LED panel. You look after it from your phone; the
panel is its home. This page describes the rules of the game. The numbers
quoted here are constants at the top of the modules in `app/pet/`, so they are
easy to tune.

![Preview of the pet scene](pet_preview.png)

## Principles

- **The Pi is the single source of truth.** Stats, time and randomness live on
  the Pi only. The phone shows the state and sends commands; it never
  calculates anything itself.
- **Ambient first.** The panel hangs in a living room. The pet should be calm
  and pleasant to look at, and show the time and the weather along the way –
  not a gadget that nags.
- **Forgiving.** The pet never dies, and a week away doesn't ruin anything.
  Neglect makes it sad or sick, and that can always be fixed.
- **The phone is your hand.** The app doesn't mirror the panel. You do
  something on the phone and watch the effect on the panel.

## Stats

Five stats run from 0 to 100, and higher is always better. A stat below 25 is
critical: an icon pulses on the panel and the matching item glows in the app.

| Stat | Awake, per hour | Asleep, per hour | Notes |
|---|---|---|---|
| Satiety | −5 | −2 | full to empty in about 20 waking hours |
| Energy | −2.5 | +12 | drops twice as fast in the hour before bedtime |
| Mood | −2 | −0.5 | another −2 for every critical stat |
| Hygiene | −2 | −1 | another −3 for every poop lying around |
| Health | – | – | −2 while two or more stats are critical or the pet is sick, +1 while all are above 50 |

A poop appears one to two hours after a meal (three at most). With health
below 30 the pet can get sick, which only medicine cures. Every now and then
it gets bored and loses a little mood, so playing stays worthwhile.

Three meals, two play sessions and one cleanup a day keep the pet happy. A
day alone leaves it with about two thirds of its energy in the evening, enough
to play and go on a trip. With
no care at all it is hungry after about half a day and grumpy after a day.
After a day and a half Grandma takes it in (see
[At Grandma's](#at-grandmas)), before it gets sick.

The simulation runs in fixed one-minute steps with seeded randomness. After a
restart the Pi simply catches up, with the same result as if it had never
been off, so a pet nobody looked after meanwhile is at Grandma's.

## Looking after it

The Pi checks every action and may refuse it – the pet then shakes its head,
and the app says why.

| Action | Effect | Refused when |
|---|---|---|
| Meal | satiety +40, a little mood and health | it is full or asleep |
| Something from the bag | see below | it isn't there, the pet won't eat it, or it is asleep |
| Play (ball) | mood +20, energy −10, satiety −5 | energy is below 15, or it is asleep |
| Sleep / wake up | puts it to bed or wakes it | it isn't tired yet (daytime, energy above 80) |
| Clean | removes the poops, hygiene back to 100 | everything is already clean |
| Pet | mood +5, bond +2 (counts once every two minutes); rubs a shivering pet warm | – |
| Medicine | cures sickness | it isn't sick (and it sulks a little) |

Doing the same thing over and over is worth less each time (playing three
times in a row gives +20, +12, +6), so there is no point in spamming.

Every fifth counted petting, a heart falls from the sky and the pet catches
it.

**The bag.** Apart from the meal, which is always there, nothing to eat comes
out of thin air. What there is lies in the bag: fruits of the plant's kinds
(from a friend's gift or found at home), food from trips and seeds, up to three
of each fruit and food. A fruit has the same effect as one from the plant and
cheers the pet up a little more; food from trips is described under
[Trips and finds](#trips-and-finds). Every form has one favorite, which cheers
it up a lot (mood +20), and one thing it won't eat: it turns its head away, and
the thing stays in the bag. The app marks both (❤ and ✕) once they have been
tried with this form; a new form has tastes of its own. Since there is never
much of anything, finding out what a pet likes takes trying what there is.

**Weight.** Meals and food add weight; playing, the guessing game,
training and trips take it off, and by itself the weight drifts back to the
ideal. A meal adds 1 g, a fruit half a gram and a honeycomb 2.5 g; a round of play
burns 2 g and every stop on a trip half a gram. A pet that is too heavy tires
faster and looks visibly wider on the panel; one that is too light (only from
going hungry) gets sick more easily. For a heavy pet, the app only hints
that it needs exercise.

**Bond.** Petting, playing and caring build a bond, shown as zero to five
hearts. It hardly ever wears off. A strong bond slows down the loss of mood
and makes tricks easier to learn.

## Day and night

Bedtime is the night mode from the web interface (22:30–07:00 if night mode is
off). The pet gets tired about an hour earlier, falls asleep by itself at
bedtime at the latest, and wakes up in the morning once it is rested. Tucking
it in yourself earns a little mood. Woken at night, it is grumpy, stays up for
half an hour and goes back to sleep. If it runs out of energy during the day,
it takes a nap.

The sky follows the real time of day, with sunrise and sunset for your
location, a moon and stars at night. Clouds, rain and snow come from the real
weather; in rain or snow the pet holds an umbrella.

**Cold mornings.** When it is below 5 °C outside, the pet wakes up shivering,
and its breath shows. Rub it warm with the petting gesture: that is worth a
little extra mood and bond. It costs nothing if you don't; after an hour the
pet has warmed up by itself. Some pets never shiver, and some things a pet
can find keep the cold away. Which ones is for you to find out.

## The house

At first the pet sleeps outside, wherever it happens to be. The house is the
long-term goal of the home: every pet that gets past the mountain's guardian
for the first time adds a step, and like the finds it stays from one pet to
the next. So the whole house takes three pets.

| Step | Looks like | Spots inside |
|---|---|---|
| Hut | a dome of thatch with an open doorway; inside, a bed of leaves | 1 |
| Cabin | wooden walls, a thatched roof, a window with a flower box; inside, a straw bed, a blanket and a candle | 2 |
| House | a half-timbered house with a tiled roof and a chimney; inside, a real bed, curtains, a lamp and a picture of the old hut | 3 |

The house stands at the left of the garden, and the plant next to it. The pet
sleeps inside, at night and for a nap: it hops to the door, gets smaller as it
goes in, the door shuts and at night the light goes on. Then the panel shows
the inside, where it comes in and lies down in its bed. In the morning it
stretches, goes out and comes back into the garden. Everything else happens
outside, rain or not. Through the window (in the hut, the doorway) the real
sky shows, with the weather, the moon and the stars; at night the candle or
the lamp keeps the room just bright enough to make out.

Each step has spots for decorations inside. Decorations go outside first, and
what doesn't fit there goes into the house; the snowman always stays outside.
A tap on the house in the app looks in for a moment, so what stands inside
can be seen in the daytime too.

## Growing up

| Stage | Lasts | Notes |
|---|---|---|
| Egg | up to 1 hour | only warming helps; every time brings hatching forward by 15 minutes |
| Baby | 3 days | gets hungry and tired faster, can't get sick |
| Child (Bloblet) | 7 days | keeps a care diary; grows a lure with a glowing bulb |
| Adult | forever | one of three forms |

When a stage is over, the pet sparkles and the app offers **Hatch** or
**Evolve**. You hold the button while standing in front of the panel and watch
it happen. If nobody does that for a day, the pet evolves by itself, unless
it has gone to Grandma's by then (see [At Grandma's](#at-grandmas)).

Growing up can be sped up. A later pet may bring home the **ember stone**, a
decoration that glows from inside. While it is set out, an egg, a baby and a
child grow 30 % faster: the baby in about two days, the child in about five.
A grown-up has no use for it.

The care diary of the child stage decides the adult form: how well the pet was
looked after, how often it was played with, petted, bathed and taught tricks,
how often it went on a trip and how many scuffles it had. These count for the
whole child stage, so a day away can be made up on the others. For two lines,
the world at the moment it grows up decides instead. Each
form has a character of its own, with small effects on the game. From its
second day on, the bulb on the child's lure shows by its color which form it
is heading for.

The forms, their characters and the rules for getting them are in
[pets.md](pets.md). That page keeps everything folded shut that would spoil
finding it out by yourself.

An adult stays forever. A new egg moves into a house of its own next to it
(see [Several pets at home](#several-pets-at-home)); only when the home is
full, you pick a pet that goes to rest in the ancestors' gallery, from where
it can come home again.

The **album** is the long-term goal: to have had every form once. It has one
slot for each form there is (every egg, baby, child and adult of every line),
and a form fills its slot as soon as one of your pets has been it. A form not
met yet stays an empty slot, with no picture and no name, so the album shows
how many are still missing but not what they are or how to get them. The album
belongs to you, not to one pet: it stays when a new egg starts, and it travels
with the pet's file. A file from before the album fills it in from the
ancestors.

Not every egg is the same. A pet can bring a **rare egg** home from a trip
(see [Guardians](#guardians)). What hatches from it is not a slime: it is a
line of its own, with its own baby, child and adult forms and its own rule for
which adult it becomes. Everything else works the same for it.
Some lines have no guardian's egg: the only way to them is a friend of that
line (see [Friends](#friends)). [pets.md](pets.md) has the lines, folded shut.

An adult can also lay an egg of its own, once it has made a friend (see
[Friends](#friends)). Such an egg carries an **heirloom**: a quarter of each
battle stat its parent had when the egg was laid. Whatever hatches from it
starts with that instead of zero.

There are two ways to a new egg, both in the diary:

- **Brood** an egg, next to the egg among the finds. That works at any time,
  whatever stage the current pet is in. An egg is kept until you do; it is
  never lost, and up to nine are kept.
- **Start over with a usual egg**, under *More*. There is always one of
  those, and it starts from zero.

**What stays, and what doesn't.** Everything the pets have found belongs to
the home and stays: seeds, decorations, hats and eggs, the decorations that
are set out, the plant and the house. That includes what is still in the backpack, an
egg in the nest and a gift that hasn't been unwrapped. The new pet itself starts from zero: its stats, tricks, bond,
friend and the areas it knows the way to; and its training too, apart from
the heirloom of its egg.

### Several pets at home

Up to four pets live at home, each in a house of its own along a street. So a
favorite can stay while new eggs are raised for the album.

- **All of them live the game.** Each has its needs, goes on trips, scuffles,
  makes friends, grows up and calls you, whichever one you look at. One that
  nobody does anything with for a day and a half goes to Grandma's, like a
  single pet (see [At Grandma's](#at-grandmas)).
- **Switching only moves the camera.** Small pictures of the other pets sit
  at the top, next to the name; a tap on one looks at it, and the picture pans along
  the street to its house. Nobody moves: each pet keeps its own house, plant
  and decorations. A small dot on a picture says that pet needs something.
- **One store for all.** The finds, the food and the eggs belong to the whole
  home. A hat or a decoration exists once: put it on one pet, and it comes off
  the other.
- **A new egg** (or an ancestor brought home) asks where it should live: in a
  new house while there is a free place, or in the place of one of the pets.
  A pet that makes room goes to rest in the ancestors' gallery; an egg that
  hasn't hatched is given up. Pets only leave by your choice.
- **The ancestors' gallery** keeps the pets that went to rest, frozen: they
  lose nothing, don't grow on and don't get older. **Bring home** next to one
  of them brings it back as it was when it left, into a free house or in
  someone's place. Ancestors from before the gallery kept the pets are only
  pictures.
- **Neighbours get together** for a quarter of an hour once every four
  hours, like a friend's visit (which comes first), and play the same games.
  With three or four pets, who meets whom is drawn anew each time. A pet that
  knows a trick shows it, and the other one copies it: a quarter point, from
  the same allowance as practicing alone, so it never learns a trick that
  way. A child counts the time together as half a playtime.
- **At night** two of them sleep side by side. Once there is a house, both
  sleep inside.

Getting together follows the clock only, so it is the same whether anybody is
looking or not.

**On the display** the panel shows one pet at a time. It follows the pet last
picked on a phone, and when two people play with different pets at once, it
stays with a pet until that one has been left alone for half a minute. On the
display's settings page a pet can be pinned, so the panel always shows that
one. A switch pans along the street there too.

**The phone and the display** each have a home of their own, with their own
places. Connecting the app to a display moves no pet; the pictures at the top
show the pets of both, the phone's with a small phone sign. Away from home,
with the display out of reach, the app shows only the phone's own pets.

- **Take along on this phone** (under *More*, for a pet of the display) moves
  it into the phone, with its house: it lives there until it is brought back,
  also when the app is opened at home.
- **Bring to the display** (for a pet of the phone) moves it into a house at
  the display. Both ask where it should live, as a new egg does. A phone whose
  last pet went to the display stays empty, also without the display; a new
  egg comes only when you ask for one.
- **A pet lives in one place only.** Every pet carries a move number, and the
  display remembers the last one of every pet that moved, so an old copy (an
  old save file, a phone's backup) is turned away. One pet always stays at the
  display.
- **A lost phone:** the display keeps the pets phones took along, sealed, and
  its settings page can fetch one back. The copy on that phone no longer counts
  then.
- **Copies from before pets could move** (the same pet on the phone and at the
  display) are asked about once: you pick the real one, and the other rests
  among the ancestors.

## Tricks

The pet can learn four tricks. Take the baton from the app's tray and draw
the move from the table over the pet; it tries the trick on the panel. While
the baton is in your hand, stroking waits; a tap on it puts it back. *Adventure*
→ *Tricks* lists the moves and how far each trick has got.

Practicing costs energy and needs a break afterwards (below). A trick it
already knows can be shown any time, for free and without a break; showing
the same one over and over just cheers it up less each time.

| Trick | Gesture | Practice needed |
|---|---|---|
| Bow | swipe down | 3 points |
| Spin | a round circle, almost all the way | 5 points |
| Dance | back and forth, flat, at least twice | 7 points |
| Flip | swipe up | 10 points |

One practice is worth a point (up to one and a half with a strong bond), and
several in a row are worth less, for the bond too, so learning takes a few
days. After each practice the pet needs a break before the next one: a minute,
then three, ten and twenty minutes if you keep going (counted over two
hours). At first the pet mostly flops over halfway; the further along it is,
the more often it works. Once it knows a trick, it shows it off by itself now
and then when it is in a good mood. While nobody is there, it practices a
little on its own (see [While nobody is there](#while-nobody-is-there)).

Every adult form, and some children, do one trick in their own way. It looks
different on the panel, but the gesture and what it does are the same.

## The guessing game

"Left or right?" has five rounds: you guess which way the pet will jump. Three
hits win. It costs energy like playing does and cheers the pet up – more so
if you win.

## Training

The pet has three battle stats, each from 0 to 100. They only matter on trips,
when somebody gets in its way. You train them from the app (**Train**) while
watching the panel:

| Stat | Exercise | In a scuffle |
|---|---|---|
| Strength | Swipe the ball up as hard as you can. The pet throws it as high as your swipe was fast. | a trick that works counts double more often |
| Speed | The pet crouches, and after two to five seconds a signal lights up above its head. Tap as soon as you see it – the Pi stops the time. | gets out of the way more often when a trick didn't work |
| Smarts | The pet hops a sequence of directions (three at first, up to six). Swipe them back in the same order. | picks the right trick more often |

A perfect exercise is worth 4 points. Training counts as playing in the care
diary, costs energy and a little satiety, and the same exercise again within
two hours is worth less. Between two exercises, whichever they are, the pet
needs the same growing break as between tricks (one, three, ten, twenty
minutes). A tap before the signal, or a sequence that is all wrong, brings
nothing and costs nothing, not even a break.

## Trips and finds

From the child stage on, the pet can go on a trip: in *Adventure*, pack the
backpack and send it off. It needs to be awake, healthy, reasonably fed and rested, back well
before bedtime, and it won't leave in a thunderstorm. Woken early in the morning, before
bedtime is over, it may already set off.

Packing, you pick the destination and up to two things to take along. A snack heals a heart on the way, and a ball distracts
one opponent (but not a guardian).

A trip takes one to one and a half hours. The panel shows the pet hopping
through the landscape, stopping now and then to rest or to hold up something
it found. If it gets too tired or hungry, it turns back; you can also call it
home. A second trip on the same day finds less.

Every trip goes into the **travel diary** (*Diary* → *Trips*): where the pet
went, on which day and for how long, what it found, whom it scuffled with and
how that went, a wild pet it met, and whether it ate its snack or turned back.
It keeps the last 30 trips of this pet; a trip it was called straight back
from doesn't count.

Back home, it keeps the backpack on until you tap **Unpack** – so you are
there to see what it brought:

- **Seeds** go into the bag and are dragged from there into the scene like food. One plant grows at a time
  (a day to grow, then one fruit a day, twice as fast in real rain). The pet
  eats a ripe fruit by itself when it needs it. After three fruits the plant
  wilts. Berries fill it up, sunflower seeds wake it up, giggle cherries cheer
  it up. The rare healing herb is good for its health, and its blossom cures a
  sickness without medicine.
- **Food** – every area has one kind, and up to three of each are kept in the
  bag. It fills the pet up a little; what it is worth carrying home for is
  what it leaves in the pet until it is used:

  | Area | Food | What it does |
  |---|---|---|
  | Meadow | Honeycomb | one more heart on the next trip |
  | Mushroom forest | Hazelnut | the next trick practice counts double |
  | Stream | Watercress | the next training exercise counts double |
  | Cave | Glow berry | on the next trip it finds something at every stop where nothing else happens |
  | Mountain | Pine cone | the next trip doesn't tire it or make it hungry, and brings as much as the first trip of the day |

  These don't add up: while one is still waiting, the pet won't eat the same
  food again. Nothing is combined or cooked, and the plant stays the one that
  feeds the pet by itself.
- **Decorations** stand in the scene, two at a time, and more in the house
  (see [The house](#the-house)). Some glow at night. One
  of them does something: the ember stone from the cave makes a young pet grow
  faster, and the pet snuggles up to it now and then.
- **Hats** – it wears one at a time.
- **A rare egg** is kept until you brood it (see [Growing up](#growing-up)),
  like an egg your pet has laid itself.

What there is to find depends on the area and on the real weather: some things
only turn up in rain or snow. Every decoration and every hat exists only once,
and finds are kept from one pet to the next, so a later pet brings home what
is still missing.

**Areas.** There are five, and they open up one after the other: the meadow,
the mushroom forest, the stream, the cave and the mountain. Only the meadow is
open from the start. Each area has a guardian, and the way to the next one
leads past it (see [Guardians](#guardians)). The healing herb only grows in
the cave and on the mountain. Inside the cave there is no sky and no weather.

## Opponents

At roughly every third stop on a trip, somebody is in the way:

| Area | Opponent | Favorite move |
|---|---|---|
| Meadow | Bumblebop, a fat bumblebee with a boxing glove | pounces |
| Meadow | Diggle, a mole with a miner's helmet and lamp | charges along the ground |
| Meadow | Carrotnose, a snowman stacked upside down, its carrot pointing backwards (only in snow) | curls up |
| Mushroom forest | Prickleroll, a hedgehog that carries a toadstool on its spines | curls up |
| Mushroom forest | Drizzleshell, a snail with a rain cloud for a shell (only in rain; tougher than the others) | charges along the ground |
| Stream | Ribbop, a frog whose throat is a bubblegum bubble | pounces |
| Stream | Sidleclaw, a wind-up toy crab with a key in its back | charges along the ground |
| Stream | Puddlin, a puddle with a paper boat for a hat (only in rain; tougher than the others) | charges along the ground |
| Cave | Echoflit, a bat with ears like gramophone horns | pounces |
| Cave | Glintbug, a beetle that is a geode: a plain gray stone when it curls up | curls up |
| Mountain | Tumblesnow, a mountain hare with a lost mitten pulled over one ear: curled up, it is a snowball | curls up |
| Mountain | Craghorn, an ibex with a big cowbell | charges along the ground |
| Mountain | Duskwisp, a dandelion seed that glows and drifts (only around sunset; tougher than the others) | pounces |

Some only come out in the real weather, or in the three quarters of an hour
before and after the real sunset. When they can come out, they are twice as
likely to turn up as the others.

The pet always deals with them alone – a scuffle, not a fight, and you can't
help while it lasts. Everything you can do happens beforehand: care, training,
tricks and what goes into the backpack. The panel shows up to five rounds. In
each one the opponent makes a move, and the pet answers with a trick:

| The opponent | The trick that answers it |
|---|---|
| pounces | bow (it ducks) |
| charges along the ground | flip (over it) |
| curls up | spin |

- **Smarts** decide how often the pet picks the right trick: one time in
  three without training, nearly always at 100.
- **Tricks:** the right trick works as often as it has been learned. One the
  pet doesn't know at all always flops.
- **Strength** makes a trick that worked count double more often.
- **Speed:** when a trick didn't work, the pet may still get out of the way
  (half of the time without training). Otherwise it gets knocked over.
- **Bond:** from three bond hearts on, the pet holds out once per scuffle
  instead of being knocked over for the last time.
- **Weight:** a pet that is too heavy has more force and less speed; one that
  is too light, the other way round.
- **Special move:** an adult that knows how to dance lets its species' special
  move go after every second trick that worked. It counts double. Every form
  has a move of its own for it: Angloop flashes its lure, for example.

An opponent gives in after three hits (Drizzleshell, Puddlin and the ones in
the cave and on the mountain after four, Duskwisp after five) and leaves
something behind, if there is anything left to find. The pet gives in when it has been knocked over three
times. If neither happens within five rounds, they go their own ways.

You can watch a scuffle again in the app, the way the panel showed it: the
scuffles of the last trip from the home screen, until the next trip sets off
or you have seen them, and the latest ten from the diary, where each one has
a ▶.

### Friends

Not everybody on a trip is in the way. An adult that has no friend yet, or
whose friends have all built a nest with it (see below), sometimes meets a
**wild pet**, a grown-up of some line that lives out there.
There is no scuffle: the pet shows three of its tricks, and the wild pet
watches.

- A trick works as often as it has been learned, as in a scuffle. A pet in a
  bad mood only manages half as often.
- If two of the three work, the wild pet is impressed and the two are
  friends. Otherwise it hops on, and the pet may meet another one on a later
  trip.

A friend comes to **visit**: it hops in on the panel, stays for ten minutes
and leaves again, once or twice a day while the pet is at home and awake. A
visit counts if the pet is in a decent mood when the friend leaves (mood 50
or more); it cheers the pet up a little, too.

While the friend is there, the two **play**: a game, a little rest side by
side, the next game. They throw a ball to and fro, the friend copies a trick
the pet shows it (each in its own way), or they hop in step and then by turns.
The pet only joins in when it is in a decent mood, awake and not busy with
something else; otherwise the friend waits by its side. Playing is something
to watch; what counts for the visit is still the pet's mood when the friend
leaves.

Now and then a visit that counts brings a **gift**. The friend leaves it on
the ground, wrapped, and it stays there until you tap **Unwrap the gift**; no
new one comes while it is lying there. Mostly there is a fruit in it, of the
same kinds as the plant's, and it goes into the bag (if there are three of it
already, the pet eats it straight away). Rarely it is a seed, as long as there are fewer than nine of that
kind. The visit that builds the nest brings no gift; the egg is the present
then.

After five visits that counted, the two build a **nest**, and an egg lies in
it. The egg is of the pet's own line or of the friend's, and it carries the
pet's heirloom (see [Growing up](#growing-up)). The egg waits in the nest until
you tap **Collect the egg**; then it is among the finds, to be brooded whenever
you like. While the nest is full, or there are nine eggs already, the next nest
waits.

The friend **stays** after that. It comes less often, about once a day, still
plays and still brings a gift now and then. For two weeks after a nest its
visits don't count; after that, five more that count build the next nest. So a
friend brings an egg about every three weeks at most.

Once all its friends have built a nest with it, the pet can make another friend
on a trip, up to three. They come one at a time, never straight after each
other.

Which wild pets live where is in [pets.md](pets.md), folded shut. A line
whose egg a guardian gives is never among them.

### Guardians

Every area has a guardian. It is twice the size of the others and waits at the
end of the path: at the last stop of a trip, if the pet gets that far. A
scuffle with a guardian works like any other, with three differences: it lasts
up to seven rounds, a ball doesn't distract it, and it takes more hits.

| Area | Guardian | Favorite move | Gives in after |
|---|---|---|---|
| Meadow | Crowcomb, a rooster whose comb is a crown | pounces | 4 hits |
| Mushroom forest | Mosswart, an old toad whose back is a mossy boulder | curls up | 5 hits |
| Stream | Ripplesprite, a cocky water drop with a breaking wave for a quiff, surfing on its own wave and twirling a hoop | charges along the ground | 6 hits |
| Cave | Gloompeep, two big glowing eyes in the dark | pounces | 7 hits |
| Mountain | Frostfluff, a yeti that is a giant bobble hat | charges along the ground | 8 hits |

Once the pet has got past a guardian, it knows the way to the next area, and
that guardian lets it pass from then on. A draw or a lost scuffle changes
nothing: the guardian is there again on the next trip. A child with two tricks
can get past Crowcomb with some luck; for the later ones the pet needs its
tricks and a good deal of training. Progress counts per pet: a new egg starts
in the meadow again.

Some of the guardians have been sitting on a rare egg. A guardian leaves its
egg behind the first time a pet gets past it, so every pet can earn it once.
If the pet got past it before (or there was no room among the finds), the egg
waits at the end of the path on a later trip to that area. Getting
past the last one, on the mountain, adds a step to the house (see
[The house](#the-house)).

**Hearts.** The pet sets off with one to three hearts, depending on its
condition that day (the average of satiety, energy and health: two hearts from
45, three from 75). A lost scuffle costs one. At zero it heads home – merely
tired, and it keeps what it has already found.

## While nobody is there

The pet has a life of its own. Every one to two hours, when it is awake, at
home, healthy and not too tired, and nobody has done anything with it for a
quarter of an hour, it finds something to do:

- It **plays with the ball by itself**: a little mood, much less than playing
  together, for a point of energy.
- It **practices a trick** you have started teaching it. It gets a quarter of
  a point each time, but only half a point between two practices with you,
  and it never learns a trick alone.
- It **builds something**: a little stone tower, or a drawing scratched into
  the ground. When it really snows, it would rather build a tiny snowman,
  and leaves footprints.

**Traces.** What it did alone stays in the scene, so that somebody walking
past the panel sees that something happened: the ball lies where it rolled,
the tower stands, the drawing stays in the ground, the snowman stands in the
snow. There is only ever one: as long as something lies around, it doesn't
build anything new (playing with the ball again only moves the ball). It
stays until somebody does something with the pet, from the app or on the Pi;
a snowman also melts once it is warmer than 3 °C. It doesn't step in front
of what it left behind, so it can be seen.

None of this counts in the care diary, so it doesn't change which form a
child grows into. Like everything else, it happens in the simulation: what
the pet did is the same whether or not anybody was looking at the panel.

**Finds at home.** Now and then, about once a day, the pet finds something
small at home by itself: mostly a fruit of the plant's kinds, rarely a seed
(as long as there are fewer than nine of that kind). It works like a friend's
gift, but it isn't wrapped: it lies next to the plant, in front of everything
else, until you tap **Pick up**, and nothing new turns up while it is there.
Like a gift, it goes into the bag. Unlike what it builds, it stays when somebody does
something with the pet, and it is kept for the next pet. A baby finds things
too.

**Habits.** The pet notices when it is usually fed or played with. A time
of day becomes a habit when somebody fed it, played with it or started the
guessing game at about that time (within half an hour) on at least three of
the last seven days. About twenty minutes before such a time it goes to the
nearer edge of the panel and waits there, leaning out and now and then on
tiptoe, until its meal or game comes, or the time has passed. Once it has
been fed or played with in the last hour, it doesn't wait. It only waits when
it is awake, at home, healthy and not busy, and it shows this only by how it
stands: no icon, no need and no message, so it never nags. What it does by
itself never makes a habit; only what a person does counts.

**Back after a while.** The Pi remembers when somebody last did something
with the pet, from any phone. If that was six hours ago or more, the app
tells once, when it is opened, what happened in the meantime: what the pet
did by itself, fruits it ate, visits, trips and what came of them. The night
counts too, so it also has something to tell in the morning.

The pet tells it as a little story in its own words, a paragraph for each
day (the last three at most): up to three sentences, the things that matter
most (growing up, a nest, a new way, a friend, a scuffle) before the small
ones (a fruit, the ball), told in the order they happened. Rain or snow while
it was alone opens the day ("It rained in the morning, so I sat under my
umbrella"). If it was at Grandma's, her postcard says how long it stayed
with her and what they did together.

**It calls you.** In the app from the stores, with the pet on the phone, it
calls with a notification when it needs you: once it is really hungry, dirty
or sad (the stat is critical), or when it is sick. Only for something new: a
need it already had when you left the app doesn't count, and neither does
tiredness (it goes to sleep by itself) or a single poop. Only one call is ever
waiting, and never at night: a need that comes up while it sleeps or at
bedtime waits until it is up in the morning. Opening the app takes the call
back. The app asks whether the pet may call the first time you feed it.
The pets at a display don't call: the app can't know what happens there in
the meantime, and somebody else may already have seen to them. The phone's own
pets call also while it is connected.

### At Grandma's

When nobody has done anything with the pet for a day and a half (from any
phone), it goes to Grandma's, so that a week away doesn't leave it hungry and
sick for days. Somebody who comes once a day keeps looking after it
themselves. It hops off to the right as soon as it is awake and at home: in
the morning if it is asleep, after the trip if it is on one. An egg goes too.
With several pets at home, each one goes by itself, when nobody has done
anything with it. With the Pi off, or the app closed with the
pet on the phone, it is the same as if it had been running.

- The panel shows its home without it: the plant, the house and whatever it
  left lying around stay; the poops are gone, Grandma cleaned up.
- At Grandma's time stands still for it, as in the ancestors' gallery:
  nothing runs low, it doesn't grow on and doesn't get older, and a child's
  care diary waits. So a child doesn't grow up while you are away, and you
  are there when it does.
- The app says it is at Grandma's and offers **Fetch from Grandma's**. A tap
  brings it home: it hops in from the left, looked after (every stat at least
  50, not sick), and the app tells what it did before it went, with Grandma's
  postcard at the end. The plant, the hat and the decorations can be changed
  while it is away; anything else that would need the pet waits until it is
  fetched.
- After that it stays at least a day and a half again, even if nobody does
  anything with it.

## The app

Four tabs along the bottom: the pet (named after it), *Adventure*, *Diary* and
*More*.

- **The pet** fills the screen: the scene, with the sky going on above it, the
  pet's name, form, age and mood at the top, and the **Sleep** / **Wake up**
  button next to them; with several pets at home, the pictures of the others
  too, to switch to them. Stroke the pet itself to pet it (an egg
  or a shivering pet is rubbed warm); the rest of the scene doesn't count,
  apart from the house: a tap on it looks inside.
- Below it, the **needs** as five small meters. A tap on one says what helps.
  When the pet is ready to evolve, it says so here (an egg also tells when it
  will hatch), and so do a trip that is on, a backpack to unpack, a gift and
  what the pet found at home.
- At the bottom, the **tray**: the meal, the bag, the ball, the sponge, the baton, and medicine
  when it is sick. A tap on the bag opens it in place of the tray. Drag a thing onto the pet and
  let go: food dropped right on it is eaten at once. Dropped anywhere else in
  the scene, it lands there and the pet goes to get it. The sponge is rubbed
  over the pet to clean it. Connected to a Pi, things can also be flicked up,
  as before.
- **Adventure** has the trip, the tricks, the training and the guessing game.
  The tricks, the training and the game take the place of the needs and the
  tray, below the scene, so the pet stays where it is and answers there. On a
  tall phone the scene grows into the sky above it. Packing for a trip needs
  no pet in sight: it covers the scene too and fits any phone without
  scrolling, with the button to set off at the bottom.
- **Diary** has one tab each for the history (where a scuffle can be watched
  again), the stats (with weight and bond), the trips, the finds and the
  album, with the ancestors below it, each one that can come home with a
  button for it. Trips and finds show up once there are
  any, the album once the first egg has hatched.
- **More**: renaming and starting over with a usual egg, sound on or off, the
  weather (off, a fixed place, or following the phone) and connecting to an
  LED display.

The phone buzzes softly with the pet's answers (in the app from the stores,
and in a browser that can vibrate; the phone's own vibration setting
applies): a light tick for a hand on the pet and for a step of an exercise,
a short one when it does what it was asked, a double one when it won't, a
longer one for something new (a trick learned, a big step in training, a
game won) and a firm one when it evolves. Plain buttons and menus stay
still, and quick strokes are spaced out, so it stays a touch and not a
rattle.

With each buzz comes a short sound, a soft chiptune effect that fits the
pixels: a boop for a tap on the pet, a plop when a thing lands, a little
fanfare for a trick learned or a game won, a lullaby when it goes to bed.
Both come from one call in the page (`feel` in `app/pet.html`). The sounds
are small WAV files in `app/pet/sounds/`, built into the app's script and
played by `app/src/sound.ts`; like the sprites they are generated, by
`npm run sounds` from the recipes in `tools/sfx.ts`. They can be turned off
under *More*. With a Pi they come from the phone too; the Pi stays silent.

Connected to a Pi, the screen is the same; for a pet of the display, the
scene is then the panel's own picture. Those pets live on the Pi: they go on
with their day and can be looked after there while the phone is off.

On the phone the same page is the Blobling app from the stores, which can
keep its own pet or connect to a Pi; the README explains how.

## For developers

| Part | Where |
|---|---|
| Stats, decay, actions, sleep | `core/src/model.ts` |
| Life cycle, lines and adult forms, the album's forms (`FORMS`) | `core/src/life.ts` |
| Weight, bond, guessing game, tricks | `core/src/care.ts` |
| Trips, areas, what is found where | `core/src/trip.ts` |
| What is eaten from the bag, each form's favorite and dislike, and what food from trips leaves in the pet | `core/src/food.ts` |
| Wild pets, friends, visits, their gifts, the nest and the heirloom | `core/src/wild.ts` |
| Battle stats, training, opponents, guardians, scuffles | `core/src/battle.ts` |
| A scuffle watched again in the app | `app/src/replay.ts` |
| Seeds, plant, food, decorations, hats, eggs, warmth (the ember stone, cold mornings), the house and its spots | `core/src/home.ts` |
| What it does by itself, what it leaves behind or finds at home, and what it tells when you come back | `core/src/idle.ts` |
| Going to Grandma's, staying there frozen, and being fetched | `core/src/model.ts` (`GRANDMA_AFTER`, `comeBack`) |
| The story it tells when you come back, and Grandma's postcard | `core/src/story.ts`, texts under `page.story` in `app/locales/` |
| When it calls for you next, and the app's notification for it | `core/src/notify.ts`, `app/src/notify.ts` |
| Habits: the times it is usually fed or played with, and waiting for them | `core/src/habits.ts` |
| Catching up, the state for the app, what is saved, ancestors (resting, and coming home again) and album | `core/src/pet.ts`, `core/src/state.ts` |
| Several pets at home: the houses, the shared store, places for a new egg | `core/src/pet.ts` (`PLACES`, `newEgg`, `bringBack`) |
| Neighbours getting together, sleeping side by side, copying tricks | `core/src/companion.ts` |
| Moving between a phone and a display: move numbers, the sealed copy, fetching back | `core/src/pet.ts` (`release`, `adopt`, `handOver`, `takeIn`, `fetchBack`), `app/src/main.ts` |
| The camera panning along the street (panel and app), and which pet the panel shows | `core/src/street.ts`, `pi/src/display.ts` |
| Everything drawn on the panel | `core/src/scene.ts`, sprites in `app/pet/assets/` |
| Pixel art as text → sprite sheets | `tools/build_blob_sprites.py` |
| Preview of the scene on a PC, pictures for [pets.md](pets.md) | `tools/pet_preview.ts` (`npm run preview`) |
| Checking the values: pets played for weeks with owners of different kinds | `tools/balance.ts` (`npm run balance`) |
| The phone app: the page, and where its pet lives (on the phone or on the Pi) | `app/pet.html`, `app/src/` |
| The Pi's side: web server, display loop, save file | `pi/src/` |

The game logic and the scene are plain TypeScript without any package
(`core/`): they know nothing about files, networks or the panel, and are
covered by the tests in `core/test/`. The app talks to its pet through a
small JSON API under `/api/pet` (`core/src/api.ts`): the Pi answers it over
HTTP, and when the pet lives on the phone the app answers it itself. The state
says which actions make sense right now, so no game rules live in the page,
and a refused action is a normal answer (`accepted: false` with a reason), not
an error.

On the Pi the save file is `/var/lib/led-matrix/pet.json`, written atomically
after every action and every five minutes. The settings page downloads it and
loads one in its place (the replaced pet is kept once as
`pet.before-load.json`). In the app the same save file is a file in the app's
data folder, which the phone's backup takes along to a new phone; in a browser
it is kept in IndexedDB.

### Designing a creature

How a new form of the pet or a new opponent is designed and built. The rules
come from reworking the adult forms: next to a Pokémon, the first versions
looked plain, mostly an object with a face. The examples here are the slime
and Angloop, because the other forms are for players to find out (they are
in [pets.md](pets.md), folded shut).

#### The idea

A new creature should make you think "that one is different".

1. **Two ideas, not one.** Never just "animal X": combine it with a thing or a
   trait. Angloop is the slime and an anglerfish, Drizzleshell a snail and a
   rain cloud, Diggle a mole and a miner.
2. **A creature, not an object with a face.** An animal is one way: you see
   it before the object (ears, snout, horns, wings, paws, a tail). A living
   thing that is no animal works too, as long as it is more than an object
   with a face stuck on it: a face of its own, a part that works like a limb,
   and a way of moving of its own. If the creature lives somewhere or comes
   out in some weather, let what it is explain it (a toad likes the rain).
3. **The character shows.** What a form does in the game should be visible in
   its picture. Angloop has a big mouth and is always a little hungry: it
   grins from ear to ear.
4. **Where it comes from shows.** A form keeps something of what it grew out
   of, and the child hints at it: the bulb of the slime's lure takes on the
   adult's colors (for Angloop a warm gold, the light it will carry in front
   of its brow). The forms of a line stay the same kind of creature: every
   adult of the slime is still a slime, only grown.
5. **Something to look forward to.** Growing up should feel like a reward:
   the adult is bigger and more than the child, and the form for the best
   care is the most impressive one.

#### The look

6. **A face of its own.** Every adult form gets its own eyes and mouths, for
   all the moods the scene asks for (the names in `FACES`). The eyes carry the
   character more than anything else: their shape, the lid, a brow, the
   pupil (round, a slit, sideways). Its normal look is its character, not a
   neutral face: Angloop grins and shows two fangs. Small extras help: a
   crooked tooth, fangs, nostrils, cheeks only where they fit.
7. **Body language.** Arms and feet, even if they are only two or three
   pixels, or whatever stands in for them on an object; a pose. And something
   that is not symmetric: Angloop raises only one of its fins, and its lure
   hangs to one side.
8. **Three colors.** A main color, a second one for larger parts (belly,
   horns, a cap) and a small accent that stands out (the iris, the claws).
   Angloop is teal, orange and gold. One color in three shades looks
   flat, and on the LED panel clear colors read better than fine shades.
9. **The silhouette reads.** Filled in with one color, the creature is still
   recognizable at 32 pixels. A rounded rectangle is not a silhouette.

#### Movement

10. **It moves like what it is.** The slime hops. A creature with feet walks
    (a `walk` animation). One that jumps by nature, like a toad, walks and
    hops now and then (`WALK_HOPS`), and its jump frame shows how it jumps:
    the hind legs stretch out. Jumps for joy stay jumps for everyone.
11. **Special abilities are for tricks.** Wings, a tail, a gulp of steam don't
    belong in the everyday walk, where they soon look like any other jump.
    They show in a trick done in its own way (`OWN_TRICKS`: a creature with
    wings flutters through its flip; the gesture and the effect stay the
    same), in its special move in a scuffle, or now and then while it stands
    around. Every adult form has one trick of its own and a special move
    that no other form uses: a move of its own (`special`) and its own
    particles (`hit`).

#### How to work

- **Draft first.** Draw in a scratch script that changes the palette and the
  grid of `tools/build_blob_sprites.py`, and render it large: every face, every
  pose (idle, squash, stretch, flat, sleep, walk). Put the old and the new
  version side by side.
- **Half and mirror.** Draw the left half, mirror it (light comes from the top
  left, so the right side gets the shadow), then break the symmetry by hand.
- **In the scene.** Look at the creature in `npm run preview`: with hats, in
  the rain, on a trip, as a visitor and as a wild pet coming in, and as a GIF
  for the movement.
- **The rules of the panel.** Black is simply "off", so outlines inside a
  sprite use a dark shade of the body color; dark grays vanish at low
  brightness; white is best kept for highlights; mostly light pixels read
  best. Check new sprites on the real panel, at low brightness too.

#### Where things go

For an adult form with pixel art of its own:

| What | Where |
|---|---|
| Palette, pixel grid, where the face sits (`*_FACE_TOP`) | `tools/build_blob_sprites.py` |
| Poses: `species_tags` (it also derives `lookout_left`/`lookout_right`, for waiting at the edge), a walk with `walk_tags`, a jump or trick frame of its own (`stretch`, `flutter`) | `tools/build_blob_sprites.py` |
| Eyes, mouths, `*_FACES` with every name of `FACES`, a `*_face_grid` function | `tools/build_blob_sprites.py` |
| `write_sheet` for the body and the faces, and the list at the top of the script | `tools/build_blob_sprites.py` |
| Body and face sheet | `SPECIES_SHEETS` in `core/src/scene.ts` |
| A face that is not to sit in the middle of its row (`faceTop`, `faceCenter`, `faceShift` in `write_sheet`) | `tools/build_blob_sprites.py`, `faceAnchor` in `core/src/sprites.ts` |
| Colors of the child's lure, walking and hopping, umbrella, special move | `LURE_HINT`, `WALK_HOPS`, `NO_UMBRELLA`, `special` and `hit` in `core/src/scene.ts` |
| A trick in its own way: the same gesture and effect, another animation | `OWN_TRICKS` and `trick` in `core/src/scene.ts`, frames of its own if it needs them |
| Tests: every form in every state, how it moves, where the face sits | `core/test/scene.test.ts`, `core/test/sprites.test.ts` |
| Text and picture, spoilers folded shut | [pets.md](pets.md), `npm run preview -- --pets` |

Run `python tools/build_blob_sprites.py` after every change to the pixels, and
`npm test && npm run check` before committing.

