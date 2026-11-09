insert into public.user_profiles (id, display_name)
select
  users.id,
  left(
    coalesce(
      nullif(btrim(users.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
      'NUTRIFY user'
    ),
    120
  )
from auth.users as users
on conflict (id) do nothing;
