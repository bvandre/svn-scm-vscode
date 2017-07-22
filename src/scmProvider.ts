"use_strict";

import {
	Disposable,
	QuickDiffProvider,
	scm,
	SourceControl,
	SourceControlResourceGroup,
	Uri
} from "vscode";

export class ScmProvider implements QuickDiffProvider, Disposable {
	private mDisposables: Disposable[] = [];
	private mSourceControl: SourceControl;
	private mChangesGroup: SourceControlResourceGroup;
	private mStagedGroup: SourceControlResourceGroup;

	constructor() {
		this.mSourceControl = scm.createSourceControl("svn", "Svn");
		this.mSourceControl.acceptInputCommand = {
			command: "svn.commitWithInput",
			title: "Commit"
		};
		this.mSourceControl.quickDiffProvider = this;
		this.mDisposables.push(this.mSourceControl);

		this.mChangesGroup = this.mSourceControl.createResourceGroup("changes", "Changes");
		this.mChangesGroup.hideWhenEmpty = true;
		this.mDisposables.push(this.mChangesGroup);

		this.mStagedGroup = this.mSourceControl.createResourceGroup("staged", "Staged Changes");
		this.mStagedGroup.hideWhenEmpty = true;
		this.mDisposables.push(this.mStagedGroup);
	}

	public provideOriginalResource(uri: Uri): Uri | undefined {
		if (uri.scheme !== "file") {
			return;
		}

		return uri.with({
			scheme: "svn"
		});
	}

	public dispose(): void {
		this.mDisposables.forEach(d => d.dispose());
	}
}
