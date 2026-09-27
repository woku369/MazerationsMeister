# Branch-Übersicht

Stand: 27.09.2026. Beantwortet: Brauche ich nur noch `fresh-main`? Was steckt in den anderen Branches, kann das weg?

## Kurzfassung

**Ja, für die aktive Arbeit brauchst du nur `fresh-main`.** Es ist der einzige Branch, auf dem seit Monaten tatsächlich entwickelt wird, der einzige, den GitHub Actions für das Deployment beobachtet, und der einzige mit einem durchgehenden, nachvollziehbaren Verlauf.

| Branch | Status | Empfehlung |
|---|---|---|
| `fresh-main` | ✅ aktiv, deployed | Behalten — das ist die Arbeitsgrundlage |
| `claude/mazerations-review-checks-1kn7td` | ⚠️ veraltete Alt-Version von fresh-main | Löschen (siehe unten) |
| `pages-clean` | ⚠️ komplett getrennte Historie, größtenteils Experimentier-Code | Größtenteils löschbar, ein Punkt zur Vorsicht (siehe unten) |

## `claude/mazerations-review-checks-1kn7td`

- **49 Commits hinter** `fresh-main`, nur **5 Commits** eigenständig voraus (gemessen ab dem gemeinsamen Vorfahren).
- Die 5 eigenen Commits (`feat(tank-viewer): ?view=all Übersicht...`, `feat(pwa): Kraut:Sprit-Verhältnis...`, `fix(pwa): Kraut:Sprit-Verhältnis und Ausbeute-% im PDF...`, zwei Doku-Commits zu Temperaturkompensation) beschreiben Funktionen, die **auf `fresh-main` bereits vorhanden sind** — verifiziert durch Codesuche: `public/mazeration-pwa.html` enthält das Kraut:Sprit-Verhältnis bereits, `public/tank-viewer.html` enthält die `?view=all`-Übersicht samt `hasUniqueNumber`-Logik bereits (dort außerdem im Rahmen dieser Session nochmal überarbeitet, siehe Aufgabe 13 in der Roadmap).
- Dieser Branch ist mit hoher Sicherheit eine ältere Zwischenversion, deren Inhalte längst (eigenständig oder durch Cherry-Pick) in `fresh-main` gelandet sind. Ich habe das über Stichproben-Suche bestätigt, nicht über einen vollständigen Diff jeder Zeile.
- **Empfehlung: löschen** (lokal und `origin`). Kein Datenverlust zu erwarten, da nichts Eigenständiges mehr drin zu sein scheint.

## `pages-clean`

- **Keine gemeinsame Historie** mit `fresh-main` (kompletter Diff, kein gemeinsamer Vorfahre) — ein separater, in dieser Form nie gemergter Entwicklungsstrang.
- Enthielt das GFKC-/Rezeptur-Planungswerkzeug, das in dieser Session bereits vollständig untersucht (`docs/GFKC-VERSCHNITT-BESTANDSAUFNAHME.md`) und **nach `fresh-main` portiert und erweitert** wurde (Aufgabe 17: Rezepturen-Modul mit echter Buchungsfunktion, die es in `pages-clean` nie gab).
- Der volle Diff zu `fresh-main` umfasst **362 Dateien** und zeigt darüber hinaus einiges an zusätzlichem Code, der nirgends in der Roadmap als gewünschtes Feature auftaucht und nie nach `fresh-main` übernommen wurde, u.a.:
  - `src/lib/google-calendar.ts` (462 Zeilen) — eine Google-Calendar-Anbindung
  - `src/lib/hybrid-storage.ts` + `hybrid-storage-tests.ts` (über 1100 Zeilen) — eine alternative Speicherarchitektur
  - `src/lib/range-calculator.ts` (745 Zeilen) — vermutlich das in der Roadmap erwähnte alte "Reichweitenanalyse"-Konzept
  - `src/lib/tank-sync-OLD-BROKEN.ts` — vom damaligen Autor selbst als kaputt gekennzeichnet
  - diverse Debug-/CLI-Hilfswerkzeuge (`tank-debug-utility.ts`, `storage-debug-cli.ts`)
- Das liest sich wie eine größere, teils experimentelle Parallelentwicklung, die nie zu Ende geführt und nie in die aktive Linie übernommen wurde — üblich bei einem länger nicht aufgeräumten Nebenbranch.
- **Einschränkung meiner Prüfung:** Bei 362 geänderten Dateien und ~44.000 Zeilen Unterschied habe ich nicht jede Datei einzeln bewertet, sondern gezielt nach dem bereits bekannten Rezeptur-Werkzeug gesucht und die auffälligsten übrigen Dateien überflogen. Es ist nicht auszuschließen, dass irgendwo darin noch eine kleine, nützliche Idee steckt, die ich übersehen habe.
- **Empfehlung:** Bevor der Branch endgültig gelöscht wird, einmal kurz selbst durch die Dateiliste des Branches schauen (z.B. auf GitHub die Branch-Ansicht öffnen) — nicht weil ich einen konkreten Verdacht habe, sondern weil 44.000 Zeilen zu viel sind, um mit Sicherheit "nichts Wichtiges mehr drin" zu sagen. Wenn das grüne Licht kommt: löschen.

## Löschbefehle (zur Referenz, noch nicht ausgeführt)

```bash
# Lokal
git branch -D claude/mazerations-review-checks-1kn7td
git branch -D pages-clean 2>/dev/null || true   # existiert lokal evtl. nicht

# Remote
git push origin --delete claude/mazerations-review-checks-1kn7td
git push origin --delete pages-clean
```

Kein Branch-Protection-Hinweis o.ä. geprüft — falls einer der Branches als Default-Branch oder in Branch-Protection-Regeln hinterlegt ist, das vorher in den Repo-Einstellungen prüfen.
