# StayHub v3.5A.1 – Aurora Calendar Foundation

## Nové

- Pridaná samostatná vrstva `src/aurora/AuroraCalendar.jsx`.
- Modul Kalendár teraz používa Aurora Calendar namiesto pôvodnej jednoduchej tabuľky.
- Pridané tri read-only pohľady:
  - Timeline – 14-dňový pohľad po lôžkach.
  - Mesiac – mesačná obsadenosť podobná booking planneru.
  - Deň – mobilný / recepčný prehľad vybraného dňa.
- Pridaný Aurora status engine:
  - Voľné
  - Rezervované
  - Ubytované
  - Príchod
  - Odchod
  - Konflikt
- Pridané metriky:
  - lôžka spolu,
  - voľné dnes,
  - príchody,
  - konflikty,
  - mesačné obsadené lôžko-dni.
- Pridané Apple/Linear UI štýly do `src/index.css`.

## Bezpečnosť úprav

- Nepridáva sa žiadna databázová migrácia.
- Nezasahuje sa do rezervácií, izieb, platieb ani check-in/check-out workflow.
- Aurora je zatiaľ read-only plánovacia vrstva.

## Ďalšia fáza

v3.5A.2 – Interactive Timeline:

- detail rezervácie po kliknutí,
- filtrovanie izieb/lôžok,
- rýchle prepnutie na check-in/check-out,
- príprava na drag & drop.
