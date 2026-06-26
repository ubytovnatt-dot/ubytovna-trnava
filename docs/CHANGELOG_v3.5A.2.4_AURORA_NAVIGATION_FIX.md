# StayHub v3.5A.2.4 – Aurora Navigation Fix

## Opravené
- Prepínanie pohľadov Timeline / Mesiac / Deň používa samostatný stav a správne aktívne tlačidlá.
- Pohľad Deň už nie je interné `mobile`, ale korektný denný režim.
- Navigácia mesiacov zachová vybraný deň, ak patrí do nového mesiaca; inak nastaví 1. deň mesiaca.
- Pridaný samostatný výber mesiaca (`type="month"`).
- Pridaný samostatný výber dňa (`type="date"`).
- Pridané tlačidlo Dnes / Hôm nay / Today.
- Pri kliknutí na deň v mesačnom kalendári sa synchronizuje aj aktívny mesiac.
- Na mobile sa Timeline už neskrýva, ostáva horizontálne posuvná.
- Doplnené SK / VI / EN preklady pre nové ovládacie prvky Aurora.

## Overenie
- `npm run build` prešiel úspešne.
