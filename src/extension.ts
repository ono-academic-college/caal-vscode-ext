import * as vscode from 'vscode';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import playSound from 'play-sound';

function join(workspace: string, file: string | undefined) {
    return file ? path.join(workspace, file as string) : workspace;
}

export function activate(context: vscode.ExtensionContext) {
    
    const player = playSound();
    const config = vscode.workspace.getConfiguration();
    const workspace = vscode.workspace.workspaceFolders?.[0].uri.fsPath as string;

    !workspace && vscode.window.showErrorMessage('No workspace found');

    var watch = join(workspace, config.get('watchDir'));
    var sound = join(workspace, config.get('soundFile'));
    
    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('caal-course.watchDir') || e.affectsConfiguration('caal-course.soundFile')) {
            watch = join(workspace, config.get('watchDir'));
            sound = join(workspace, config.get('soundFile'));
        }
    });

    const watcher = chokidar.watch(watch, { ignored: /^\./, persistent: true });

    watcher.on('add', (alert) => {
        if (fs.existsSync(alert)) {
            fs.readFile(alert, 'utf-8', (err, data) => {
                if (err) { return vscode.window.showErrorMessage(`Error reading ${alert}`); }
                fs.unlink(alert, (err) => err ? console.error(err) : null);
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
