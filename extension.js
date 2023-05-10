const { spawn } = require('child_process');
const vscode = require('vscode');
const kill = require('tree-kill');

let child = null;
let outputChannel = null;
let regex = null;
let statusBar = null;

var isKilling = false;

function activate(context) {

	const startCommand = vscode.commands.registerCommand('logcatcode.start', onStart);
	const stopCommand = vscode.commands.registerCommand('logcatcode.stop', onStop);
	const showCommand = vscode.commands.registerCommand('logcatcode.show', onShow);
	const filterCommand = vscode.commands.registerCommand('logcatcode.filter', onFilter);
	const restartCommand = vscode.commands.registerCommand('logcatcode.restart', onRestart);
	context.subscriptions.push(startCommand, stopCommand, showCommand, filterCommand, restartCommand);
}

function onRestart() {
	onStop();
	onStart();
}

async function onFilter() {
	if (regex == null) {
		onStart();
		return;
	}
	let reg = await getRegex();
	if (reg) {
		regex = reg;
	}
	if (outputChannel != null) {
		outputChannel.show();
	}
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
		if (!isKilling) {
			vscode.window.showInformationMessage(`adb process terminated due to signal ${signal} code ${code}`);
		}
		isKilling = false;
		if (outputChannel != null) {
			outputChannel.append(`[logcatcode]child process terminated due to receipt of signal ${signal}`);
			onStop()
		}
	});
}

async function getRegex() {
	return await vscode.window.showInputBox({
		ignoreFocusOut: true,
		prompt: '请输入一个过滤 logcat 的正则表达式',
		value: regex,
		validateInput: function (value) {
			try {
				new RegExp(value);
				return null;
			} catch (error) {
				return error.message;
			}
		}
	});
}

async function onStart() {

	if (regex == null) {
		let reg = await getRegex();
		if (!reg) {
			return;
		}
		regex = reg;
	}


	if (child == null) {
		startLogcatProcess();
	}
	outputChannel.clear();
	outputChannel.show();
	statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 900);
	statusBar.text = `logging`;
	statusBar.tooltip = regex;
	statusBar.show();
}

function filterStringByRegex(inputString, regex) {
	if (!regex) {
		return inputString;
	}

	const match = inputString.match(regex);
	return match ? inputString : '';
}

function onStop() {
	if (child !== null) {
		isKilling = true;
		kill(child.pid);
		child = null;
		outputChannel.hide();
		outputChannel.dispose();
		outputChannel = null;
	}
	if (statusBar !== null) {
		statusBar.hide();
		statusBar.dispose();
		statusBar = null;
	}
}

function deactivate() {
	onStop();
}

module.exports = {
	activate,
	deactivate
};