import * as vscode from 'vscode';
import type { API as GitAPI, GitExtension, Repository } from './git';

const TASK_TEMPLATE_PLACEHOLDER = '{TASK}';
const lastAppliedMessages = new WeakMap<Repository, string>();
const repositorySubscriptions = new WeakMap<Repository, vscode.Disposable>();

export async function activate(context: vscode.ExtensionContext) {
	const gitApi = await getGitApi();
	if (!gitApi) {
		return;
	}

	context.subscriptions.push(
		registerFillCommand(gitApi),
		gitApi.onDidOpenRepository((repo) => watchRepository(repo, context)),
		gitApi.onDidCloseRepository((repo) => disposeRepository(repo)),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('quickCommitMsg.enableAutoFill')) {
				const autoFillEnabled = isAutoFillEnabled();
				gitApi.repositories.forEach((repo) =>
					applyCommitMessage(repo, { force: false, autoFillEnabled })
				);
			}
		})
	);

	gitApi.repositories.forEach((repo) => watchRepository(repo, context));
}

export function deactivate() {}

function registerFillCommand(gitApi: GitAPI): vscode.Disposable {
	return vscode.commands.registerCommand('quick-commit-msg.fillFromBranch', async () => {
		const repository = pickRepository(gitApi);

		if (!repository) {
			void vscode.window.showWarningMessage('No active Git repository to fill the commit message.');
			return;
		}

		const updated = applyCommitMessage(repository, { force: true, autoFillEnabled: true });
		if (!updated) {
			void vscode.window.showInformationMessage('Commit message is already set or branch is undefined.');
		}
	});
}

async function getGitApi(): Promise<GitAPI | undefined> {
	const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');

	if (!extension) {
		void vscode.window.showErrorMessage('Built-in Git extension is unavailable. Commit message fill is not possible.');
		return undefined;
	}

	if (!extension.isActive) {
		await extension.activate();
	}

	return extension.exports?.getAPI(1);
}

function watchRepository(repository: Repository, context: vscode.ExtensionContext) {
	if (repositorySubscriptions.has(repository)) {
		return;
	}

	applyCommitMessage(repository, { force: false, autoFillEnabled: isAutoFillEnabled() });

	const subscription = repository.state.onDidChange(() => {
		applyCommitMessage(repository, { force: false, autoFillEnabled: isAutoFillEnabled() });
	});

	repositorySubscriptions.set(repository, subscription);
	context.subscriptions.push(subscription);
}

function disposeRepository(repository: Repository) {
	repositorySubscriptions.get(repository)?.dispose();
	repositorySubscriptions.delete(repository);
	lastAppliedMessages.delete(repository);
}

function applyCommitMessage(
	repository: Repository,
	options: { force: boolean; autoFillEnabled: boolean }
): boolean {
	if (!options.autoFillEnabled && !options.force) {
		return false;
	}

	const branchName = repository.state.HEAD?.name;
	const taskId = extractTaskId(branchName);
	if (!taskId) {
		return false;
	}

	const messageFromBranch = buildMessageFromTask(taskId);

	if (!messageFromBranch) {
		return false;
	}

	const currentValue = repository.inputBox.value.trim();
	const lastApplied = lastAppliedMessages.get(repository);
	const shouldOverwrite = options.force || !currentValue || currentValue === lastApplied;

	if (currentValue === messageFromBranch) {
		lastAppliedMessages.set(repository, messageFromBranch);
		return true;
	}

	if (!shouldOverwrite) {
		return false;
	}

	repository.inputBox.value = messageFromBranch;
	lastAppliedMessages.set(repository, messageFromBranch);

	return true;
}

function buildMessageFromTask(taskId: string): string | undefined {
	const template = vscode.workspace
		.getConfiguration('quickCommitMsg')
		.get<string>('commitTemplate', `${TASK_TEMPLATE_PLACEHOLDER}: `);

	if (!template) {
		return undefined;
	}

	if (template.includes(TASK_TEMPLATE_PLACEHOLDER)) {
		return template.replaceAll(TASK_TEMPLATE_PLACEHOLDER, taskId);
	}

	return `${taskId}: ${template}`;
}

function pickRepository(api: GitAPI): Repository | undefined {
	const editorUri = vscode.window.activeTextEditor?.document.uri;

	if (editorUri) {
		const repoForFile = api.getRepository(editorUri);
		if (repoForFile) {
			return repoForFile;
		}
	}

	return api.repositories[0];
}

function isAutoFillEnabled(): boolean {
	return vscode.workspace.getConfiguration('quickCommitMsg').get<boolean>('enableAutoFill', true);
}

function extractTaskId(branchName?: string): string | undefined {
	if (!branchName) {
		return undefined;
	}

	const normalized = branchName.replace(/^refs\/heads\//, '');

	const jiraMatch = normalized.match(/[A-Z][A-Z0-9]+-\d+/);
	if (jiraMatch) {
		return jiraMatch[0];
	}

	const numericMatch = normalized.match(/(?:^|\/)(\d+)/);
	return numericMatch?.[1];
}
