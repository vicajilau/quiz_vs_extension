# QUIZ Validator

A Visual Studio Code extension for validating quiz file formats with JSON schema validation and syntax highlighting.

## Features

- **JSON Schema Validation**: Validates `.quiz` files against a comprehensive schema
- **Real-time Diagnostics**: Shows validation errors and warnings as you type
- **Syntax Highlighting**: Custom syntax highlighting for quiz files
- **Code Snippets**: Pre-defined snippets for creating quiz questions
- **Commands**: Validate quiz files and create sample quizzes
- **Extensible**: Designed to support multiple question types (currently supports `multiple_choice`)

## Quiz File Format

Quiz files use JSON format with the following structure:

```json
{
  "metadata": {
    "title": "Quiz Title",
    "description": "Quiz description",
    "version": 1.0,
    "author": "Author Name"
  },
  "questions": [
    {
      "type": "multiple_choice",
      "text": "Question text?",
      "options": ["Option 1", "Option 2", "Option 3"],
      "correct_answers": [1, 2]
    }
  ]
}
```

## Supported Question Types

### Multiple Choice (`multiple_choice`)

- Supports multiple correct answers
- Validates that `correct_answers` indices are within the options range
- Requires at least 2 options

## Extension Commands

- `Quiz: Validate Quiz File` - Manually validate the current quiz file
- `Quiz: Create Sample Quiz` - Create a sample quiz file in your workspace

## Installation

### For Development

1. Clone this repository
2. Run `npm install` to install dependencies
3. Press `F5` to run the extension in a new Extension Development Host window

### For Production

The extension will be available in the VS Code Marketplace once published.

## Usage

1. Create or open a `.quiz` file
2. The extension will automatically:
   - Apply syntax highlighting
   - Validate the file structure
   - Show errors and warnings in the Problems panel
3. Use `Ctrl+Shift+P` to access quiz commands

## Validation Rules

The extension validates:

- Required metadata fields (title, description, version, author)
- Question structure and types
- Option arrays have at least 2 items for multiple choice
- `correct_answers` indices are valid (within options range)
- JSON syntax and structure

## Development

### Building

```bash
npm run compile
```

### Testing

```bash
npm test
```

### Packaging

```bash
npm run package
```

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

- `myExtension.enable`: Enable/disable this extension.
- `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

- Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
- Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
- Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
