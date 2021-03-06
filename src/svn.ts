import * as cp from "child_process";
import { EventEmitter } from "events";
import * as fs from "fs";
import * as iconv from "iconv-lite";
import * as os from "os";
import * as path from "path";
import { Disposable } from "vscode";
import { assign, denodeify, dispose, toDisposable } from "./util";

const readdir = denodeify<string[]>(fs.readdir);
const readfile = denodeify<string>(fs.readFile);

export interface IExecutionResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface ISvn {
	path: string;
	version: string;
}

function findSpecificSvn(hintPath: string): Promise<ISvn> {
	return new Promise<ISvn>((c, e) => {
		const buffers: Buffer[] = [];
		const child = cp.spawn(hintPath, ["--version"]);

		child.stdout.on("data", (b: Buffer) => buffers.push(b));

		child.on("error", e);

		child.on("exit", (code) => code
			? e(new Error("Not found"))
			: c({ path: hintPath, version: parseVersion(Buffer.concat(buffers).toString("utf8").trim()) }));
	});
}

export function findSvn(hint: string | undefined): Promise<ISvn> {
	const first = hint ? findSpecificSvn(hint) : Promise.reject<ISvn>(null);

	return first.then(void 0, () => {
		let svnPath: string;
		switch (process.platform) {
			case ("win32"):
				svnPath = "svn.exe";
				break;
			default:
				svnPath = "svn";
				break;
		}
		return findSpecificSvn(svnPath);
	});
}

function parseVersion(raw: string): string {
	const regex = /^svn,? version (\d\.\d\.\d)/;
	const result = regex.exec(raw);
	if (!result) {
		throw new Error("No version message was found");
	}
	return result[1];
}

async function exec(child: cp.ChildProcess, options: any = {}): Promise<IExecutionResult> {
	const disposables: Disposable[] = [];

	const once = (ee: NodeJS.EventEmitter, name: string, fn: (...args: any[]) => any) => {
		ee.once(name, fn);
		disposables.push(toDisposable(() => ee.removeListener(name, fn)));
	};

	const on = (ee: NodeJS.EventEmitter, name: string, fn: (...args: any[]) => any) => {
		ee.on(name, fn);
		disposables.push(toDisposable(() => ee.removeListener(name, fn)));
	};

	let encoding = options.encoding || "utf8";
	encoding = iconv.encodingExists(encoding) ? encoding : "utf8";

	const [exitCode, stdout, stderr] = await Promise.all<any>([
		new Promise<number>((c, e) => {
			once(child, "error", e);
			once(child, "exit", c);
		}),
		new Promise<string>((c) => {
			const buffers: Buffer[] = [];
			on(child.stdout, "data", (b: any) => buffers.push(b));
			once(child.stdout, "close", () => c(iconv.decode(Buffer.concat(buffers), encoding)));
		}),
		new Promise<string>((c) => {
			const buffers: Buffer[] = [];
			on(child.stderr, "data", (b: any) => buffers.push(b));
			once(child.stderr, "close", () => c(Buffer.concat(buffers).toString("utf8")));
		}),
	]);

	dispose(disposables);

	return { exitCode, stdout, stderr };
}

export class Svn {

	private mOnOutput = new EventEmitter();
	constructor(
		private execPath: string,
		private env: any = {}) {
	}

	get onOutput(): EventEmitter { return this.mOnOutput; }

	public async exec(cwd: string, args: string[], options: any = {}): Promise<IExecutionResult> {
		options = assign({ cwd }, options || {});
		return await this._exec(args, options);
	}

	private spawn(args: string[], options: any = {}): cp.ChildProcess {
		if (!this.execPath) {
			throw new Error("svn could not be found in the system.");
		}

		if (!options) {
			options = {};
		}

		if (!options.stdio && !options.input) {
			options.stdio = ["ignore", null, null];
		}

		options.env = assign({}, process.env, this.env, options.env || {}, {
			LANG: "en_US.UTF-8",
			LC_ALL: "en_US"
		});

		if (options.log !== false) {
			this.log(`svn ${args.join(" ")}\n`);
		}

		return cp.spawn(this.execPath, args, options);
	}

	private async _exec(args: string[], options: any = {}): Promise<IExecutionResult> {
		const child = this.spawn(args, options);

		if (options.input) {
			child.stdin.end(options.input, "utf8");
		}

		const result = await exec(child, options);

		if (options.log !== false && result.stderr.length > 0) {
			this.log(`${result.stderr}\n`);
		}

		if (result.exitCode) {
			return Promise.reject<IExecutionResult>(
				result.stderr
			);
		}

		return result;
	}

	private log(output: string): void {
		this.mOnOutput.emit("log", output);
	}
}
