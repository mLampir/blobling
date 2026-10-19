# Blobling – Datenschutzerklärung

*[English version](privacy.md)*

Stand: 19. Oktober 2026

Diese Erklärung gilt für die Blobling-App für Android und iOS und für die
Pet-Seite eines Blobling-LED-Displays zu Hause.

**Kurz gesagt:** Blobling hat kein Konto, keine Werbung, keine Analyse, kein
Tracking und keine In-App-Käufe. Es gibt keinen Blobling-Server: Dein Pet lebt
auf deinem Handy oder auf deinem eigenen LED-Display zu Hause. Das Einzige, was
dein Gerät je verlässt, ist ein gerundeter Standort, und auch das nur, wenn du
das Wetter einschaltest.

## 1. Verantwortlicher

Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO ist:

Michael Lamprecht<br>
Ravelinstraße 7/1/7<br>
1110 Wien, Österreich<br>
E-Mail: <blobling@lampir.at>

## 2. Was die App auf deinem Handy speichert

- **Dein Pet**: Name, Bedürfnisse, Form, Fundstücke und Tagebuch.
- **Einstellungen**: die Sprache, ob Töne an sind, ob das Wetter an ist, der
  Ort (gerundet, siehe Punkt 3) und die Adresse deines LED-Displays, falls du
  eines verbunden hast.

Das alles bleibt im Speicher der App auf deinem Handy. Nichts davon wird an
uns oder an jemand anderen geschickt. Wenn du die App löschst, ist es weg.

**Mitteilungen**: Die App fragt, ob sie Mitteilungen zeigen darf. Wenn du es
erlaubst, meldet sich das Pet auf deinem Handy mit einer, wenn es dich braucht
(nie in der Nacht). Die App legt sie beim Verlassen auf dem Handy selbst an,
und das System des Handys zeigt sie zur passenden Zeit; dafür wird nichts
verschickt, und es gibt keinen Push-Dienst. Abschalten kannst du Mitteilungen
in den Einstellungen des Handys.

## 3. Standort und Wetter

Das Wetter in der Welt des Pets ist freiwillig und aus, bis du es
einschaltest. Dann fragt die App dein Handy nach dem Standort (nur solange die
App offen ist, über den Berechtigungsdialog des Systems), entweder einmal oder
bei jedem Öffnen, wie du willst. Die Position wird auf zwei Nachkommastellen
gerundet, etwa 1 km, und nur diese gerundete Position wird gespeichert und
verwendet. *Ort vergessen* in der App entfernt sie.

Für das Wetter schickt die App die gerundete Position verschlüsselt an
[Open-Meteo](https://open-meteo.com) (`api.open-meteo.com`), etwa alle 15
Minuten, solange sie offen ist, und Open-Meteo antwortet mit dem aktuellen
Wetter. Name, Konto oder Geräte-ID werden nicht mitgeschickt; wie jede Anfrage
im Internet trägt sie deine IP-Adresse. Für die Server von Open-Meteo gelten
deren eigene Bedingungen und Datenschutzerklärung:
<https://open-meteo.com/en/terms>.

Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Du
widerrufst sie jederzeit, indem du den Ort in der App vergessen lässt oder der
App die Standort-Berechtigung in den Einstellungen des Handys entziehst.

## 4. Geräte-Backups (Google-Backup bei Android, iCloud-Backup bei iOS)

Wenn auf deinem Handy das System-Backup eingeschaltet ist, sichert das
Betriebssystem auch den Speicher der App, damit dein Pet auf ein neues Handy
oder eine neue Installation mitkommt. Das Backup macht Google (Google Ireland
Limited, Gordon House, Barrow Street, Dublin 4, Irland) im Rahmen deines
Google-Kontos bzw. Apple im Rahmen deines Apple-Accounts; wir haben keinen
Zugriff darauf. Es enthält, was unter Punkt 2 steht.

- **Android**: Das Backup liegt in deinem Google-Konto oder wird beim
  Gerätewechsel direkt von Handy zu Handy übertragen. Abschalten kannst du es
  in den Android-Einstellungen (je nach Hersteller unter *Google → Backup*).
- **iOS**: Das Backup liegt in deiner iCloud. Abschalten oder Blobling davon
  ausnehmen kannst du in den iOS-Einstellungen unter deinem Namen → *iCloud*.

Rechtsgrundlage ist unser berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO),
dass du dein Pet beim Handywechsel behältst. Ob und wohin gesichert wird,
entscheidest du selbst in den Einstellungen des Handys. Datenschutz:
<https://policies.google.com/privacy>, <https://www.apple.com/legal/privacy/>

## 5. Dein eigenes LED-Display

Wenn du die App mit einem Blobling-Display (einem Raspberry Pi) zu Hause
verbindest, spricht die App direkt über dein Heimnetz mit ihm, und das Pet
lebt auf dem Display. Um es zu finden, fragt die App unter den üblichen Namen
eines Displays in deinem Heimnetz nach (`blobling.local` und
`raspberrypi.local`). Wenn du das Pet von deinem Handy mitnehmen willst,
schickt die App es an das Display. Das Display ist dein eigenes Gerät; nichts läuft über
uns. Das Display selbst fragt Open-Meteo nach dem Wetter an dem Ort, den du
dort einstellst, und GitHub nach neuen Versionen seiner Software. Wenn es
seine Software installiert oder aktualisiert, lädt es außerdem Node.js von
NodeSource.

## 6. App-Stores und diese Seite

Die App wird über Google Play oder den App Store geladen. Google und Apple
verarbeiten Daten zum Download nach ihren eigenen Datenschutzerklärungen
(Links unter Punkt 4); wir bekommen von ihnen nur anonyme Statistiken, etwa
die Zahl der Downloads und Absturzberichte, wenn du das auf deinem Handy
erlaubt hast.

Diese Seite liefert GitHub Pages aus (GitHub, Inc., 88 Colin P. Kelly Jr.
Street, San Francisco, CA 94107, USA); GitHub speichert dabei die IP-Adressen
der Besucher zur Sicherheit. Datenschutz:
<https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement>

## 7. Kinder

Blobling ist für alle gedacht und erhebt keine personenbezogenen Daten, weder
von Kindern noch von sonst jemandem.

## 8. Keine Weitergabe, keine automatisierten Entscheidungen

Wir verkaufen keine personenbezogenen Daten und geben keine weiter. Wir setzen
keine automatisierte Entscheidungsfindung oder Profiling im Sinne des Art. 22
DSGVO ein.

## 9. Deine Rechte und Kontakt

Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16),
Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Da wir keine Daten
über dich haben, gibt es bei uns nichts nachzusehen oder zu löschen; die Daten
auf deinem Handy verschwinden mit der App. Für jede Frage schreib dem
Verantwortlichen unter Punkt 1.

Du hast außerdem das Recht, Beschwerde bei der österreichischen
Datenschutzbehörde einzulegen: <https://www.dsb.gv.at>

## 10. Änderungen

Wenn die App einmal anders mit Daten umgeht, ändert sich zuerst diese Seite.
Die aktuelle Fassung steht immer unter dieser Adresse, mit dem Datum oben.
