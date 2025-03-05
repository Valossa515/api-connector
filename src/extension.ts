import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

class ApiPanel {
    private static currentPanel: ApiPanel | undefined = undefined;
    static readonly viewType = 'apiConnectorPanel';

    panel: vscode.WebviewPanel;
    private requestHistory: Array<{ method: string, url: string, headers: any, body: string, params: string }> = [];
    private authHeaders: any = {};
    private environmentVariables: Record<string, string> = {};
    private currentTheme: 'light' | 'dark' = 'light';
    constructor(private readonly context: vscode.ExtensionContext) {
        const savedVariables = this.context.globalState.get<Record<string, string>>('environmentVariables', {});
            this.environmentVariables = savedVariables;

        const savedHistory = this.context.globalState.get<Array<{ method: string, url: string, headers: any, body: string, params: string }>>('requestHistory', []);
            this.requestHistory = savedHistory;

        this.currentTheme = this.context.globalState.get<string>('currentTheme', 'light') as 'light' | 'dark';

        this.panel = vscode.window.createWebviewPanel(
            ApiPanel.viewType,
            'API Connector',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'dist'))
                ]
            }
        );

        this.panel.webview.postMessage({
            command: 'updateTheme',
            theme: this.currentTheme
        });

        this.panel.webview.html = this._getHtml();

        this.panel.webview.postMessage({
            command: 'updateHistory',
            history: this.requestHistory
        });

        this.panel.webview.onDidReceiveMessage(async (message: {
            command: string;
            method?: string;
            url?: string;
            body?: string;
            headers?: any;
            params?: string;
            data?: any;
            format?: string;
            authType?: string;
            token?: string;
            clientId?: string;
            clientSecret?: string;
            index?: number;
            variables?: Array<{ name: string, value: string }>;
        }) => {
            switch (message.command) {
                case 'fetchApi':
                    if (message.method && message.url && message.headers && message.params !== undefined) {
                        this.fetchApiResponse(message.method, message.url, message.body ?? '', message.headers, message.params);
                    }
                    break;
                case 'exportResponse':
                    if (message.data && message.format) {
                        this.exportResponse(message.data, message.format);
                    }
                    break;
                case 'loadRequest':
                    if (message.index !== undefined) {
                        this.loadRequestFromHistory(message.index);
                    }
                    break;
                case 'setAuth':
                    this.setAuthHeaders(
                        message.authType ?? '',
                        message.token ?? '',
                        message.clientId ?? '',
                        message.clientSecret ?? ''
                    );
                    break;
                case 'saveEnvVariables':
                    if (message.variables) {
                        this.saveEnvironmentVariables(message.variables);
                    }
                    break;
                case 'loadEnvVariables':
                    this.panel.webview.postMessage({
                        command: 'loadEnvVariables',
                        variables: Object.entries(this.environmentVariables).map(([name, value]) => ({ name, value }))
                    });
                    break;
                case 'updateHistory':
                    this.panel.webview.postMessage({
                        command: 'updateHistory',
                        history: this.requestHistory
                    });
                    break;
                case 'clearHistory':
                        this.requestHistory = [];
                        this.context.globalState.update('requestHistory', this.requestHistory);
                        this.panel.webview.postMessage({ command: 'updateHistory', history: this.requestHistory });
                    break;
                case 'deleteHistoryItem':
                        if (message.index !== undefined) {
                            this.requestHistory.splice(message.index, 1); 
                            this.context.globalState.update('requestHistory', this.requestHistory); 
                            this.panel.webview.postMessage({ command: 'updateHistory', history: this.requestHistory });
                        }
                    break;
                case 'openNewInstance':
                    ApiPanel.show(this.context);
                    break;
                case 'toggleTheme':
                        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
                        this.context.globalState.update('currentTheme', this.currentTheme);
                        this.panel.webview.postMessage({
                            command: 'updateTheme',
                            theme: this.currentTheme
                        });
                    break;
            }
        });

        this.panel.onDidDispose(() => {
            ApiPanel.currentPanel = undefined;
        });
    }

    static show(context: vscode.ExtensionContext) {
        ApiPanel.currentPanel = new ApiPanel(context);
    }

    private replaceEnvVariables(input: string): string {
        if (!input) {
            return input;
        }
        return input.replace(/\{\{(.*?)\}\}/g, (match, p1) => this.environmentVariables[p1] || match);
    }

    async fetchApiResponse(method: string, url: string, body: string, headers: any, params: string) {
        if (!url) {
            this.panel.webview.postMessage({ command: 'error', message: 'URL must not be empty.' });
            return;
        }

        const fullUrl = this.replaceEnvVariables(url);

        if (!this.isValidUrl(fullUrl)) {
            this.panel.webview.postMessage({ command: 'error', message: 'invalid URL.' });
            return;
        }

        if (body && !this.isValidJson(body)) {
            this.panel.webview.postMessage({ command: 'error', message: 'Request body is not a valid JSON.' });
            return;
        }

        if (!this.validateHeaders(headers)) {
            this.panel.webview.postMessage({ command: 'error', message: 'invalid headers.' });
            return;
        }

        try {
            const fullBody = this.replaceEnvVariables(body);
            const fullHeaders = Object.keys(headers).reduce((acc, key) => {
                acc[key] = this.replaceEnvVariables(headers[key]);
                return acc;
            }, {} as Record<string, string>);

            let finalUrl = fullUrl;
            if (params) {
                finalUrl += '?' + params;
            }

            const mergedHeaders = {
                ...this.authHeaders,
                ...fullHeaders
            };

            const options = {
                method: method,
                url: finalUrl,
                data: fullBody ? JSON.parse(fullBody) : undefined,
                headers: mergedHeaders
            };
            const response = await axios(options);

            this.panel.webview.postMessage({
                command: 'response',
                data: response.data,
                status: response.status
            });

            this.saveRequestToHistory(method, fullUrl, mergedHeaders, fullBody, params);
        } catch (error: any) {
            this.panel.webview.postMessage({ command: 'error', message: error.message });
        }
    }

    private saveEnvironmentVariables(variables: Array<{ name: string, value: string }>) {
        this.environmentVariables = {};
        variables.forEach(variable => {
            this.environmentVariables[variable.name] = variable.value;
        });
        this.context.globalState.update('environmentVariables', this.environmentVariables);
        this.panel.webview.postMessage({ command: 'loadEnvVariables', variables });
    }

    isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    isValidJson(jsonString: string): boolean {
        try {
            JSON.parse(jsonString);
            return true;
        } catch (error) {
            return false;
        }
    }

    isValidHeader(header: string): boolean {
        const regex = /^[a-zA-Z0-9\-_]+$/;
        return regex.test(header);
    }

    validateHeaders(headers: any): boolean {
        for (const key in headers) {
            if (!this.isValidHeader(key)) {
                return false;
            }
        }
        return true;
    }

    saveRequestToHistory(method: string, url: string, headers: any, body: string, params: string) {
        this.requestHistory.push({ method, url, headers, body, params });
        this.context.globalState.update('requestHistory', this.requestHistory);
        this.panel.webview.postMessage({ command: 'updateHistory', history: this.requestHistory });
    }
    

    loadRequestFromHistory(index: number) {
        const request = this.requestHistory[index];
        if (request) {
            this.panel.webview.postMessage({ 
                command: 'loadRequest', 
                request: {
                    method: request.method,
                    url: request.url,
                    body: request.body,
                    headers: request.headers,
                    params: request.params
                }
            });
        }
    }    

    async exportResponse(data: any, format: string) {
        let content: string;
    
        if (format === 'json') {
            content = data;
        } else if (format === 'xml') {
            content = this.convertJsonToXml(data);
        } else {
            vscode.window.showErrorMessage('Exporting format not supported.');
            return;
        }
    
        const fileUri = await vscode.window.showSaveDialog({
            filters: {
                'Files': [format]
            },
            saveLabel: 'Save'
        });
    
        if (fileUri) {
            try {
                await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
                vscode.window.showInformationMessage(`File saved in: ${fileUri.fsPath}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Error saving file: ${(error as any).message}`);
            }
        }
    }

    convertJsonToXml(json: any): string {
        let xml = '';
        for (const key in json) {
            if (json.hasOwnProperty(key)) {
                xml += `<${key}>${json[key]}</${key}>`;
            }
        }
        return xml;
    }

    setAuthHeaders(
        authType: string = '',
        token: string = '',
        clientId: string = '',
        clientSecret: string = ''
    ) {
        let headers = {};
        switch (authType) {
            case 'Bearer':
                headers = { Authorization: `Bearer ${token}` };
                break;
            case 'OAuth':
                headers = {
                    Authorization: `OAuth ${token}`,
                    'Client-ID': clientId,
                    'Client-Secret': clientSecret
                };
                break;
            case 'Basic':
                {
                    const encodedCredentials = Buffer.from(clientId + ':' + clientSecret).toString('base64');
                    headers = {
                        Authorization: `Basic ${encodedCredentials}`
                    };
                }
                break;
        }

        this.authHeaders = headers;
        this.panel.webview.postMessage({ command: 'setAuthHeaders', headers });
    }

    private _getHtml(): string {
        const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'index.html');
        console.log(htmlPath.fsPath);
    
        const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
    
        const cssUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'styles.css')
        );
        const jsUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'script.js')
        );
    
        let finalHtmlContent = htmlContent.replace('{{styles}}', cssUri.toString())
            .replace('{{script}}', jsUri.toString());
    
        return finalHtmlContent;
    }
}

function activate(context: vscode.ExtensionContext) {
    let panelCommand = vscode.commands.registerCommand('apiConnector.openPanel', () => {
        ApiPanel.show(context);
    });
    context.subscriptions.push(panelCommand);
}


function deactivate() {
    // This method is called when your extension is deactivated
}

module.exports = {
    activate,
    deactivate
};