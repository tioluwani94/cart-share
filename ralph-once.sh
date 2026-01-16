#!/bin/bash

claude --permission-mode acceptEdits "@prd.json @progress.txt \
1. Read the PRD and progress file. \
2. Find the next incomplete task and implement it. \
3. Commit your changes. \
4. Update progress.txt with what you did. \
ONLY DO ONE TASK AT A TIME. \
Before committing, run ALL feedback loops: \
1. TypeScript: npm run typecheck (must pass with no errors) \
2. Tests: npm run test (must pass) \
3. Lint: npm run lint (must pass) \
Do NOT commit if any feedback loop fails. Fix issues first.