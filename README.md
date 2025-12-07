# Quick Commit Message by Branch

Prefill commit messages from the current Git branch name with minimal effort.

## How it works

- On activation and whenever the branch changes, the commit message box is auto-filled with the task id extracted from the branch name.
- Branches without a task id are ignored (for example `main` or `master`).
- The default message template is `{TASK}: `; the task id replaces `{TASK}`.
- If the field already contains user text, auto-fill will not overwrite it (unless you press the button).

## Examples

| Branch name                              | Commit prefix |
| ---------------------------------------- | ------------- |
| `main`                                   | no action     |
| `master`                                 | no action     |
| `bugfix/ABC-1234-app-not-working`        | `ABC-1234:`   |
| `feature/ABC-1234-app-not-working`       | `ABC-1234:`   |
| `release/ABC-1234-app-not-working`       | `ABC-1234:`   |
| `someOtherType/ABC-1234-app-not-working` | `ABC-1234:`   |
| `ABC-1234-app-not-working`               | `ABC-1234:`   |
| `ABC-1234`                               | `ABC-1234:`   |
| `12345-app-not-working`                  | `12345:`      |
| `feature/12345-app-not-working`          | `12345:`      |

## Source Control button

A button in the Source Control title bar fills the commit message on demand (it overwrites the field).

## Settings

- `quickCommitMsg.enableAutoFill` (boolean, default `true`): enable or disable automatic prefill. The button always works even when auto-fill is off.
- `quickCommitMsg.commitTemplate` (string, default `{TASK}: `): template for the commit message. Use `{TASK}` as a placeholder.

## Requirements

Built-in VS Code Git extension must be enabled and a repository must be open.
