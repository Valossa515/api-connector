const vscode = acquireVsCodeApi();
let headerCount = 1;

function addHeader() {
    headerCount++;
    const headerInputs = document.getElementById('headerInputs');
    const headerDiv = document.createElement('div');
    headerDiv.innerHTML = `
        <label for="header-name-${headerCount}">Cabeçalho (Key):</label>
        <input id="header-name-${headerCount}" type="text" placeholder="Type the header name" />
        <label for="header-value-${headerCount}">Cabeçalho (Valor):</label>
        <input id="header-value-${headerCount}" type="text" placeholder="Type the header value" />
    `;
    headerInputs.appendChild(headerDiv);
    showNotification("Header added successfully!", "success");
}

function sendRequest() {
    const method = document.getElementById('method').value;
    const url = document.getElementById('url').value;
    const params = document.getElementById('params').value;
    const body = document.getElementById('body').value;

    if (!url) {
        document.getElementById('error').textContent = 'URL is required!';
        return;
    }

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
    showNotification("Request sent!", "success");
}

function exportResponse() {
    const response = document.getElementById('response').textContent;
    const format = document.getElementById('exportFormat').value;
    vscode.postMessage({ command: 'exportResponse', data: response, format });
    showNotification("Response exported!", "success");
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
    showNotification("Authentication applied successfully!", "success");
}

function addEnvVariable(name = '', value = '') {
    const envVariables = document.getElementById('envVariables');
    const div = document.createElement('div');
    div.className = 'env-variable';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.marginBottom = '5px';

    div.innerHTML = `
        <input class="env-key" type="text" value="${name}" placeholder="Variable name" style="width: 40%;" />
        <input class="env-value" type="text" value="${value}" placeholder="variable value" style="width: 50%;" />
        <button class="delete-env-btn" onclick="deleteEnvVariable(this)">Delete</button>
    `;
    envVariables.appendChild(div);
    showNotification("Environment Variable added!", "success");
}

function deleteEnvVariable(button) {
    const envVariableDiv = button.parentElement;
    envVariableDiv.remove();
    saveEnvVariables();
    showNotification("Environment Variable removed!", "success");
}


function loadEnvVariables(variables) {
    const envVariables = document.getElementById('envVariables');
    envVariables.innerHTML = '';
    variables.forEach(variable => {
        addEnvVariable(variable.name, variable.value);
    });
}

function saveEnvVariables() {
    const envVariables = [];
    document.querySelectorAll('.env-variable').forEach(div => {
        const name = div.querySelector('.env-key').value;
        const value = div.querySelector('.env-value').value;
        if (name && value) {
            envVariables.push({ name, value });
        }
    });
    vscode.postMessage({ command: 'saveEnvVariables', variables: envVariables });
    showNotification("Environment Variable saved successfully!", "success");
}

window.addEventListener('message', event => {
    const message = event.data;
    if (message.command === 'response') {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('response').textContent = `Status: ${message.status}\n${JSON.stringify(message.data, null, 2)}`;
    } else if (message.command === 'error') {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').textContent = 'Erro: ' + message.message;
    } else if (message.command === 'updateHistory') {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        message.history.forEach((request, index) => {
            const li = document.createElement('li');
            li.textContent = `${request.method} ${request.url}`;
            li.onclick = () => loadRequest(index);
            historyList.appendChild(li);
        });
    } else if (message.command === 'loadRequest') {
        document.getElementById('method').value = message.request.method;
        document.getElementById('url').value = message.request.url;
        document.getElementById('body').value = message.request.body;
    } else if (message.command === 'loadEnvVariables') {
        loadEnvVariables(message.variables);
    }
});

function toggleCollapse(sectionId) {
    const section = document.querySelector(`.${sectionId} .panel-content`);
    const button = document.querySelector(`.${sectionId} .collapse-btn`);

    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        button.textContent = '-';
    } else {
        section.classList.add('collapsed');
        button.textContent = '+';
    }
}

function highlightVariables(fieldId) {
    const inputField = document.getElementById(fieldId);
    const highlightField = document.getElementById(fieldId + 'Highlight');
    let text = inputField.value;

    text = text.replace(/\{\{(.*?)\}\}/g, (match, varName) => {
        return `<span class="brackets">{{</span><span class="variable">${varName}</span><span class="brackets">}}</span>`;
    });

    highlightField.innerHTML = text || "&nbsp;";

    highlightField.style.height = inputField.scrollHeight + "px";

    highlightField.scrollTop = inputField.scrollTop;
    highlightField.scrollLeft = inputField.scrollLeft;
}

document.getElementById('url').addEventListener('input', () => highlightVariables('url'));
document.getElementById('params').addEventListener('input', () => highlightVariables('params'));
document.getElementById('body').addEventListener('input', () => highlightVariables('body'));


function showNotification(message, type = "success") {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.className = "";
    notification.classList.add("show");
    if (type === "error") {
      notification.classList.add("error");
    }
    setTimeout(() => {
      notification.classList.remove("show");
    }, 5000);
  }

function clearHistory() {
    vscode.postMessage({ command: 'clearHistory' });
}


vscode.postMessage({ command: 'loadEnvVariables' });