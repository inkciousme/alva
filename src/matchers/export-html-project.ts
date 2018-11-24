import * as M from '../message';
import * as T from '../types';
import * as Path from 'path';
import * as uuid from 'uuid';
import * as Export from '../export';
import * as Fs from 'fs';

export function exportHtmlProject({
	host,
	dataHost,
	port
}: T.MatcherContext): T.Matcher<M.ExportHtmlProject> {
	return async m => {
		console.log(m);
		const app = await host.getApp();
		const sender = app || (await host.getSender());
		const appId = m.appId || (app ? app.getId() : undefined);
		const project = await dataHost.getProject(m.payload.projectId);

		if (!project) {
			return;
		}

		const name = m.payload.path ? Path.basename(m.payload.path) : `${project.getName()}.html`;
		const targetPath =
			m.payload.path ||
			(await host.selectSaveFile({
				defaultPath: `/${name}`,
				title: `Export ${project.getName()} as HTML file`,
				filters: [
					{
						name: project.getName(),
						extensions: ['html', 'htm']
					}
				]
			}));

		if (!targetPath && host.type !== T.HostType.Browser) {
			return;
		}

		const htmlExport = await Export.exportHtmlProject({
			project,
			port
		});

		if (htmlExport.type === T.ExportResultType.ExportError) {
			sender.send({
				appId,
				type: M.MessageType.ShowError,
				transaction: m.transaction,
				id: uuid.v4(),
				payload: {
					message: `HTML Export for ${project.getName()} failed.`,
					detail: `It threw the following error: ${htmlExport.error.message}`,
					error: {
						message: htmlExport.error.message,
						stack: htmlExport.error.stack || ''
					}
				}
			});
			return;
		}

		const firstFileResult = await getFirstFile(htmlExport.fs);

		if (firstFileResult.type === FsResultType.FsError) {
			sender.send({
				appId,
				type: M.MessageType.ShowError,
				transaction: m.transaction,
				id: uuid.v4(),
				payload: {
					message: `HTML Export for ${project.getName()} failed.`,
					detail: `It threw the following error: ${firstFileResult.error.message}`,
					error: {
						message: firstFileResult.error.message,
						stack: firstFileResult.error.stack || ''
					}
				}
			});
			return;
		}

		try {
			await host.writeFile(`${project.getName()}.html`, firstFileResult.payload);
			await host.saveFile(`${project.getName()}.html`, firstFileResult.payload);
		} catch (err) {
			sender.send({
				appId,
				type: M.MessageType.ShowError,
				transaction: m.transaction,
				id: uuid.v4(),
				payload: {
					message: `HTML Export for ${project.getName()} failed.`,
					detail: `It threw the following error: ${err.message}`,
					error: {
						message: err.message,
						stack: err.stack || ''
					}
				}
			});
		}
	};
}

type FsResult<T> = FsError | FsSuccess<T>;

interface FsError {
	type: FsResultType.FsError;
	error: Error;
}

interface FsSuccess<T> {
	type: FsResultType.FsSuccess;
	payload: T;
}

enum FsResultType {
	FsError,
	FsSuccess
}

async function getFirstFile(fs: typeof Fs): Promise<FsResult<Buffer>> {
	try {
		const [firstFile] = fs.readdirSync('/');
		const firstFileContents = fs.readFileSync(`/${firstFile}`);

		return {
			type: FsResultType.FsSuccess,
			payload: firstFileContents
		};
	} catch (err) {
		return {
			type: FsResultType.FsError,
			error: err
		};
	}
}
