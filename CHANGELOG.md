# Change Log

All notable changes to the "quiz-file-support" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.2.0] - 2025-07-31

### Added

- **Multiple Question Types**: Expanded support beyond multiple choice questions
  - `single_choice` - Questions with exactly one correct answer
  - `true_false` - Boolean questions with exactly two options
  - All types support explanations and custom point values
- **Enhanced Validation**: Type-specific validation rules
  - `single_choice` and `true_false` questions must have exactly one correct answer
  - `true_false` questions must have exactly two options
  - Improved error messages with question type context
- **Updated Code Snippets**: New snippets for all question types
  - `scq` - Single choice question template
  - `tf` - True/False question template (English)
  - `vf` - True/False question template (Spanish)
  - `q-explain` - Generic question with explanation
  - `q-full` - Complete question with all optional fields
- **Improved Sample Generation**: Create Sample Quiz command now includes examples of all question types
- **Enhanced Schema**: JSON Schema updated with comprehensive validation for all question types
- **Comprehensive Test Suite**: Added 7 new test cases covering all question type validations

### Changed

- **TypeScript Interfaces**: Refactored to use inheritance-based question types with `BaseQuestion`
- **Validation Logic**: Unified validation system that handles all question types consistently
- **Sample Quiz**: Updated to showcase all supported question types with explanations

### Technical Improvements

- Better type safety with TypeScript union types for questions
- More specific error messages for each question type
- Extensible architecture for adding future question types

## [0.1.0] - 2025-01-27

### Added

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

### Technical Features

- Built with TypeScript and esbuild for optimal performance
- Comprehensive test suite with CI/CD pipeline
- AJV-based JSON Schema validation for robust error handling
- VS Code 1.102.0+ compatibility

## [Unreleased]

- Future enhancements and bug fixes
