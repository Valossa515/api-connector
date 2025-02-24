import * as vscode from 'vscode';
const axios = require('axios');

class ApiPanel {
    public static currentPanel: ApiPanel | undefined = undefined;
    static readonly viewType = 'apiConnectorPanel';

    panel: vscode.WebviewPanel;

    constructor() {
        this.panel = vscode.window.createWebviewPanel(
            ApiPanel.viewType,
            'API Connector',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        this.panel.webview.html = this._getHtml();

        this.panel.webview.onDidReceiveMessage(async (message: { command: string; method: string; url: string; body: string; headers: any; params: string; data?: any }) => {
            if (message.command === 'fetchApi') {
                this.fetchApiResponse(message.method, message.url, message.body, message.headers, message.params);
            } else if (message.command === 'exportResponse') {
                this.exportResponse(message.data);
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

        try {
            // Adiciona os parâmetros à URL
            let fullUrl = url;
            if (params) {
                fullUrl += '?' + params;
            }

            const options = {
                method: method,
                url: fullUrl,
                data: body ? JSON.parse(body) : undefined,
                headers: headers
            };
            const response = await axios(options);
            this.panel.webview.postMessage({ command: 'response', data: response.data, status: response.status });
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

    async exportResponse(data: any) {
        // Extrai o status e o JSON da resposta
        const statusMatch = data.match(/^Status: (\d+)/);
        const jsonContent = data.replace(/^Status: \d+\n/, '');
    
        if (!statusMatch || !jsonContent) {
            vscode.window.showErrorMessage('Formato de resposta inválido.');
            return;
        }
    
        const status = statusMatch[1];
    
        // Converte o conteúdo JSON e inclui o status no objeto
        let jsonObject;
        try {
            jsonObject = JSON.parse(jsonContent);
        } catch (error) {
            vscode.window.showErrorMessage('Erro ao parsear JSON.');
            return;
        }
    
        // Adiciona o status ao JSON
        jsonObject.status = status;
    
        // Converte o objeto para string novamente
        const formattedContent = JSON.stringify(jsonObject, null, 2);
    
        // Abre o diálogo de salvamento de arquivo
        const fileUri = await vscode.window.showSaveDialog({
            filters: {
                'JSON Files': ['json']
            },
            saveLabel: 'Salvar'
        });
    
        if (fileUri) {
            try {
                // Salva o conteúdo formatado no arquivo selecionado
                await vscode.workspace.fs.writeFile(fileUri, Buffer.from(formattedContent, 'utf8'));
                vscode.window.showInformationMessage(`Arquivo salvo em: ${fileUri.fsPath}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Erro ao salvar o arquivo: ${(error as any).message}`);
            }
        }
    }
    
    _getHtml() {
        return `
            <html>
            <head>
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
                    .request-section, .response-section {
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
                        </select>
                        
                        <label for="url">URL da API:</label>
                        <input id="url" type="text" placeholder="Digite a URL da API" />

                        <label for="params">Parâmetros (ex: param1=value1&amp;param2=value2):</label>
                        <input id="params" type="text" placeholder="Digite os parâmetros" />
                        
                        <label for="body">Corpo da requisição (JSON):</label>
                        <textarea id="body" placeholder="Corpo da requisição (JSON)"></textarea>

                        <div class="header-inputs" id="headerInputs">
                            <label for="header-name-1">Cabeçalho (Chave):</label>
                            <input id="header-name-1" type="text" placeholder="Digite o nome do cabeçalho" />
                            <label for="header-value-1">Cabeçalho (Valor):</label>
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
                        <button class="export-btn" onclick="exportResponse()">Exportar Resposta</button>
                    </div>
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
                        vscode.postMessage({ command: 'fetchApi', method, url, body, headers, params });
                    }

                    function exportResponse() {
                        const response = document.getElementById('response').textContent;
                        vscode.postMessage({ command: 'exportResponse', data: response });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'response') {
                            document.getElementById('loading').style.display = 'none';
                            document.getElementById('response').textContent = \`Status: \${message.status}\n\${JSON.stringify(message.data, null, 2)}\`;
                        } else if (message.command === 'error') {
                            document.getElementById('loading').style.display = 'none';
                            document.getElementById('error').textContent = 'Erro: ' + message.message;
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