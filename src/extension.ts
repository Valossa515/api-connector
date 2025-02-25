import * as vscode from 'vscode';
const axios = require('axios');

class ApiPanel {
    public static currentPanel: ApiPanel | undefined = undefined;
    static readonly viewType = 'apiConnectorPanel';

    panel: vscode.WebviewPanel;
    private requestHistory: Array<{ method: string, url: string, headers: any, body: string }> = [];

    // 1) Armazena cabeçalhos de autenticação aqui
    private authHeaders: any = {};

    constructor() {
        this.panel = vscode.window.createWebviewPanel(
            ApiPanel.viewType,
            'API Connector',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true // Mantém o estado da Webview ao alternar entre abas
            }
        );

        this.panel.webview.html = this._getHtml();

        this.panel.webview.onDidReceiveMessage(async (message: {
            command: string;
            method: string;
            url: string;
            body: string;
            headers: any;
            params: string;
            data?: any;
            format?: string;
            authType?: string;
            token?: string;
            clientId?: string;
            clientSecret?: string;
            index?: number;
        }) => {
            if (message.command === 'fetchApi') {
                this.fetchApiResponse(message.method, message.url, message.body, message.headers, message.params);
            } else if (message.command === 'exportResponse') {
                this.exportResponse(message.data, message.format || 'json');
            } else if (message.command === 'loadRequest') {
                if (message.index !== undefined) {
                    this.loadRequestFromHistory(message.index);
                }
            } else if (message.command === 'setAuth') {
                this.setAuthHeaders(
                    message.authType || '',
                    message.token || '',
                    message.clientId || '',
                    message.clientSecret || ''
                );
            }
        });

