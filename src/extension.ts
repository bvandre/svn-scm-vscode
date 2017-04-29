'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {Disposable, ExtensionContext} from 'vscode';
import { findSvn } from './svn';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "svn-scm-vscode" is now active!');

    const disposables: Disposable[] = [];
    context.subscriptions.push(new Disposable(() => Disposable.from(...disposables).dispose()));

    init(context, disposables)
        .catch(err => console.error(err));
}

async function init(context: ExtensionContext, disposables: Disposable[]): Promise<void> {
    const info = await findSvn('svn');
}

// this method is called when your extension is deactivated
export function deactivate() {
}