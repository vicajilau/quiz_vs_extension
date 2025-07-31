<p align="center">
  <img src=".github/assets/icon.png" alt="Quiz logo" width="128" height="128">
<h1 align="center">Quiz VS Code Extension</h1>

<p align="center">
  <img src="https://github.com/vicajilau/quiz_vs_extension/workflows/CI%20-%20Test%20Extension/badge.svg" alt="CI">
  <img src="https://github.com/vicajilau/quiz_vs_extension/workflows/Publish%20Extension/badge.svg" alt="CD">
</p>

A VS Code extension that provides comprehensive support for `.quiz` files with JSON validation, syntax highlighting, and real-time diagnostics for multiple question types.

![QUIZ Extension Demo](.github/assets/demo.png)

_The extension automatically detects `.quiz` files and provides real-time validation with detailed error messages, as shown above where invalid `correct_answers` indices are highlighted with clear diagnostic messages._

## Features

- **Automatic recognition**: `.quiz` files are automatically recognized with custom language support
- **Multiple Question Types**: Support for various question formats:
  - `multiple_choice` - Questions with one or more correct answers
  - `single_choice` - Questions with exactly one correct answer
  - `true_false` - Boolean questions with true/false options
- **Schema validation**: Real-time validation of quiz file structure using JSON Schema
- **Advanced diagnostics**: Comprehensive error detection including:
  - Structure validation for quiz metadata and questions
  - Question type-specific validation rules
  - Correct answer indices within valid ranges
  - Required field validation for metadata and questions
  - Type-specific option requirements (e.g., exactly 2 options for true/false)
- **Syntax highlighting**: Quiz-specific JSON highlighting
- **Code snippets**: Pre-built snippets for all question types
- **Commands**: Manual validation and sample quiz creation with examples of all question types

## Quiz File Structure

### Basic Structure

```json
{
  "metadata": {
    "title": "Sample Quiz",
    "description": "A comprehensive quiz example with multiple question types",
    "version": "1.0.0",
    "author": "Quiz Author",
    "created_date": "2025-01-01T00:00:00Z",
    "tags": ["education", "assessment"]
  },
  "questions": [
    {
      "type": "multiple_choice",
      "text": "What is the capital of France?",
      "options": ["Madrid", "Paris", "Rome", "Berlin"],
      "correct_answers": [1],
      "explanation": "Paris is the capital city of France."
    }
  ]
}
```

### Question Types

#### Multiple Choice Questions

Supports one or more correct answers:

```json
{
  "type": "multiple_choice",
  "text": "Which of the following are programming languages?",
  "options": ["Python", "HTML", "C++", "CSS"],
  "correct_answers": [0, 2],
  "points": 2,
  "explanation": "Python and C++ are programming languages, while HTML and CSS are markup/styling languages."
}
```

#### Single Choice Questions

Must have exactly one correct answer:

```json
{
  "type": "single_choice",
  "text": "What is the most widely used programming language for web development?",
  "options": ["Python", "JavaScript", "Java", "C++"],
  "correct_answers": [1],
  "explanation": "JavaScript is the most widely used programming language for web development."
}
```

#### True/False Questions

Must have exactly two options and one correct answer:

```json
{
  "type": "true_false",
  "text": "The Earth is flat.",
  "options": ["True", "False"],
  "correct_answers": [1],
  "explanation": "The Earth is not flat; it is an oblate spheroid, roughly spherical in shape."
}
```

```json
{
  "type": "true_false",
  "text": "Python is an interpreted programming language.",
  "options": ["Verdadero", "Falso"],
  "correct_answers": [0],
  "explanation": "Python is indeed an interpreted programming language."
}
```

## Requirements

- VS Code 1.102.0 or higher

## Commands

- `Quiz: Validate Quiz File`: Manually validate the current quiz file
- `Quiz: Create Sample Quiz`: Create a sample quiz file with examples of all question types
- `Quiz: Diagnose Quiz File Detection`: Troubleshoot file detection issues

## Code Snippets

The extension provides several code snippets to speed up quiz creation:

- `quiz` - Complete quiz template
- `mcq` - Multiple choice question
- `mcq-multi` - Multiple choice with multiple correct answers
- `scq` - Single choice question
- `tf` - True/False question (English)
- `vf` - True/False question (Spanish: Verdadero/Falso)
- `q-explain` - Question with explanation (any type)
- `q-full` - Complete question with all optional fields
- `metadata` - Complete metadata block

## Development Installation

