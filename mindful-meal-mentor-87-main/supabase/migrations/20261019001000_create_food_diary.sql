create table public.food_diary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_id text not null check (char_length(btrim(food_id)) between 1 and 240),
  consumption_date date not null,
  meal_type text not null check (meal_type in ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  quantity numeric not null check (quantity > 0 and quantity <= 100000),
  unit text not null check (unit in ('g', 'ml', 'piece', 'serving')),
  portion_metadata jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(portion_metadata) = 'object'
      and case
        when portion_metadata ? 'weightGrams' then
          jsonb_typeof(portion_metadata -> 'weightGrams') = 'number'
          and (portion_metadata ->> 'weightGrams')::numeric > 0
        else true
      end
      and case
        when portion_metadata ? 'description' then
          jsonb_typeof(portion_metadata -> 'description') = 'string'
        else true
      end
    ),
  nutrition_snapshot jsonb not null
    check (jsonb_typeof(nutrition_snapshot) = 'object'),
  source_identifier text not null check (char_length(btrim(source_identifier)) between 1 and 240),
  source_name text not null check (char_length(btrim(source_name)) between 1 and 200),
  source_type text not null
    check (source_type in ('demo', 'database', 'food-label', 'user', 'calculated')),
  source_reference text,
  external_source text,
  external_food_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((external_source is null) = (external_food_id is null))
);

create index food_diary_user_date_created_idx
  on public.food_diary (user_id, consumption_date, created_at);

alter table public.food_diary enable row level security;

revoke all on public.food_diary from anon, authenticated;
grant select, insert, update, delete on public.food_diary to authenticated;

create policy "Users can read their own diary entries"
  on public.food_diary
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own diary entries"
  on public.food_diary
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own diary entries"
  on public.food_diary
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own diary entries"
  on public.food_diary
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.set_food_diary_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_food_diary_updated_at() from public, anon, authenticated;

create trigger set_food_diary_updated_at
  before update on public.food_diary
  for each row
  execute function public.set_food_diary_updated_at();
