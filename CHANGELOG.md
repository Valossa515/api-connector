# Changelog

All notable changes to this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.7] - 2025-03-05
### Fixed
- Env variable replacement in param field.

## [0.2.6] - 2025-03-05
### Added
- Env Variable Highlight.

## [0.2.5] - 2025-03-05
### Added
- Responsive Css.

## [0.2.4] - 2025-03-05
### Fixed
- Css features fixes.

### Added
- Request history item click css.
- Request history item now when clicked fills the fields of Request section.

## [0.2.3] - 2025-03-03
### Fixed
- Css features fixes

## [0.2.2] - 2025-02-28
### Fixed
- Css features for input fields.

## [0.2.1] - 2025-02-28
### Fixed
- Css features for json box.

## [0.2.0] - 2025-02-28
### Fixed
- Css features.

## [0.1.9] - 2025-02-28
### Added
- Adding new dark theme auto save.

## [0.1.8] - 2025-02-28
### Added
- Adding new styles for Request History Panel.

### Fixed
- Exporting function json with pretty format.

## [0.1.7] - 2025-02-28
### Added
- Adding new instance button.

## [0.1.6] - 2025-02-27
### Added
- Internationalization.

## [0.1.5] - 2025-02-27
### Added
- Automatic loading of history and clearing of request history.

## [0.1.4] - 2025-02-27
### Added
- Notifications to alert the user when clicking buttons.
- Collapsible panels.
- New CSS styles for environment variables and coloring of brackets `{}` to highlight environment variables.

### Fixed
- Process for deleting an environment variable.

### Changed
- Project layout was changed to improve understanding and separate responsibilities.

## [0.0.5] - 2025-02-25
### Added
- Support for environment variables, now you can create, edit, and delete custom environment variables.

## [0.0.3] - 2025-02-25
### Added
- Support for Bearer, OAuth, and Basic Auth authentication.
- Dedicated tab for header management.
- Export response functionality in XML format.
- Automatic JSON validation in the request body.

### Fixed
- 401 error when sending requests without manual headers.
- Issue with invalid URL validation.
- Fixed loading of saved requests in history.

### Changed
- Improved user interface for better usability.
- Default headers (`Content-Type: application/json` and `Accept: application/json`) are added automatically.

## [0.0.2] - 2025-02-24
### Added
- Request history functionality.
- Support for additional HTTP methods (PATCH and OPTIONS).
- Header validation to ensure they are valid.
- More descriptive error notifications.

### Fixed
- Issue with exporting responses in JSON format.
- Error when sending requests with an empty body.

### Changed
- Improved code organization for easier maintenance.

## [0.0.1] - 2025-02-24
### Added
- Basic functionality for sending HTTP requests (GET, POST, PUT, DELETE).
- Export responses in JSON format.
- Initial user interface with fields for URL, method, parameters, body, and headers.