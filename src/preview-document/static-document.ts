import * as Path from 'path';
import * as Types from '../types';
import * as AlvaUtil from '../alva-util';
import * as fetch from 'isomorphic-fetch';

export interface StaticDocumentConfig {
	data: Types.SerializedProject;
	port?: number;
	scripts: string[];
}

export const staticDocument = async (config: StaticDocumentConfig): Promise<string> => {
	const SCRIPT_PATHS = [
		'/scripts/Mobx.js',
		'/scripts/previewRenderer.js',
		'/scripts/preview.js'
	].map(p => (typeof window !== 'undefined' ? p : `http://localhost:${config.port || 80}/${p}`));

	// Read preview scripts from disk
	const scripts = (await Promise.all(
		SCRIPT_PATHS.map(async scriptPath => ({
			basename: Path.basename(scriptPath, Path.extname(scriptPath)),
			content: await fetch(scriptPath).then(r => r.text())
		}))
	)).map(script => `<script data-script="${script.basename}">${script.content}</script>`);

	config.scripts = [...config.scripts, ...scripts];
	return doc(config);
};

const doc = (config: StaticDocumentConfig) => `<!doctype html>
<html>
<head>
	<meta charset="utf-8"/>
	<meta name="viewport" content="width=device-width" />
	<title></title>
	<style>
		html, body {
			margin: 0;
			background: white;
		}
		#preview {
			background: white;
		}
	</style>
</head>
<body>
	<div id="preview"></div>
	<textarea data-data="alva" style="display: none">${encodeURIComponent(
		AlvaUtil.toJSON({
			data: config.data,
			transferType: Types.PreviewTransferType.Inline,
			mode: Types.PreviewDocumentMode.Static
		})
	)}</textarea>
	${config.scripts ? config.scripts.join('\n') : ''}
</body>
</html>
`;
