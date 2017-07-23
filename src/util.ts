/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *
 *  Copied from Microsoft/vscode/extensions/git
 *--------------------------------------------------------------------------------------------*/

"use strict";

import * as fs from "fs";
import { dirname } from "path";
import { Disposable, Event } from "vscode";

export function dispose<T extends Disposable>(disposables: T[]): T[] {
	disposables.forEach((d) => d.dispose());
	return [];
}

export function toDisposable(d: () => void): Disposable {
	return { dispose: d };
}

export function combinedDisposable(disposables: Disposable[]): Disposable {
	return toDisposable(() => dispose(disposables));
}

export const EmptyDisposable = toDisposable(() => null);

export function mapEvent<I, O>(event: Event<I>, map: (i: I) => O): Event<O> {
	return (listener, thisArgs = null, disposables?) => event((i) => listener.call(thisArgs, map(i)), null, disposables);
}

export function filterEvent<T>(event: Event<T>, filter: (e: T) => boolean): Event<T> {
	return (listener, thisArgs = null, disposables?) =>
		event((e) => filter(e) && listener.call(thisArgs, e), null, disposables);
}

export function anyEvent<T>(...events: Event<T>[]): Event<T> {
	return (listener, thisArgs = null, disposables?) => {
		const result = combinedDisposable(events.map((event) => event((i) => listener.call(thisArgs, i))));

		if (disposables) {
			disposables.push(result);
		}

		return result;
	};
}

export function done<T>(promise: Promise<T>): Promise<void> {
	return promise.then<void>(() => void 0);
}

export function once<T>(event: Event<T>): Event<T> {
	return (listener, thisArgs = null, disposables?) => {
		const result = event((e) => {
			result.dispose();
			return listener.call(thisArgs, e);
		}, null, disposables);

		return result;
	};
}

export function eventToPromise<T>(event: Event<T>): Promise<T> {
	return new Promise<T>((c) => once(event)(c));
}

export function assign<T extends any>(destination: T, ...sources: any[]): T {
	for (const source of sources) {
		Object.keys(source).forEach((key) => destination[key] = source[key]);
	}

	return destination;
}

export function uniqBy<T>(arr: T[], fn: (el: T) => string): T[] {
	const seen = Object.create(null);

	return arr.filter((el) => {
		const key = fn(el);

		if (seen[key]) {
			return false;
		}

		seen[key] = true;
		return true;
	});
}

export function groupBy<T>(arr: T[], fn: (el: T) => string): { [key: string]: T[] } {
	return arr.reduce((result, el) => {
		const key = fn(el);
		result[key] = [...(result[key] || []), el];
		return result;
	}, Object.create(null));
}

export function denodeify<R>(fn: (...args: any[]) => any): (...args: any[]) => Promise<R> {
	return (...args) => new Promise<R>((c, e) => fn(...args, (err: any, r: R) => err ? e(err) : c(r)));
}

export function nfcall<R>(fn: (...args: any[]) => any, ...args: any[]): Promise<R> {
	return new Promise<R>((c, e) => fn(...args, (err: any, r: R) => err ? e(err) : c(r)));
}

export async function mkdirp(path: string, mode?: number): Promise<boolean> {
	const mkdir = async () => {
		try {
			await nfcall(fs.mkdir, path, mode);
		} catch (err) {
			if (err.code === "EEXIST") {
				const stat = await nfcall<fs.Stats>(fs.stat, path);

				if (stat.isDirectory) {
					return;
				}

				throw new Error(`'${path}' exists and is not a directory.`);
			}

			throw err;
		}
	};

	// is root?
	if (path === dirname(path)) {
		return true;
	}

	try {
		await mkdir();
	} catch (err) {
		if (err.code !== "ENOENT") {
			throw err;
		}

		await mkdirp(dirname(path), mode);
		await mkdir();
	}

	return true;
}

export function uniqueFilter<T>(keyFn: (t: T) => string): (t: T) => boolean {
	const seen: { [key: string]: boolean; } = Object.create(null);

	return (element) => {
		const key = keyFn(element);

		if (seen[key]) {
			return false;
		}

		seen[key] = true;
		return true;
	};
}
