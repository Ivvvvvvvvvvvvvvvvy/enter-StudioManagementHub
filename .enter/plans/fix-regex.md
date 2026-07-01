# Fix: Invalid regex "Nothing to repeat"

## Diagnosis
- Error: `/```([a-zA-Z0-9_-]*)\b?[ \t]*\n?...` — `?` after `\b` (zero-width assertion) is illegal.
- Current source `src/components/agent/AgentMarkdown.tsx:121` already removed `\b?` (commit 449e5da).
- Codebase grep confirms no remaining `\b?` occurrences.

## Conclusion
Source is already correct. The browser error is from a stale cached preview build.

## Action
- Trigger a fresh rebuild so the preview picks up the fixed regex (no code change required).
- If desired, hard-refresh the preview to clear the cached bundle.
