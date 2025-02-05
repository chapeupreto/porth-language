'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const search = require("./search");
const extension_config = vscode.workspace.getConfiguration(this.id);
const isWin = process.platform === "win32";

function activate(context) {
    console.log('Porth language extension is now active!');

    const actions = {
        SIMULATE: "sim",
        COMPILE: "com",
        RUN: "run",
        TEST: "test",
    }

    const action_strings = {
        sim: 'Simulating',
        com: 'Compiling',
        run: 'Running compiled',
        test: 'Testing',
    }

    let prepareCommand = (action) => {
        console.log(`Preparing command with action [${action}]...`);
        if (action == actions.TEST) {
            vscode.window.showErrorMessage("[Porth]: Not implemented yet :(");
            return;
        }

        let porth_path_conf = extension_config.get('porth.path');
        let porth_path = porth_path_conf != "_builtin_" ? porth_path_conf : path.join(context.extensionPath, "/porth");
        let open_file_path = "", open_file_name = "";

        for (let editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.fsPath.split(".").pop() == "porth") {
                open_file_path = editor.document.uri.fsPath;
                open_file_name = open_file_path.split("\\").pop();
                break;
            }
        }

        if (open_file_name == "" || open_file_path == "") {
            vscode.window.showErrorMessage("[Porth]: Please open a .porth file");
            console.log("Couldn't select a visible editor containing a .porth file");
            return;
        } else {
            console.log(`Selected .porth file path: ${open_file_path} with file name: ${open_file_name}`);
        }

        let flag_autorun = extension_config.get('porth.auto-run');
        let flag_debug = extension_config.get('porth.debug');
        console.log(`Using global extension settings: [Autorun: ${flag_autorun}, Debug: ${flag_debug}]`);

        buildCommand(action, porth_path, open_file_path, open_file_name, flag_autorun, flag_debug);
    };

    let buildCommand = (action, porth_path, open_file_path, open_file_name, flag_autorun, flag_debug) => {
        console.log("Building command...");
        let cmd = "";
        let args = [];
        switch (action) {
            case actions.SIMULATE:
            case actions.COMPILE:
                cmd = `python3`;
                args = [`${path.join(porth_path, "/porth.py")}`, `-I`, `${porth_path}/std`];
                if (flag_debug) args.push("-debug");
                args.push(`${action}`);
                if (flag_autorun && action == actions.COMPILE) args.push("-r");
                args.push(`${open_file_path}`);
                return executeCommand(cmd, args, action, open_file_name);
            case actions.RUN:
                let basepath = open_file_path.split(".porth")[0];
                fs.stat(basepath, (err, stats) => {
                    if (err && err.code === 'ENOENT') {
                        console.log(`${basepath} does not exist.`);
                        vscode.window.showErrorMessage("[Porth]: Executable not found. Compile before running.");
                        return executeCommand(cmd, args, action, open_file_name);
                    }
                    else if (err) {
                        vscode.window.showErrorMessage('[Porth]: Error while checking if output file exists: ' + err);
                        return;
                    } else {
                        if (isWin) {
                            cmd = `wsl`;
                            args = [`${basepath.replace(/\\/g, '/').replace(/(^)/, '/mnt/$1').replace(':', '')}`];
                        } else {
                            cmd = `${basepath}`;
                            args = [];
                        }
                        console.log(`Selected ${basepath} as the executable to run.`);
                        return executeCommand(cmd, args, action, open_file_name);
                    }
                });
        }
    };

    let executeCommand = (cmd, args, action, open_file_name) => {
        console.log(`Executing command [${cmd}] with args [${args}]...`);
        if (cmd == "") return;
        if (vscode.window.activeTerminal != undefined && vscode.window.activeTerminal.name == "Porth") {
            vscode.window.activeTerminal.dispose();
        }
        let terminal = vscode.window.createTerminal("Porth");

        terminal.show();

        console.log(`[Running]: ${cmd} ${args.join(" ")}`);

        let time_before = Date.now();
        terminal.sendText(cmd + " " + args.join(" "));
    };

    let simulate = vscode.commands.registerCommand('porth.simulate', () => {prepareCommand(actions.SIMULATE)});
    let compile = vscode.commands.registerCommand('porth.compile', () => {prepareCommand(actions.COMPILE)});
    let run = vscode.commands.registerCommand('porth.run', () => {prepareCommand(actions.RUN)});
    let test = vscode.commands.registerCommand('porth.test', () => {prepareCommand(actions.TEST)});

    context.subscriptions.push(simulate);
    context.subscriptions.push(compile);
    context.subscriptions.push(run);
    context.subscriptions.push(test);

    let open_documentation = vscode.commands.registerCommand('porth.OpenExtensionDocumentation', () => {
        search.openURL('https://github.com/timholzhey/porth-language');
    });
    context.subscriptions.push(open_documentation);
}

exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;