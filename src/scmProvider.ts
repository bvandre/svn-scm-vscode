"use_strict";

import { scm, SourceControl } from "vscode";

export class ScmProvider {
	private mScm: SourceControl;

	constructor() {
		this.mScm = scm.createSourceControl("svn", "Svn");
	}
}
