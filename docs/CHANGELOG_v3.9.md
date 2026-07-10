# StayHub v3.9.0 – Roles & Permissions

## Nové roly

### Admin
- plný prístup ku všetkým modulom
- môže mazať dáta
- vidí nastavenia, reporty, dokumenty
- môže spravovať firmy a platby

### Správca
- prevádzkový manažér
- vidí izby, rezervácie, kalendár, check-in/out, platby, firmy, dokumenty a reporty
- nemá systémové nastavenia
- nemá mazanie záznamov

### Recepcia
- denná prevádzka
- dashboard, izby náhľad, rezervácie, kalendár, check-in, check-out, základné platby
- nevidí firmy, dokumenty, reporty ani nastavenia
- nemá mazanie záznamov

## Implementácia
- demo výber role na login obrazovke
- rola uložená v localStorage
- filtrovanie menu podľa role
- ochrana neprístupných tabov
- skryté mazanie pre Správcu a Recepciu
- skryté vytváranie izieb pre Recepciu
- nastavenia dostupné len Adminovi

## Poznámka
Toto je frontend permission layer pre demo a interné používanie. Pre produkčný SaaS režim odporúčame doplniť Supabase Auth + RLS policies podľa user_role.
