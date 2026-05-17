# Branch Protection Checklist

Use this checklist in GitHub to make CI requirements enforceable.

## Target branch
- `main`

## Recommended branch protection settings
- [ ] Require a pull request before merging.
- [ ] Require approvals (at least 1).
- [ ] Dismiss stale approvals when new commits are pushed.
- [ ] Require conversation resolution before merging.
- [ ] Require status checks to pass before merging.
- [ ] Require branches to be up to date before merging.
- [ ] Restrict force pushes.
- [ ] Restrict branch deletions.

## Required status checks
Add these checks as **required** after the workflow runs at least once:
- `checks / Lint`
- `checks / Typecheck`
- `checks / Test`
- `checks / Build`

> Note: status check names match step names in `.github/workflows/ci.yml`.

## Optional hardening
- [ ] Enable merge queue.
- [ ] Require signed commits.
- [ ] Require linear history.
- [ ] Restrict who can push directly to `main`.
