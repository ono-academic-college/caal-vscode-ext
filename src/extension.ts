import * as vscode from 'vscode';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';

function rename(before: string, after: string) {
    fs.unlink(after, () => fs.rename(before, after, () => {} ));
}

function join(workspace: string, file: string | undefined) {
    return file ? path.join(workspace, file as string) : workspace;
}

export function activate(context: vscode.ExtensionContext) {
    
    const config = vscode.workspace.getConfiguration();
    const workspace = vscode.workspace.workspaceFolders?.[0].uri.fsPath as string;

    if (!workspace) { return vscode.window.showErrorMessage('No workspace found'); }

    var watch = join(workspace, config.get('caal-vscode-ext.watchDir'));
    var sound = vscode.Uri.file(context.asAbsolutePath('assets/alert.mp3'));
    
    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) =>
            watch = join(workspace, config.get('watchDir')));

    const watcher = chokidar.watch(watch, { ignored: /^\./, persistent: true });

    watcher.on('add', (alert: string) => {
        if (fs.existsSync(alert) && path.extname(alert) !== '.bak') {
            fs.readFile(alert, 'utf-8', (err, data) => {
                if (err) { return vscode.window.showErrorMessage(`Error reading ${alert}`); }
                rename(alert, alert + '.bak');
                const panel = vscode.window.createWebviewPanel(
                    'audioPlayer',
                    'Audio Player',
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                        localResourceRoots: [context.extensionUri]
                    }
                );
                panel.webview.html = getWebviewContent(sound, panel.webview);
                panel.webview.postMessage({ command: 'playAudio' });
                vscode.window.showInformationMessage(`${path.basename(alert)}: ` + data);
            });
        }
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.startWatching', () => 
            vscode.window.showInformationMessage('Started watching the directory.')
        )
    );
}

function getWebviewContent(soundUri: vscode.Uri, webview: vscode.Webview) {
    const audioSrc = webview.asWebviewUri(soundUri);
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Audio Player</title>
        </head>
        <body>
            <audio id="audio" src="${audioSrc}" controls></audio>
            <script>
                const vscode = acquireVsCodeApi();
                const audio = document.getElementById('audio');
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'playAudio') {
                        audio.play();
                    }
                });
            </script>
        </body>
        </html>
    `;
}

export function deactivate() {}
