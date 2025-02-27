# Changelog

Todas as mudanças notáveis nesta extensão serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.0.6]
### Adicionado
- Notificações para avisar o usuário ao clicar nos botões
- Paineis retrateis
- Novos estilos css para variaveis de ambiente e coloração dos brackets {} para destacar variaveis de ambiente.

### Corrigido
- Processo de exclusão de uma variavel de ambiente.

### Alterado
- Layout do projeto foi alterado para melhorar o entendimento e separar responsabilidades.

## [0.0.5] - 2025-02-25
### Adicionado
- Suporte para variáveis de ambiente, agora é possivel criar, editar e excluir variáveis de ambiente personalizada

## [0.0.3] - 2025-02-25
### Adicionado
- Suporte a autenticação Bearer, OAuth e Basic Auth.
- Aba dedicada para gerenciamento de cabeçalhos.
- Funcionalidade de exportação de respostas em formato XML.
- Validação automática de JSON no corpo da requisição.

### Corrigido
- Erro 401 ao enviar requisições sem cabeçalhos manuais.
- Problema na validação de URLs inválidas.
- Corrigido o carregamento de requisições salvas no histórico.

### Alterado
- Melhoria na interface do usuário para melhor usabilidade.
- Cabeçalhos padrão (`Content-Type: application/json` e `Accept: application/json`) são adicionados automaticamente.

## [0.0.2] - 2025-02-24
### Adicionado
- Funcionalidade de histórico de requisições.
- Suporte a métodos HTTP adicionais (PATCH e OPTIONS).
- Validação de cabeçalhos para garantir que sejam válidos.
- Notificações de erro mais descritivas.

### Corrigido
- Problema na exportação de respostas em formato JSON.
- Erro ao enviar requisições com corpo vazio.

### Alterado
- Melhoria na organização do código para facilitar manutenção.

## [0.0.1] - 2025-02-24
### Adicionado
- Funcionalidade básica de envio de requisições HTTP (GET, POST, PUT, DELETE).
- Exportação de respostas em formato JSON.
- Interface inicial do usuário com campos para URL, método, parâmetros, corpo e cabeçalhos.