create table public.assessment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  answers jsonb not null
    check (
      jsonb_typeof(answers) = 'object'
      and answers ?& array['age', 'heightCm', 'weightKg', 'goal', 'activityLevel', 'dietaryPattern']
    ),
  created_at timestamptz not null default now()
);

create index assessment_history_user_created_idx
  on public.assessment_history (user_id, created_at desc);

alter table public.assessment_history enable row level security;

revoke all on public.assessment_history from anon, authenticated;
grant select, insert on public.assessment_history to authenticated;

create policy "Users can read their own assessment history"
  on public.assessment_history
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own assessment history"
  on public.assessment_history
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
