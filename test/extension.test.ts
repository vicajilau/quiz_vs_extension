import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('QUIZ Extension Test Suite', () => {
    vscode.window.showInformationMessage('Starting QUIZ extension tests.');

    // Helper function to create a temporary document
    async function createTestDocument(content: string, fileName: string): Promise<vscode.TextDocument> {
        const uri = vscode.Uri.file(path.join(__dirname, '..', '..', 'test-files', fileName));
        const edit = new vscode.WorkspaceEdit();
        edit.createFile(uri, { ignoreIfExists: true });
        await vscode.workspace.applyEdit(edit);
        
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);
        await editor.edit(editBuilder => {
            editBuilder.replace(new vscode.Range(0, 0, document.lineCount, 0), content);
        });
        
        return document;
    }

    // Helper function to get diagnostics for a document
    async function getDiagnostics(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
        // Wait for diagnostics to be generated
        await new Promise(resolve => setTimeout(resolve, 1000));
        return vscode.languages.getDiagnostics(document.uri);
    }

    // Helper function to cleanup test files
    async function cleanup() {
        const testFilesDir = path.join(__dirname, '..', '..', 'test-files');
        try {
            const uri = vscode.Uri.file(testFilesDir);
            await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: false });
        } catch (error) {
            // Ignore if directory doesn't exist
        }
    }

    setup(async () => {
        await cleanup();
    });

    teardown(async () => {
        await cleanup();
    });

    suite('Quiz File Language Detection', () => {
        test('Should detect .quiz files as quiz language', async () => {
            const validQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "What is 2+2?",
                        options: ["3", "4", "5"],
                        correct_answers: [1]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(validQuiz, null, 2), 'test.quiz');
            assert.strictEqual(document.languageId, 'quiz');
        });
    });

    suite('Quiz File Validation - Valid Files', () => {
        test('Should not show errors for valid quiz file', async () => {
            const validQuiz = {
                metadata: {
                    title: "Valid Quiz",
                    description: "A properly formatted quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "What is the capital of France?",
                        options: ["Madrid", "Paris", "Rome", "Berlin"],
                        correct_answers: [1]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(validQuiz, null, 2), 'valid.quiz');
            const diagnostics = await getDiagnostics(document);
            
            // Should have no errors
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.strictEqual(errors.length, 0, `Expected no errors, but found: ${errors.map(e => e.message).join(', ')}`);
        });

        test('Should not show errors for quiz with multiple correct answers', async () => {
            const validQuiz = {
                metadata: {
                    title: "Multi-Answer Quiz",
                    description: "Quiz with multiple correct answers",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Which are programming languages?",
                        options: ["Python", "HTML", "C++", "CSS"],
                        correct_answers: [0, 2]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(validQuiz, null, 2), 'multi-answer.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.strictEqual(errors.length, 0);
        });
    });

    suite('Quiz File Validation - Missing Required Fields', () => {
        test('Should show error for missing metadata', async () => {
            const invalidQuiz = {
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B"],
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'no-metadata.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for missing metadata');
            
            const hasMetadataError = errors.some(e => e.message.includes('metadata'));
            assert.ok(hasMetadataError, 'Should have error mentioning metadata');
        });

        test('Should show error for missing questions', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                }
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'no-questions.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for missing questions');
            
            const hasQuestionsError = errors.some(e => e.message.includes('questions'));
            assert.ok(hasQuestionsError, 'Should have error mentioning questions');
        });

        test('Should show error for missing metadata.title', async () => {
            const invalidQuiz = {
                metadata: {
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B"],
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'no-title.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for missing title');
            
            const hasTitleError = errors.some(e => e.message.includes('title'));
            assert.ok(hasTitleError, 'Should have error mentioning title');
        });
    });

    suite('Quiz File Validation - Invalid Question Data', () => {
        test('Should show error for invalid correct_answers index', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Invalid Quiz",
                    description: "Quiz with invalid correct_answers",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B", "C"],
                        correct_answers: [0, 5] // Index 5 is out of range for 3 options
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'invalid-index.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for invalid index');
            
            const hasIndexError = errors.some(e => e.message.includes('invalid index 5'));
            assert.ok(hasIndexError, 'Should have error about invalid index 5');
        });

        test('Should show error for negative correct_answers index', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Invalid Quiz",
                    description: "Quiz with negative index",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B", "C"],
                        correct_answers: [-1, 1]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'negative-index.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for negative index');
            
            const hasNegativeError = errors.some(e => e.message.includes('invalid index -1'));
            assert.ok(hasNegativeError, 'Should have error about invalid negative index');
        });

        test('Should show warning for questions with less than 2 options', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Warning Quiz",
                    description: "Quiz with insufficient options",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A"], // Only one option
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'few-options.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const warnings = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning);
            assert.ok(warnings.length > 0, 'Should have warnings for insufficient options');
            
            const hasOptionsWarning = warnings.some(w => w.message.includes('at least 2 options'));
            assert.ok(hasOptionsWarning, 'Should have warning about needing at least 2 options');
        });
    });

    suite('Quiz File Validation - JSON Syntax Errors', () => {
        test('Should show error for invalid JSON syntax', async () => {
            const invalidJson = `{
                "metadata": {
                    "title": "Test Quiz",
                    "description": "Invalid JSON",
                    "version": "1.0",
                    "author": "Test Author"
                },
                "questions": [
                    {
                        "type": "multiple_choice",
                        "text": "Test question", invalid_syntax_here
                        "options": ["A", "B"],
                        "correct_answers": [0]
                    }
                ]
            }`;

            const document = await createTestDocument(invalidJson, 'invalid-json.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for invalid JSON');
            
            const hasJsonError = errors.some(e => e.message.includes('Invalid JSON'));
            assert.ok(hasJsonError, 'Should have error about invalid JSON');
        });
    });

    suite('Quiz Extension Commands', () => {
        test('Should have validate command available', async () => {
            const commands = await vscode.commands.getCommands();
            const hasValidateCommand = commands.includes('quiz-file-support.validateFile');
            assert.ok(hasValidateCommand, 'Should have quiz-file-support.validateFile command');
        });

        test('Should have create sample command available', async () => {
            const commands = await vscode.commands.getCommands();
            const hasCreateCommand = commands.includes('quiz-file-support.createSample');
            assert.ok(hasCreateCommand, 'Should have quiz-file-support.createSample command');
        });

        test('Should have diagnose command available', async () => {
            const commands = await vscode.commands.getCommands();
            const hasDiagnoseCommand = commands.includes('quiz-file-support.diagnoseDetection');
            assert.ok(hasDiagnoseCommand, 'Should have quiz-file-support.diagnoseDetection command');
        });
    });

    suite('Quiz File Structure Validation - Metadata Fields', () => {
        test('Should show error for missing metadata.description', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    version: "1.0",
                    author: "Test Author"
                    // missing description
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B"],
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'no-description.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for missing description');
            
            const hasDescriptionError = errors.some(e => e.message.includes('description'));
            assert.ok(hasDescriptionError, 'Should have error mentioning description');
        });

        test('Should show error for missing metadata.version', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    author: "Test Author"
                    // missing version
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B"],
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'no-version.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for missing version');
            
            const hasVersionError = errors.some(e => e.message.includes('version'));
            assert.ok(hasVersionError, 'Should have error mentioning version');
        });

        test('Should show error for missing metadata.author', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0"
                    // missing author
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B"],
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'no-author.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for missing author');
            
            const hasAuthorError = errors.some(e => e.message.includes('author'));
            assert.ok(hasAuthorError, 'Should have error mentioning author');
        });

        test('Should show error for wrong type in metadata.title', async () => {
            const invalidQuiz = {
                metadata: {
                    title: 123, // should be string
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B"],
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'wrong-title-type.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for wrong title type');
        });

        test('Should show error for wrong type in metadata.version', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: 123, // should be string, not number
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B"],
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'wrong-version-type.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for wrong version type');
        });
    });

    suite('Quiz File Structure Validation - Question Type', () => {
        test('Should show error for invalid question type', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "true_false", // invalid type, only multiple_choice allowed
                        text: "Test question",
                        options: ["A", "B"],
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'invalid-type.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for invalid question type');
        });

        test('Should show error for missing question type', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        // missing type
                        text: "Test question",
                        options: ["A", "B"],
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'missing-type.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for missing type');
        });
    });

    suite('Quiz File Structure Validation - Multiple Choice Fields', () => {
        test('Should show error for missing text in multiple_choice question', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        // missing text
                        options: ["A", "B"],
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'missing-text.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for missing text');
            
            const hasTextError = errors.some(e => e.message.includes('text'));
            assert.ok(hasTextError, 'Should have error mentioning text');
        });

        test('Should show error for missing options in multiple_choice question', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        // missing options
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'missing-options.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for missing options');
            
            const hasOptionsError = errors.some(e => e.message.includes('options'));
            assert.ok(hasOptionsError, 'Should have error mentioning options');
        });

        test('Should show error for missing correct_answers in multiple_choice question', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B"]
                        // missing correct_answers
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'missing-correct-answers.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for missing correct_answers');
            
            const hasCorrectAnswersError = errors.some(e => e.message.includes('correct_answers'));
            assert.ok(hasCorrectAnswersError, 'Should have error mentioning correct_answers');
        });

        test('Should show error for wrong type in question text', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: 123, // should be string
                        options: ["A", "B"],
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'wrong-text-type.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for wrong text type');
        });

        test('Should show error for wrong type in options (not array)', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: "A,B,C", // should be array
                        correct_answers: [0]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'wrong-options-type.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for wrong options type');
        });

        test('Should show error for wrong type in correct_answers (not array)', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B", "C"],
                        correct_answers: 1 // should be array
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'wrong-correct-answers-type.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for wrong correct_answers type');
        });
    });

    suite('Quiz File Structure Validation - Empty correct_answers', () => {
        test('Should show error for empty correct_answers array', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B", "C"],
                        correct_answers: [] // empty array not allowed
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'empty-correct-answers.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for empty correct_answers');
            
            const hasEmptyError = errors.some(e => e.message.includes('empty') || e.message.includes('at least one'));
            assert.ok(hasEmptyError, 'Should have error about empty correct_answers');
        });

        test('Should show error for null correct_answers', async () => {
            const invalidQuiz = {
                metadata: {
                    title: "Test Quiz",
                    description: "A test quiz",
                    version: "1.0",
                    author: "Test Author"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Test question",
                        options: ["A", "B", "C"],
                        correct_answers: null // null not allowed
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(invalidQuiz, null, 2), 'null-correct-answers.quiz');
            const diagnostics = await getDiagnostics(document);
            
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.ok(errors.length > 0, 'Should have errors for null correct_answers');
        });
    });

    suite('Quiz File Type Detection', () => {
        test('Should detect complex quiz with multiple questions', async () => {
            const complexQuiz = {
                metadata: {
                    title: "Complex Quiz",
                    description: "A quiz with multiple questions and various configurations",
                    version: "2.0",
                    author: "Quiz Master",
                    created_date: "2025-01-01T00:00:00Z",
                    tags: ["education", "test"]
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "Which are prime numbers?",
                        options: ["2", "4", "7", "9", "11"],
                        correct_answers: [0, 2, 4]
                    },
                    {
                        type: "multiple_choice",
                        text: "What is the capital of Spain?",
                        options: ["Barcelona", "Madrid", "Valencia"],
                        correct_answers: [1]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(complexQuiz, null, 2), 'complex.quiz');
            const diagnostics = await getDiagnostics(document);
            
            // Should have no errors for valid complex quiz
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.strictEqual(errors.length, 0, `Complex quiz should be valid, but found errors: ${errors.map(e => e.message).join(', ')}`);
        });

        test('Should validate sample.quiz structure correctly', async () => {
            const sampleQuiz = {
                metadata: {
                    title: "Sample Quiz",
                    description: "A multiple-choice quiz with multiple correct answers possible",
                    version: "1.0",
                    author: "Author Name"
                },
                questions: [
                    {
                        type: "multiple_choice",
                        text: "What is the capital of France?",
                        options: ["Madrid", "Paris", "Rome", "Berlin"],
                        correct_answers: [1]
                    },
                    {
                        type: "multiple_choice",
                        text: "Which of the following are programming languages?",
                        options: ["Python", "HTML", "C++", "CSS"],
                        correct_answers: [0, 2]
                    },
                    {
                        type: "multiple_choice",
                        text: "Which of these are planets in the solar system?",
                        options: ["Mars", "Jupiter", "Pluto", "Venus"],
                        correct_answers: [0, 1, 3]
                    }
                ]
            };

            const document = await createTestDocument(JSON.stringify(sampleQuiz, null, 2), 'sample-validation.quiz');
            const diagnostics = await getDiagnostics(document);
            
            // Should have no errors for valid sample quiz
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            assert.strictEqual(errors.length, 0, `Sample quiz should be valid, but found errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });
});
