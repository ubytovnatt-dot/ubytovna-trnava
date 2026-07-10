-- =====================================================================
-- StayHub – Ochrana proti dvojitej rezervácii lôžka (na úrovni DB)
-- Dátum: 2026-07-07
-- Problém: validateBookingBeds() v api/index.js kontroluje kolíziu v appke
--          (read-then-write) bez transakcie – dve súbežné požiadavky môžu
--          rezervovať to isté lôžko a termín. Lôžka sú v bookings.reserved_beds
--          ako JSONB pole, preto klasický EXCLUDE constraint nestačí a použijeme
--          BEFORE INSERT/UPDATE trigger, ktorý kolíziu odmietne v rámci transakcie.
-- Spustiť: Supabase → SQL Editor → Run. Idempotentné.
-- =====================================================================

create or replace function public.stayhub_check_bed_overlap()
returns trigger
language plpgsql
as $$
declare
  new_bed   jsonb;
  conflict  record;
  cancelled_statuses text[] := array[
    'Zrušená','Zrusena','zrušené','cancelled','canceled','Da huy','Đã hủy',
    'Ukončená','Dokončená','completed','checked_out','archived'
  ];
begin
  -- Zrušené/ukončené rezervácie neblokujú.
  if coalesce(NEW.status,'') = any(cancelled_statuses) then
    return NEW;
  end if;
  if NEW.reserved_beds is null or jsonb_array_length(coalesce(NEW.reserved_beds,'[]'::jsonb)) = 0 then
    return NEW;
  end if;
  if NEW.check_in_date is null or NEW.check_out_date is null then
    return NEW;
  end if;

  -- Pre každé žiadané lôžko skontroluj prekryv s inou aktívnou rezerváciou.
  for new_bed in select * from jsonb_array_elements(NEW.reserved_beds)
  loop
    select b.id, b.booking_code into conflict
    from public.bookings b
    cross join lateral jsonb_array_elements(coalesce(b.reserved_beds,'[]'::jsonb)) as ob(value)
    where b.id <> NEW.id
      and b.property_id is not distinct from NEW.property_id
      and coalesce(b.status,'') <> all(cancelled_statuses)
      -- to isté lôžko (room_id + bed_code ako text)
      and (ob.value->>'room_id')  = (new_bed->>'room_id')
      and (ob.value->>'bed_code') = (new_bed->>'bed_code')
      -- prekryv dátumov (odchodový deň je voľný pre ďalšieho hosťa)
      and NEW.check_in_date  < b.check_out_date
      and NEW.check_out_date > b.check_in_date
    limit 1;

    if found then
      raise exception 'KONFLIKT: lôžko %/% je už rezervované (rezervácia %) v prekrývajúcom sa termíne.',
        (new_bed->>'room_id'), (new_bed->>'bed_code'), conflict.booking_code
        using errcode = '23505'; -- unique_violation → backend to vie namapovať na 409
    end if;
  end loop;

  return NEW;
end $$;

drop trigger if exists trg_stayhub_bed_overlap on public.bookings;
create trigger trg_stayhub_bed_overlap
  before insert or update of reserved_beds, check_in_date, check_out_date, status
  on public.bookings
  for each row
  execute function public.stayhub_check_bed_overlap();

-- Pozn.: appková kontrola vo validateBookingBeds() môže ostať (lepšia UX hláška);
-- tento trigger je posledná obranná línia proti súbehu a odmietne kolíziu aj vtedy,
-- keď dve požiadavky prídu naraz.
