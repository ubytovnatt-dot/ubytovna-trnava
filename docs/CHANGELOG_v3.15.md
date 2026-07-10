# StayHub v3.15 – Check-in Supabase Save Fix

Opravy:

- Check-in po uložení mení stav rezervácie iba minimálnym payloadom `{ status: "Check-in" }`.
- API PUT pre `bookings` a `checkin_persons` má robustný fallback, keď Supabase update prebehne, ale `.select()` nevráti riadok kvôli RLS/select policy alebo property scope.
- Lepšia diagnostika chyby v check-in modale cez `console.error`.
- Verzovaný frontend text na v3.15.

Poznámka:
- SQL netreba púšťať.
- Po deploy odporúčané otestovať: rezervácia → check-in → uložiť osobu → refresh → check-out.
