# Mindful Meal Mentor

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/db557bc8-a503-4d23-8cba-907ea9315e9e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Supabase authentication setup

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project's API settings. These
are the project URL and publishable (browser-safe) key; never put a service-role
key or database password in a `VITE_` variable.

Apply all pending versioned SQL migrations in `supabase/migrations` to your
Supabase project before using profile, assessment-history, or food-diary
persistence. These migrations are not applied automatically by the app.
Configure the Supabase Auth site URL and redirect URL allowlist for
each environment, including `/auth/callback` and `/reset-password`. Email
verification and password recovery also require working Supabase email
templates/provider settings. The migration must be applied before the
`user_profiles` table is available; adding it to the repository does not apply
it to a hosted project.
