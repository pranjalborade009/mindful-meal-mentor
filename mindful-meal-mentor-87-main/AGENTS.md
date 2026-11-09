<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Workspace pages live under the pathless `_workspace` layout (sidebar shell); public pages (home, auth) sit at top level. Why: keeps app chrome separate from marketing chrome.
- Sample/demo data lives only in `src/data/*`, typed by `src/types`; ML metrics stay `null` until real pipeline output. Why: academic integrity — no fabricated results, and easy backend swap.
