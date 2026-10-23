# Testing and Verification Rules

- **No Subagents for Verification**: Never invoke `browser_subagent` or any other subagents to verify workflows, test changes, or inspect the UI.
- **Manual Verification by User**: The user will perform all testing manually. Write/edit the code, ensure syntactic and structural correctness, and hand off directly to the user.
