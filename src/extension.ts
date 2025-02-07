import * as vscode from 'vscode';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import playSound from 'play-sound';

function rename(before: string, after: string) {
    fs.unlink(after, () => fs.rename(before, after, () => {} ));
}

function join(workspace: string, file: string | undefined) {
    return file ? path.join(workspace, file as string) : workspace;
}

export function activate(context: vscode.ExtensionContext) {
    
    const player = playSound();
    const config = vscode.workspace.getConfiguration();
    const workspace = vscode.workspace.workspaceFolders?.[0].uri.fsPath as string;

    if (!workspace) { return vscode.window.showErrorMessage('No workspace found'); }

    var watch = join(workspace, config.get('caal-vscode-ext.watchDir'));
    var sound = context.asAbsolutePath('assets/alert.mp3');
    
    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) =>
            watch = join(workspace, config.get('watchDir')));

    const watcher = chokidar.watch(watch, { ignored: /^\./, persistent: true });

    watcher.on('add', (alert: string) => {
        if (fs.existsSync(alert) && path.extname(alert) !== '.bak') {
            fs.readFile(alert, 'utf-8', (err, data) => {
                if (err) { return vscode.window.showErrorMessage(`Error reading ${alert}`); }
                rename(alert, alert + '.bak');
                player.play(sound, (err: Error | null) => err ? console.error('Error:', err) : null);
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

export function deactivate() {}
