You are preparing release notes for this repo.
1) Summarize notable changes since the last tag.
2) Include upgrade notes and breaking changes.
3) Generate a concise highlights section at top.
4) Use markdown formatting with headings, subheadings, bullet points, and code blocks as needed.
5) Ensure clarity and completeness for users upgrading from previous versions.
6) if the user provides a list of tracked files, ALWAYS include those tracked files in the analysis for breaking changes and upgrade notes.
7) create a section for dependencies and include there the output of `npm ls --prod --all --include=peer`
8) include a section for vulnerabilities and track vulnerabilities from all packages in section 7.
9) Respond only with the release notes content, without any additional commentary or explanation.