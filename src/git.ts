import type { Event, Uri } from 'vscode';

export interface GitExtension {
	readonly enabled: boolean;
	readonly onDidChangeEnablement: Event<boolean>;
	getAPI(version: 1): API;
}

export interface API {
	readonly repositories: Repository[];
	readonly onDidOpenRepository: Event<Repository>;
	readonly onDidCloseRepository: Event<Repository>;
	getRepository(uri: Uri): Repository | null;
}

export interface Repository {
	readonly rootUri: Uri;
	readonly inputBox: InputBox;
	readonly state: RepositoryState;
}

export interface InputBox {
	value: string;
}

export interface RepositoryState {
	readonly HEAD: Branch | undefined;
	readonly onDidChange: Event<void>;
}

export interface Branch {
	readonly name?: string;
}
