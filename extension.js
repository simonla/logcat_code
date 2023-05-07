const { spawn } = require('child_process');
const vscode = require('vscode');
const kill = require('tree-kill');

let child = null;
let outputChannel = null;
let regex = null;

function activate(context) {
	console.debug('Congratulations, your extension "logcatcode" is now active!');

	const startCommand = vscode.commands.registerCommand('logcatcode.start', onStart);
	const stopCommand = vscode.commands.registerCommand('logcatcode.stop', onStop);
	const showCommand = vscode.commands.registerCommand('logcatcode.show', onShow);
	context.subscriptions.push(startCommand, stopCommand, showCommand);
}

function onShow() {
	if (outputChannel) {
		outputChannel.show();
	}
}

function startLogcatProcess() {
	child = spawn(`adb logcat -c && adb logcat`, {
		stdio: 'pipe',
		shell: true,
		cwd: process.cwd(),
	});
	console.debug('start pid:' + child.pid);

	child.stdout.setEncoding('utf8');

	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel("logcat", "log");
	}

	child.stdout.on('data', (data) => {
		data.split(/\r?\n/).forEach((line) => {
			if (filterStringByRegex(line, regex)) {
				outputChannel.append(line + "\n");
			}
		});
	});

	child.stderr.setEncoding('utf8');

	child.stderr.on('data', (data) => {
		outputChannel.append(`[logcatcode]error: ${data}`);
	});

	child.on('close', (code, signal) => {
		console.debug(`child process terminated due to receipt of signal ${signal}`);
	});
}

async function onStart() {

	regex = await vscode.window.showInputBox({
		prompt: '请输入一个过滤 logcat 的正则表达式',
		validateInput: function (value) {
			try {
				new RegExp(value);
				return null;
			} catch (error) {
				return error.message;
			}
		}
	});

	if (!regex) {
		console.log('User input is undefined');
		return;
	}

	if (child == null) {
		startLogcatProcess();
	}
	console.log('User input regex: ' + regex);

	outputChannel.show();
}

function filterStringByRegex(inputString, regex) {
	if (!regex) {
		return inputString;
	}

	const match = inputString.match(new RegExp(regex));
	return match ? inputString : '';
}

function onStop() {
	if (child !== null) {
		console.debug(`kill pid: ${child.pid}`);
		kill(child.pid);
		child = null;
		outputChannel.hide();
		outputChannel.dispose();
		outputChannel = null;
		regex = null;
	}
}

function deactivate() {
	console.debug("deactivate");
	onStop();
}

module.exports = {
	activate,
	deactivate
};