1. **Clone this repository**

   ```bash
   git clone https://github.com/vicajilau/quiz_vs_extension.git
   cd quiz_vs_extension
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Compile the extension**

   ```bash
   npm run compile
   ```

4. **Test the extension**
   - Press `F5` to open a new VS Code window with the extension loaded
   - Create or open a `.quiz` file to test the features

## Development and Commands

### Main Commands

- `npm run compile`: Compile TypeScript and run linting
- `npm run watch`: Compile in watch mode (recompiles automatically)
- `npm run test`: Run automated tests
- `npm run vsce:package`: Create VSIX package for distribution
- `npm run vsce:publish`: Publish extension to VS Code Marketplace

### Development Workflow

1. **During active development:**

   ```bash
   npm run watch
   ```

   This maintains automatic compilation while you edit the code.

2. **To test changes:**

   - Press `F5` to launch extension in debug mode
   - Use `Ctrl+Shift+F5` to reload the extension window

3. **Before committing:**

   ```bash
   npm run compile  # Verify everything compiles without errors
   ```

4. **To create a new version:**

   ```bash
   # 1. Compile and verify
   npm run compile

   # 2. Run tests to ensure quality
   npm test

   # 3. Create VSIX package
   npm run vsce:package

   # 4. Install locally to test (replace x.y.z with version from package.json)
   code --install-extension quiz-file-support-x.y.z.vsix
   ```

### Testing

The extension includes comprehensive validation to ensure quiz file accuracy:

- **JSON Schema validation**: Validates against comprehensive schema
- **Type validation**: Ensures correct data types for all fields
- **Range validation**: Verifies `correct_answers` indices are valid
- **Structure validation**: Confirms required fields and proper nesting
- **Custom validation**: Question-type specific validation rules

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Test from VS Code: Use "Run Extension Tests" debug configuration
```

### Validation Rules

The extension validates:

- **Metadata requirements**:

  - `title`: Non-empty string
  - `description`: Non-empty string
  - `version`: String (semantic versioning recommended)
  - `author`: Non-empty string

- **Question validation**:

  - Valid question types: `multiple_choice`, `single_choice`, `true_false`
  - Non-empty question text
  - Type-specific requirements:
    - **Multiple choice**: Minimum 2 options, one or more correct answers
    - **Single choice**: Minimum 2 options, exactly one correct answer
    - **True/false**: Exactly 2 options, exactly one correct answer
  - `correct_answers` indices within valid range (0 to options.length-1)
  - Optional fields: `explanation`, `points`

- **JSON structure**: Proper JSON syntax and schema compliance

### Extensible Architecture

The extension is designed to easily support new question types:

```typescript
// Currently supported (v0.2.0)
type QuestionType = "multiple_choice" | "single_choice" | "true_false";

// Future support planned
type QuestionType =
  | "multiple_choice"
  | "single_choice"
  | "true_false"
  | "fill_in_blank"
  | "essay"
  | "matching"
  | "ordering";
  | "fill_in_blank"
  | "essay"
  | "matching";
```

### Project Structure

```
quiz_vs_extension/
├── .github/
│   └── assets/               # Demo images and assets
│       ├── demo.png         # Demo screenshot
│       └── icon.png         # Extension icon
├── schemas/
│   └── quiz-schema.json     # JSON Schema for validation
├── syntaxes/
│   └── quiz.tmLanguage.json # Grammar for syntax highlighting
├── snippets/
│   └── quiz.json           # Code snippets
├── samples/
│   └── sample.quiz         # Example quiz file
├── src/
│   └── extension.ts        # Main extension code
├── dist/                   # Compiled JavaScript (generated)
├── package.json            # Extension configuration
├── language-configuration.json # Language configuration
└── README.md
```

## Contributing

Contributions are welcome! Please follow these steps:

### To Contribute

1. **Fork the repository**
2. **Create a branch for your feature:**

   ```bash
   git checkout -b feature/new-question-type
   ```

3. **Make changes and compile:**

   ```bash
   npm run compile  # Verify it compiles without errors
   ```

4. **Test the extension:**

   ```bash
   # Create test package
   npm run vsce:package

   # Install it locally
   code --install-extension quiz-file-support-*.vsix
   ```

5. **Commit and push:**

   ```bash
   git add .
   git commit -m "feat: add true_false question type support"
   git push origin feature/new-question-type
   ```

6. **Create Pull Request**

### Conventions

- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/)

  - `feat:` for new features (e.g., new question types)
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `refactor:` for refactoring

- **Code**:
  - Use TypeScript with strict types
  - Run linting before commit
  - Add comments for complex validation logic
  - Update JSON schema when adding new question types

### Adding New Question Types

The extension currently supports three question types. To add a new question type:

1. **Update the JSON schema** (`schemas/quiz-schema.json`) with validation rules
2. **Add TypeScript interfaces** (`src/extension.ts`) following the `BaseQuestion` pattern
3. **Implement validation logic** for the new type in the validation function
4. **Add code snippets** (`snippets/quiz.json`) for easy question creation
5. **Add comprehensive tests** in the test suite
6. **Update documentation** and examples

Example of adding a new question type:

```typescript
interface FillInBlankQuestion extends BaseQuestion {
  type: "fill_in_blank";
  template: string; // Text with {blanks} to fill
  answers: string[]; // Possible answers for each blank
}
```

### Reporting Issues

If you find a bug or have a suggestion:

1. **Check** that a similar issue doesn't already exist
2. **Create a new issue** with:
   - Clear description of the problem
   - Steps to reproduce
   - Example `.quiz` file if relevant
   - VS Code and extension version

## License

This project is under the MIT license.
