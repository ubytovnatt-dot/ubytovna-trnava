# StayHub v5.1 – Core Architecture

## Principle

Reservation is the single source of truth.

Rooms, beds, calendar, dashboard, payments, documents, check-in and check-out are not independent data silos. They are derived from the reservation and its related persons, payments and documents.

```text
Company (optional)
   ↓
Reservation
   ├── Persons
   ├── Payments
   ├── Documents
   └── Bed assignments
        ↓
     Calendar / Dashboard / Check-in / Check-out
```

## Main tables

| Domain name | Current table | Purpose |
|---|---|---|
| properties | properties | accommodation sites |
| rooms | rooms | rooms inside one property |
| beds | derived from rooms.capacity / reserved_beds | individual bed positions |
| companies | companies | optional payer / client |
| reservations | bookings | source of stay period and reserved beds |
| persons | checkin_persons | real checked-in guests |
| payments | payments | payments linked to reservation |
| documents | documents | OCR documents linked to reservation/person |

## Workflow

1. Create reservation: company/person, date range, number of beds.
2. Assign beds: system checks the whole date range, not only check-in date.
3. Check-in: passport or ID card, upload/photo, AI OCR, keys handed over.
4. Stay: payments and notes remain attached to the reservation.
5. Check-out: person is checked out, bed is released, dashboard/calendar recalculates.

## Storage

Use existing Supabase bucket:

```text
stayhub-documents/
  property-id/
    reservation-id/
      person-id/
        passport/
        id-card/
```

The app stores `storage_path`, not public URLs.

## Simplified menu

- Dnes
- Rezervácie
- Check-in / Check-out
- Nastavenia

Companies, persons, payments and documents are embedded in the reservation/check-in workflow, not shown as separate main modules.
