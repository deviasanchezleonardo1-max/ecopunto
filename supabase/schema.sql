create table if not exists public.ecopunto_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_code text not null unique check (student_code ~ '^[a-z0-9._-]{3,32}$'),
  email text,
  names text not null constraint ecopunto_profiles_names_check check (char_length(btrim(names)) between 1 and 80),
  surnames text not null constraint ecopunto_profiles_surnames_check check (char_length(btrim(surnames)) between 1 and 80),
  grade text not null constraint ecopunto_profiles_grade_check check (grade ~ '^[0-9]{3,4}$'),
  shift text not null check (shift in ('Mañana', 'Tarde')),
  points integer not null default 0 check (points >= 0),
  scans integer not null default 0 check (scans >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.ecopunto_scans (
  id uuid primary key,
  profile_id uuid not null references public.ecopunto_profiles(id) on delete cascade,
  class_name text not null,
  residue text not null,
  bin text not null,
  points integer not null check (points = 10),
  created_at timestamptz not null default now(),
  constraint ecopunto_scans_classification_check check (
    (class_name = 'Botella_plastica' and residue = 'Botella plástica' and bin = 'Blanco') or
    (class_name = 'Lata' and residue = 'Lata' and bin = 'Blanco') or
    (class_name = 'Papel_carton' and residue = 'Papel o cartón' and bin = 'Blanco') or
    (class_name = 'Organico' and residue = 'Residuo orgánico' and bin = 'Verde') or
    (class_name = 'No_aprovechable' and residue = 'No aprovechable' and bin = 'Negro')
  )
);

alter table public.ecopunto_profiles enable row level security;
alter table public.ecopunto_scans enable row level security;

alter table public.ecopunto_profiles add column if not exists email text;
update public.ecopunto_profiles p
set email = lower(u.email)
from auth.users u
where p.id = u.id and p.email is null;
alter table public.ecopunto_profiles alter column email set not null;
create unique index if not exists ecopunto_profiles_email_idx on public.ecopunto_profiles (email);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ecopunto_profiles_names_check'
      and conrelid = 'public.ecopunto_profiles'::regclass
  ) then
    alter table public.ecopunto_profiles
      add constraint ecopunto_profiles_names_check
      check (char_length(btrim(names)) between 1 and 80) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ecopunto_profiles_surnames_check'
      and conrelid = 'public.ecopunto_profiles'::regclass
  ) then
    alter table public.ecopunto_profiles
      add constraint ecopunto_profiles_surnames_check
      check (char_length(btrim(surnames)) between 1 and 80) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ecopunto_profiles_grade_check'
      and conrelid = 'public.ecopunto_profiles'::regclass
  ) then
    alter table public.ecopunto_profiles
      add constraint ecopunto_profiles_grade_check
      check (grade ~ '^[0-9]{3,4}$') not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ecopunto_scans_classification_check'
      and conrelid = 'public.ecopunto_scans'::regclass
  ) then
    alter table public.ecopunto_scans
      add constraint ecopunto_scans_classification_check
      check (
        (class_name = 'Botella_plastica' and residue = 'Botella plástica' and bin = 'Blanco') or
        (class_name = 'Lata' and residue = 'Lata' and bin = 'Blanco') or
        (class_name = 'Papel_carton' and residue = 'Papel o cartón' and bin = 'Blanco') or
        (class_name = 'Organico' and residue = 'Residuo orgánico' and bin = 'Verde') or
        (class_name = 'No_aprovechable' and residue = 'No aprovechable' and bin = 'Negro')
      ) not valid;
  end if;
end;
$$;

alter table public.ecopunto_profiles validate constraint ecopunto_profiles_names_check;
alter table public.ecopunto_profiles validate constraint ecopunto_profiles_surnames_check;
alter table public.ecopunto_profiles validate constraint ecopunto_profiles_grade_check;
alter table public.ecopunto_scans validate constraint ecopunto_scans_classification_check;

revoke all on public.ecopunto_profiles, public.ecopunto_scans from public, anon, authenticated;
grant select on public.ecopunto_profiles, public.ecopunto_scans to authenticated;

drop policy if exists "Students can read their own profile" on public.ecopunto_profiles;
create policy "Students can read their own profile"
  on public.ecopunto_profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Students can read their own scans" on public.ecopunto_scans;
create policy "Students can read their own scans"
  on public.ecopunto_scans for select
  to authenticated
  using (profile_id = (select auth.uid()));

create or replace function public.create_ecopunto_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'ecopunto_account' is distinct from 'true' then
    return new;
  end if;

  insert into public.ecopunto_profiles (id, student_code, email, names, surnames, grade, shift)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'student_code'),
    lower(new.email),
    new.raw_user_meta_data ->> 'names',
    new.raw_user_meta_data ->> 'surnames',
    new.raw_user_meta_data ->> 'grade',
    new.raw_user_meta_data ->> 'shift'
  );
  return new;
end;
$$;

drop trigger if exists on_ecopunto_user_created on auth.users;
create trigger on_ecopunto_user_created
  after insert on auth.users
  for each row execute procedure public.create_ecopunto_profile();

insert into public.ecopunto_profiles (id, student_code, email, names, surnames, grade, shift)
select
  id,
  lower(raw_user_meta_data ->> 'student_code'),
  lower(email),
  raw_user_meta_data ->> 'names',
  raw_user_meta_data ->> 'surnames',
  raw_user_meta_data ->> 'grade',
  raw_user_meta_data ->> 'shift'
from auth.users
where raw_user_meta_data ->> 'ecopunto_account' = 'true'
on conflict (id) do nothing;

create or replace function public.record_ecopunto_scan(p_event_id uuid, p_class_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  residue_name text;
  bin_name text;
  inserted_id uuid;
  existing_profile_id uuid;
  current_points integer;
  current_scans integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  case p_class_name
    when 'Botella_plastica' then residue_name := 'Botella plástica'; bin_name := 'Blanco';
    when 'Lata' then residue_name := 'Lata'; bin_name := 'Blanco';
    when 'Papel_carton' then residue_name := 'Papel o cartón'; bin_name := 'Blanco';
    when 'Organico' then residue_name := 'Residuo orgánico'; bin_name := 'Verde';
    when 'No_aprovechable' then residue_name := 'No aprovechable'; bin_name := 'Negro';
    else raise exception 'Invalid residue category' using errcode = '22023';
  end case;

  insert into public.ecopunto_scans (id, profile_id, class_name, residue, bin, points)
  values (p_event_id, current_user_id, p_class_name, residue_name, bin_name, 10)
  on conflict (id) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    update public.ecopunto_profiles
      set points = points + 10, scans = scans + 1
      where id = current_user_id
      returning points, scans into current_points, current_scans;
    if not found then
      raise exception 'Profile not found' using errcode = 'P0002';
    end if;
  else
    select profile_id into existing_profile_id
      from public.ecopunto_scans
      where id = p_event_id;
    if existing_profile_id is distinct from current_user_id then
      raise exception 'Scan identifier already used' using errcode = '23505';
    end if;
    select points, scans into current_points, current_scans
      from public.ecopunto_profiles
      where id = current_user_id;
  end if;

  return jsonb_build_object('points', current_points, 'scans', current_scans);
end;
$$;

revoke all on function public.record_ecopunto_scan(uuid, text) from public, anon;
grant execute on function public.record_ecopunto_scan(uuid, text) to authenticated;
