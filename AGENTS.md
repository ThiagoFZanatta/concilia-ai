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

## Concilia AI development policy

Implement and validate changes directly in the repository and deliver them through GitHub. Do not send prompts to the Lovable chat/agent or trigger credit-consuming generation tasks unless the owner explicitly changes this instruction. Keep the existing native Lovable Cloud backend; do not replace it with an external Supabase project. Backend schema/function activation and credentials are separate from a GitHub source push; never claim they were deployed without verification. See docs/ATIVACAO_LOVABLE_CLOUD.md.
