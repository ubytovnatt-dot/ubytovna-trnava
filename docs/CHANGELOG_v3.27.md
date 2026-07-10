# StayHub v3.27 – Manual User Management

## Doplnené
- Manuálne vytváranie používateľov bez email pozvánky.
- Admin nastaví email, meno, heslo, rolu, objekt a aktiváciu.
- Používateľ sa môže prihlásiť ihneď po vytvorení.
- Admin môže meniť heslo alebo vymazať používateľa.

## API
- POST /api/auth/create-user
- PUT /api/auth/users/:id/password
- DELETE /api/auth/users/:id

## Podmienka
Vo Verceli musí byť správny SUPABASE_SERVICE_ROLE_KEY.
