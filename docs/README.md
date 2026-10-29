# Project guide

Degree Audit checks graduation progress and thesis eligibility from a transcript in your browser.

## Supported use

The current rules cover `人文社会科学部 人文科学コース` for students entering in 2020–2023 or 2024 onward.

The tool doesn't support other faculties, courses, or entry years.

The browser reads a PDF transcript and displays progress toward graduation and thesis eligibility.

## Data and results

The app processes transcript data in the active browser tab.

It doesn't upload or persist the data in local storage or cookies.

The tool is an unofficial personal project, independent of any university or educational institution and without their approval or endorsement.

The creator provides the tool as is, without warranties of accuracy, completeness, timeliness, or any other kind.
The creator accepts no liability for damage arising from use of the tool.

The results provide reference information.
Confirm final graduation and course decisions by consulting the university's current guidance, your faculty's academic affairs staff, or your advisor.
Official thesis eligibility decisions rest with the university's assessment meeting, which takes place twice a year.

University rules can change.

## Development

The Dockerfile's `BUN_VERSION` matches the `bun` pin in `.mise.toml`, and Docker Compose builds that Dockerfile.

Run these Docker Compose commands for the development server and web checks.

```sh
docker compose up dev
docker compose run --rm check
docker compose run --rm lint
docker compose run --rm coverage
```

Host-based setup uses the pinned tools and installs the repository's Git hooks.

```sh
mise install
just install-hooks
just dev
just check
```

The `dev` recipe builds the WebAssembly package before starting the app, and `check` runs lint and tests.
