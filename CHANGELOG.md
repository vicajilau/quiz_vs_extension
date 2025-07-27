# Change Log

All notable changes to the "quiz-file-support" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.0]

- **Language Support**: Complete language support for `.quiz` files with automatic recognition
- **Schema Validation**: Real-time JSON Schema validation for quiz file structure
- **Syntax Highlighting**: Custom syntax highlighting for quiz files based on JSON
- **Advanced Diagnostics**: Comprehensive error detection including:
  - Structure validation for quiz metadata and questions
  - Question type validation (multiple_choice support)
  - Correct answer indices validation within valid option ranges
  - Required field validation for metadata and questions
  - Minimum option requirements for multiple choice questions
- **Code Snippets**: Pre-built code snippets for quick quiz creation
- **Commands**:
  - `Quiz: Validate Quiz File` - Manual validation of current quiz file
  - `Quiz: Create Sample Quiz` - Generate sample quiz file
  - `Quiz: Diagnose Quiz File Detection` - Troubleshoot file detection issues
- **Configuration Options**:
  - `quiz.validation.enabled` - Enable/disable quiz file validation
  - `quiz.validation.strictMode` - Enable strict validation mode
  - `quiz.validation.showWarnings` - Show/hide validation warnings
- **Context Menus**: Validation commands in file explorer and editor context menus
- **File Associations**: Automatic association of `.quiz` files with the quiz language
- **Icon Support**: Custom icons for quiz files and commands