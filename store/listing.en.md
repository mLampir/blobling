# Store listing (English)

The texts for Google Play and the App Store. Limits: Play short description
80 characters, Play full description and App Store description 4000, App
Store subtitle 30, promotional text 170, keywords 100 (comma-separated, no
spaces needed). Like the docs, they name no adult form but Angloop.

## Google Play: short description

A tiny pixel pet to raise: feed it, play with it and watch it grow up.

## App Store: subtitle

A tiny pixel pet to raise

## App Store: promotional text

Meet Blobling, a little pixel pet that lives on your phone. Hatch it, look after it a few times a day and see what it grows into.

## App Store: keywords

virtual pet,pixel,cute,slime,egg,hatch,raise,care,adventure,retro,cozy,chiptune,led,offline

## App Store: notes for App Review

(App Store Connect, the version's *App Review Information → Notes*; the same
text fits Google Play's *App access*, with "All functionality is available
without special access".) Reviewers write in English, so this exists in
English only.

Blobling needs no account, no login and no hardware: the whole game runs on
the phone. A new pet starts as an egg that hatches within about an hour
(stroking it keeps it warm and makes it hatch sooner). Then drag food from the
tray onto the pet and stroke it. The "More" tab has the name, a new egg,
sound and the optional weather.

The section "Own LED display" in "More" is optional. It connects the app to
a self-built LED panel (a Raspberry Pi on the home network, instructions at
https://github.com/mLampir/blobling). That is why the app asks for local
network access and talks plain HTTP to private addresses only. Without such
a display, the search finds nothing, asks for an address, and the pet stays
on the phone.

Location is optional and only used for the weather in the pet's world: the
app rounds it to about 1 km and sends it to Open-Meteo. Notifications are
local only (the pet asks for you when it needs you); there is no server.

## Description (Google Play full description and App Store description)

Blobling is a little pixel pet that lives on your phone. It hatches from an egg, wants your attention a few times a day, and grows up depending on how you raise it.

CARE AT YOUR FINGERTIPS
Drag a meal, a snack or the ball onto your pet, rub it clean with the sponge, stroke it and put it to bed at night. It answers right there in its little world, with a happy face, a soft buzz and a chiptune sound.

IT LIVES ITS OWN DAY
The sky follows the real time of day, with sunrise and sunset where you live. Turn on the weather and the rain, snow and clouds outside show up in its world too. On a cold morning it wakes up shivering until you rub it warm. When you are away, it plays and practices on its own, and when you come back it tells you what it has been up to.

FROM EGG TO GROWN-UP
Keep the egg warm and it hatches sooner. Over about ten days your baby grows into a child and then into one of several adult forms. Which one depends on how you cared for it, and finding out is part of the fun.

TRICKS, TRAINING AND ADVENTURES
Teach it tricks, train its strength, speed and smarts, and send it off on trips. It comes home with finds, from seeds for the garden to hats and decorations, and with stories of the scuffles it had on the way. You can watch them again in the diary. New areas open up one by one, each behind a guardian.

FRIENDS AND A NEW GENERATION
A grown-up pet can win over a wild pet with its tricks. The friend comes to visit, leaves a gift now and then, and in time the two lay an egg. Whatever hatches from it takes after your pet a little.

GENTLE BY DESIGN
Your pet never dies. If you forget about it, it gets hungry, grubby or sad, but that can always be put right. No timers that punish you, no pressure.

A DIARY OF ITS LIFE
Everything it did is kept in its diary: the history, its stats, every trip, every find and an album of the forms your pets have been.

ON AN LED DISPLAY, TOO (OPTIONAL)
Blobling can also live on a small LED panel at home, driven by a Raspberry Pi. The app connects to it on your home network, and your pet goes on with its day there even while your phone is off.

PRIVATE
No account, no ads, no tracking, no in-app purchases. Your pet lives on your phone. The only thing that ever leaves it is a rounded location for the weather, and only if you turn the weather on.

Blobling is open source: the app and the LED display, with build instructions, are on GitHub (mLampir/blobling).

In English and German.
