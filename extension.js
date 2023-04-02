const { spawn, exec } = require('child_process');
const vscode = require('vscode');
const kill = require('tree-kill');

var child = null;
var outputChannel = null;

function activate(context) {
	console.debug('Congratulations, your extension "logcatcode" is now active!');
	let startCommand = vscode.commands.registerCommand('logcatcode.start', onStart);
	let stopCommand = vscode.commands.registerCommand('logcatcode.stop', onStop);
	context.subscriptions.push(startCommand, stopCommand);
}

function onStart() {
	if (child != null) {
		onStop();
	}
	child = spawn(`adb logcat -c && adb logcat`, {
		stdio: 'pipe',
		shell: true,
		cwd: process.cwd(),
	});
	console.debug('start pid:' + child.pid);
	child.stdout.setEncoding('utf8');
	if (outputChannel == null) {
		outputChannel = vscode.window.createOutputChannel("logcat", "log");
	}
	child.stdout.on('data', (data) => {
		outputChannel.append(data);
	});
	child.stderr.setEncoding('utf8');
	child.stderr.on('data', (data) => {
		outputChannel.append('[logcatcode]error:' + data);
	});

	child.on('close', (code, signal) => {
		console.debug(
			`child process terminated due to receipt of signal ${signal}`);
	});
	outputChannel.show();
}

function onStop() {
	if (child != null) {
		console.debug("kill pid:" + child.pid);
		kill(child.pid);
		child = null;
		outputChannel.hide();
		outputChannel.dispose();
		outputChannel = null
	}
}

function deactivate() {
	console.debug("deactivate");
	onStop();
}

module.exports = {
	activate,
	deactivate
}