        this.panel.onDidDispose(() => {
            ApiPanel.currentPanel = undefined;
        });
    }

    static show() {
        if (ApiPanel.currentPanel) {
            ApiPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
        } else {
            ApiPanel.currentPanel = new ApiPanel();
        }
    }

    // 2) Merge dos cabeçalhos de autenticação com os cabeçalhos manuais
    async fetchApiResponse(method: string, url: string, body: string, headers: any, params: string) {
        if (!url) {
            this.panel.webview.postMessage({ command: 'error', message: 'URL não pode estar vazia.' });
            return;
        }

        if (!this.isValidUrl(url)) {
            this.panel.webview.postMessage({ command: 'error', message: 'URL inválida.' });
            return;
        }

        if (body && !this.isValidJson(body)) {
            this.panel.webview.postMessage({ command: 'error', message: 'Corpo da requisição não é um JSON válido.' });
            return;
        }

        if (!this.validateHeaders(headers)) {
            this.panel.webview.postMessage({ command: 'error', message: 'Cabeçalhos inválidos.' });
            return;
        }

        try {
            let fullUrl = url;
            if (params) {
                fullUrl += '?' + params;
            }

            // IMPORTANTE: mescla os headers de autenticação com os digitados
            const mergedHeaders = {
                ...this.authHeaders,
                ...headers
            };

            const options = {
                method: method,
                url: fullUrl,
                data: body ? JSON.parse(body) : undefined,
                headers: mergedHeaders
            };
            const response = await axios(options);

            this.panel.webview.postMessage({
                command: 'response',
                data: response.data,
                status: response.status
            });

            // Salva a requisição no histórico
            this.saveRequestToHistory(method, url, mergedHeaders, body);
        } catch (error: any) {
            this.panel.webview.postMessage({ command: 'error', message: error.message });
        }
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

    saveRequestToHistory(method: string, url: string, headers: any, body: string) {
        this.requestHistory.push({ method, url, headers, body });
        this.panel.webview.postMessage({ command: 'updateHistory', history: this.requestHistory });
    }

    loadRequestFromHistory(index: number) {
        const request = this.requestHistory[index];
        if (request) {
            this.panel.webview.postMessage({ command: 'loadRequest', request });
        }
    }

    async exportResponse(data: any, format: string) {
        let content: string;

        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
        } else if (format === 'xml') {
            content = this.convertJsonToXml(data);
        } else {
            vscode.window.showErrorMessage('Formato de exportação não suportado.');
            return;
        }

        const fileUri = await vscode.window.showSaveDialog({
            filters: {
                'Files': [format]
            },
            saveLabel: 'Salvar'
        });

        if (fileUri) {
            try {
                await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
                vscode.window.showInformationMessage(`Arquivo salvo em: ${fileUri.fsPath}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Erro ao salvar o arquivo: ${(error as any).message}`);
            }
        }
    }

    convertJsonToXml(json: any): string {
        // Implementação simples de conversão de JSON para XML
        let xml = '';
        for (const key in json) {
            if (json.hasOwnProperty(key)) {
                xml += `<${key}>${json[key]}</${key}>`;
            }
        }
        return xml;
    }

    // 3) Armazena o token/cabeçalhos de autenticação aqui
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
                headers = {
                    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
                };
                break;
        }

        // Guarda no atributo da classe, para uso posterior em fetchApiResponse
        this.authHeaders = headers;

        // (Opcional) Se quiser notificar o front-end sobre esses headers:
        this.panel.webview.postMessage({ command: 'setAuthHeaders', headers });
    }

    _getHtml() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>API Connector</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: #f9f9f9;
                        color: #333;
                    }
                    h2 {
                        color: #4CAF50;
                        margin-bottom: 20px;
                    }
                    .container {
                        display: flex;
                        gap: 20px;
                    }
                    .request-section, .response-section, .auth-section {
                        flex: 1;
                        background: #fff;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    label {
                        display: block;
                        font-weight: bold;
                        margin-bottom: 8px;
                    }
                    input, select, textarea {
                        width: 100%;
                        padding: 10px;
                        margin-bottom: 15px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 14px;
                    }
                    textarea {
                        height: 100px;
                        resize: vertical;
                    }
                    button {
                        background-color: #4CAF50;
                        color: white;
                        padding: 10px 15px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        margin-right: 10px;
                    }
                    button:hover {
                        background-color: #45a049;
                    }
                    .add-header-btn {
                        background-color: #008CBA;
                    }
                    .add-header-btn:hover {
                        background-color: #005f73;
                    }
                    .export-btn {
                        background-color: #f44336;
                    }
                    .export-btn:hover {
                        background-color: #d32f2f;
                    }
                    pre {
                        background-color: #2d2d2d;
                        color: #e0e0e0;
                        padding: 15px;
                        border-radius: 4px;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        max-height: 300px;
                        overflow-y: auto;
                    }
                    .loading {
                        display: none;
                        color: #4CAF50;
                        font-weight: bold;
                        margin-bottom: 15px;
                    }
                    .error {
                        color: #f44336;
                        font-weight: bold;
                        margin-bottom: 15px;
                    }
                    .theme-dark {
                        background-color: #1e1e1e;
                        color: #e0e0e0;
                    }
                    .theme-dark .request-section, .theme-dark .response-section, .theme-dark .auth-section {
                        background: #2d2d2d;
                        color: #e0e0e0;
                    }
                    .theme-dark pre {
                        background-color: #1e1e1e;
                        color: #e0e0e0;
                    }
                </style>
            </head>
            <body>
                <h2>API Connector</h2>
                <div class="container">
                    <div class="request-section">
                        <label for="method">Método:</label>
                        <select id="method">
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                            <option value="OPTIONS">OPTIONS</option>
                        </select>
                        
                        <label for="url">URL da API:</label>
                        <input id="url" type="text" placeholder="Digite a URL da API" />

                        <label for="params">Parâmetros (ex: param1=value1&ampparam2=value2):</label>
                        <input id="params" type="text" placeholder="Digite os parâmetros" />
                        
                        <label for="body">Corpo da requisição (JSON):</label>
                        <textarea id="body" placeholder="Corpo da requisição (JSON)"></textarea>

                        <div class="header-inputs" id="headerInputs">
                            <label for="header-name-1">Cabeçalho (Chave) (Opcional caso use a sessão Autenticação):</label>
                            <input id="header-name-1" type="text" placeholder="Digite o nome do cabeçalho" />
                            <label for="header-value-1">Cabeçalho (Valor) (Opcional caso use a sessão Autenticação):</label>
                            <input id="header-value-1" type="text" placeholder="Digite o valor do cabeçalho" />
                        </div>

                        <button class="add-header-btn" onclick="addHeader()">Adicionar Cabeçalho</button>
                        <button onclick="sendRequest()">Enviar</button>
                        <div id="loading" class="loading">Carregando...</div>
                        <div id="error" class="error"></div>
                    </div>

                    <div class="response-section">
                        <label>Resposta:</label>
                        <pre id="response"></pre>
                        <select id="exportFormat">
                            <option value="json">JSON</option>
                            <option value="xml">XML</option>
                        </select>
                        <button class="export-btn" onclick="exportResponse()">Exportar Resposta</button>
                    </div>

                    <div class="auth-section">
                        <h3>Autenticação</h3>
                        <label for="authType">Tipo de Autenticação:</label>
                        <select id="authType">
                            <option value="None">Nenhuma</option>
                            <option value="Bearer">Bearer Token</option>
                            <option value="OAuth">OAuth</option>
                            <option value="Basic">Basic Auth</option>
                        </select>

                        <div id="authFields">
                            <div id="bearerFields" class="auth-fields">
                                <label for="bearerToken">Token:</label>
                                <input id="bearerToken" type="text" placeholder="Digite o token" />
                            </div>
                            <div id="oauthFields" class="auth-fields">
                                <label for="clientId">Client ID:</label>
                                <input id="clientId" type="text" placeholder="Digite o Client ID" />
                                <label for="clientSecret">Client Secret:</label>
                                <input id="clientSecret" type="text" placeholder="Digite o Client Secret" />
                            </div>
                            <div id="basicFields" class="auth-fields">
                                <label for="basicUser">Usuário:</label>
                                <input id="basicUser" type="text" placeholder="Digite o usuário" />
                                <label for="basicPassword">Senha:</label>
                                <input id="basicPassword" type="password" placeholder="Digite a senha" />
                            </div>
                        </div>

                        <button onclick="setAuth()">Aplicar Autenticação</button>
                    </div>
                </div>

                <div class="history-section">
                    <h3>Histórico de Requisições</h3>
                    <ul id="historyList"></ul>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let headerCount = 1;

                    function addHeader() {
                        headerCount++;
                        const headerInputs = document.getElementById('headerInputs');
                        const headerDiv = document.createElement('div');
                        headerDiv.innerHTML = \`
                            <label for="header-name-\${headerCount}">Cabeçalho (Chave):</label>
                            <input id="header-name-\${headerCount}" type="text" placeholder="Digite o nome do cabeçalho" />
                            <label for="header-value-\${headerCount}">Cabeçalho (Valor):</label>
                            <input id="header-value-\${headerCount}" type="text" placeholder="Digite o valor do cabeçalho" />
                        \`;
                        headerInputs.appendChild(headerDiv);
                    }

                    function sendRequest() {
                        const method = document.getElementById('method').value;
                        const url = document.getElementById('url').value;
                        const params = document.getElementById('params').value;
                        const body = document.getElementById('body').value;

                        const headers = {};
                        for (let i = 1; i <= headerCount; i++) {
                            const headerName = document.getElementById('header-name-' + i)?.value;
                            const headerValue = document.getElementById('header-value-' + i)?.value;
                            if (headerName && headerValue) {
                                headers[headerName] = headerValue;
                            }
                        }

                        document.getElementById('loading').style.display = 'block';
                        document.getElementById('error').textContent = '';
                        vscode.postMessage({
                            command: 'fetchApi',
                            method,
                            url,
                            body,
                            headers,
                            params
                        });
                    }

                    function exportResponse() {
                        const response = document.getElementById('response').textContent;
                        const format = document.getElementById('exportFormat').value;
                        vscode.postMessage({ command: 'exportResponse', data: response, format });
                    }

                    function loadRequest(index) {
                        vscode.postMessage({ command: 'loadRequest', index });
                    }

                    function setAuth() {
                        const authType = document.getElementById('authType').value;
                        const token = document.getElementById('bearerToken')?.value;
                        const clientId = document.getElementById('clientId')?.value;
                        const clientSecret = document.getElementById('clientSecret')?.value;
                        vscode.postMessage({
                            command: 'setAuth',
                            authType,
                            token,
                            clientId,
                            clientSecret
                        });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'response') {
                            document.getElementById('loading').style.display = 'none';
                            document.getElementById('response').textContent = \`Status: \${message.status}\n\${JSON.stringify(message.data, null, 2)}\`;
                        } else if (message.command === 'error') {
                            document.getElementById('loading').style.display = 'none';
                            document.getElementById('error').textContent = 'Erro: ' + message.message;
                        } else if (message.command === 'updateHistory') {
                            const historyList = document.getElementById('historyList');
                            historyList.innerHTML = '';
                            message.history.forEach((request, index) => {
                                const li = document.createElement('li');
                                li.textContent = \`\${request.method} \${request.url}\`;
                                li.onclick = () => loadRequest(index);
                                historyList.appendChild(li);
                            });
                        } else if (message.command === 'loadRequest') {
                            document.getElementById('method').value = message.request.method;
                            document.getElementById('url').value = message.request.url;
                            document.getElementById('body').value = message.request.body;
                            // Se quiser, aqui você pode recarregar os cabeçalhos do histórico
                        } else if (message.command === 'setAuthHeaders') {
                            // Opcional: implementar a aplicação/visualização desses headers na UI
                            // Exemplo: injetar inputs com 'Authorization' etc.
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}

function activate(context: vscode.ExtensionContext) {
    let panelCommand = vscode.commands.registerCommand('apiConnector.openPanel', () => {
        ApiPanel.show();
    });
    context.subscriptions.push(panelCommand);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
