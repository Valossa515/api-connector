const vscode = acquireVsCodeApi();
let headerCount = 1;

function createHeaderRow(count, nameValue = '', valueValue = '') {
    const headerDiv = document.createElement('div');

    const nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', `header-name-${count}`);
    nameLabel.textContent = 'Header (Key):';

    const nameInput = document.createElement('input');
    nameInput.id = `header-name-${count}`;
    nameInput.type = 'text';
    nameInput.placeholder = 'Type the header name';
    nameInput.value = nameValue;

    const valueLabel = document.createElement('label');
    valueLabel.setAttribute('for', `header-value-${count}`);
    valueLabel.textContent = 'Header (Value):';

    const valueInput = document.createElement('input');
    valueInput.id = `header-value-${count}`;
    valueInput.type = 'text';
    valueInput.placeholder = 'Type the header value';
    valueInput.value = valueValue;

    headerDiv.appendChild(nameLabel);
    headerDiv.appendChild(nameInput);
    headerDiv.appendChild(valueLabel);
    headerDiv.appendChild(valueInput);

    return headerDiv;
}

function addHeader() {
    headerCount++;
    const headerInputs = document.getElementById('headerInputs');
    headerInputs.appendChild(createHeaderRow(headerCount));
    showNotification("Header added successfully!", "success");
}

function sendRequest() {
    const method = document.getElementById('method').value;
    const url = document.getElementById('url').textContent;
    const params = document.getElementById('params').textContent;
    const body = document.getElementById('body').textContent;

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
    const responseElement = document.getElementById('response');
    const responseContent = responseElement.textContent;
    const format = document.getElementById('exportFormat').value;
    
    vscode.postMessage({ 
        command: 'exportResponse', 
        data: responseContent, 
        format 
    });
    
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

    const keyInput = document.createElement('input');
    keyInput.className = 'env-key';
    keyInput.type = 'text';
    keyInput.value = name;
    keyInput.placeholder = 'Variable name';
    keyInput.style.width = '40%';

    const valueInput = document.createElement('input');
    valueInput.className = 'env-value';
    valueInput.type = 'text';
    valueInput.value = value;
    valueInput.placeholder = 'Variable value';
    valueInput.style.width = '50%';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-env-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', function () {
        deleteEnvVariable(this);
    });

    div.appendChild(keyInput);
    div.appendChild(valueInput);
    div.appendChild(deleteBtn);
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
    if (message.command === 'updateTheme') {
        const body = document.body;
        if (message.theme === 'dark') {
            body.classList.add('theme-dark');
            document.getElementById('theme-toggle').textContent = '☀️ Light Theme';
        } else {
            body.classList.remove('theme-dark');
            document.getElementById('theme-toggle').textContent = '🌙 Dark Theme';
        }
    }
    if (message.command === 'response') {
        document.getElementById('loading').style.display = 'none';
        const responseWithStatus = {
            statusCode: message.status,
            ...message.data
        };
        const responseElement = document.getElementById('response');
        responseElement.textContent = JSON.stringify(responseWithStatus, null, 2);
    } else if (message.command === 'error') {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').textContent = 'Error: ' + message.message;
    } else if (message.command === 'updateHistory') {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        message.history.forEach((request, index) => {
            const li = document.createElement('li');
            li.textContent = `${request.method} ${request.url}`;
            li.classList.add("history-item");
            li.addEventListener('click', function () {
                loadRequest(index);
                document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
                li.classList.add('active');
            });
            historyList.appendChild(li);
        });
    } else if (message.command === 'loadRequest') {
        document.getElementById('method').value = message.request.method;
        document.getElementById('url').textContent = message.request.url || '';
        document.getElementById('body').value = message.request.body || '';
        document.getElementById('params').textContent = message.request.params || '';

        const headerInputs = document.getElementById('headerInputs');
        headerInputs.innerHTML = '';

        headerCount = 1;

        for (const key in message.request.headers) {
            if (Object.prototype.hasOwnProperty.call(message.request.headers, key)) {
                headerInputs.appendChild(createHeaderRow(headerCount, key, message.request.headers[key]));
                headerCount++;
            }
        }
        highlightVariables('url');
        highlightVariables('params');
        showNotification("Request loaded from history!", "success");
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
    if (!inputField) { return; }

    const selection = window.getSelection();
    let cursorPosition = 0;
    if (selection && selection.rangeCount > 0 && inputField.contains(selection.anchorNode)) {
        cursorPosition = selection.anchorOffset;
    }

    const text = inputField.textContent || '';

    const highlighted = text.replace(/\{\{(.*?)\}\}/g, (_match, varName) => {
        return `<span class="brackets">{{</span><span class="variable">${varName}</span><span class="brackets">}}</span>`;
    });

    inputField.innerHTML = highlighted || "&nbsp;";

    try {
        if (inputField.childNodes.length > 0) {
            const range = document.createRange();
            const firstNode = inputField.childNodes[0];
            const maxOffset = firstNode.textContent ? firstNode.textContent.length : 0;
            range.setStart(firstNode, Math.min(cursorPosition, maxOffset));
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    } catch (_e) {
        // Cursor restoration failed - not critical, user can click to reposition
    }
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

function openNewInstance(){
    vscode.postMessage({ command: 'openNewInstance' });
}

function toggleTheme() {
    vscode.postMessage({
        command: 'toggleTheme'
    });
}

document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

vscode.postMessage({ command: 'loadEnvVariables' });