"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { Disposable, ExtensionContext, window, workspace } from "vscode";
import * as nls from "vscode-nls";
import { findSvn, Svn } from "./svn";
import { toDisposable } from "./util";

const localize = nls.config(process.env.VSCODE_NLS_CONFIG)();

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	const disposables: Disposable[] = [];
	context.subscriptions.push(new Disposable(() => Disposable.from(...disposables).dispose()));

	init(context, disposables).catch((err) => console.error(err));
}

async function init(context: ExtensionContext, disposables: Disposable[]): Promise<void> {

	const config = workspace.getConfiguration("svn");
	const enabled = config.get<boolean>("enabled");
	if (!enabled) {
		return;
	}

	const hintPath = config.get<string>("path");

	const info = await findSvn(hintPath);

	const outputChannel = window.createOutputChannel("svn");

	const svn = new Svn(info.path);

	outputChannel.appendLine(localize("using svn", "Using svn {0} from {1}", info.version, info.path));

	const onOutput = (str: string) => outputChannel.append(str);
	svn.onOutput.addListener("log", onOutput);
	disposables.push(toDisposable(() => svn.onOutput.removeListener("log", onOutput)));
}
