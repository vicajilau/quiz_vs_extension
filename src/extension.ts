import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import Ajv from 'ajv';

interface QuizMetadata {
	title: string;
	description: string;
	version: string;
	author: string;
}

interface BaseQuestion {
	type: string;
	text: string;
	explanation?: string;
	points?: number;
}

interface MultipleChoiceQuestion extends BaseQuestion {
	type: 'multiple_choice';
	options: string[];
	correct_answers: number[];
}

interface SingleChoiceQuestion extends BaseQuestion {
	type: 'single_choice';
	options: string[];
	correct_answers: number[];
}

interface TrueFalseQuestion extends BaseQuestion {
	type: 'true_false';
	options: string[];
	correct_answers: number[];
}

type Question = MultipleChoiceQuestion | SingleChoiceQuestion | TrueFalseQuestion;

interface QuizFile {
	metadata: QuizMetadata;
	questions: Question[];
}

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
	// Force immediate configuration of file associations
	const forceFileAssociations = async () => {
		const config = vscode.workspace.getConfiguration();
		const currentAssociations = config.get<Record<string, string>>('files.associations', {});
		
		if (currentAssociations['*.quiz'] !== 'quiz') {
			try {
				// Set globally
				await config.update('files.associations', 
					{ ...currentAssociations, '*.quiz': 'quiz' }, 
					vscode.ConfigurationTarget.Global
				);
				
				// Set for workspace  
				await config.update('files.associations',
					{ ...currentAssociations, '*.quiz': 'quiz' },
					vscode.ConfigurationTarget.Workspace
				);
			} catch (error) {
				console.error('Failed to update file associations:', error);
			}
		}
	};

	// Execute immediately
	forceFileAssociations();

	// Force detection of all currently open .quiz files
	const forceDetectOpenQuizFiles = () => {
		vscode.workspace.textDocuments.forEach(document => {
			if (document.fileName.toLowerCase().endsWith('.quiz') && document.languageId !== 'quiz') {
				vscode.languages.setTextDocumentLanguage(document, 'quiz').then(
					() => {}, 
					(error: any) => {
						console.error(`Failed to set language for ${document.fileName}:`, error);
					}
				);
			}
		});
	};

	// Execute with delays to ensure VS Code is ready
	setTimeout(forceDetectOpenQuizFiles, 100);
	setTimeout(forceDetectOpenQuizFiles, 500);
	setTimeout(forceDetectOpenQuizFiles, 1000);

	// Create diagnostic collection
	diagnosticCollection = vscode.languages.createDiagnosticCollection('quiz');
	context.subscriptions.push(diagnosticCollection);

	// Register commands FIRST - before any potential early returns
	// Commands
	const validateCommand = vscode.commands.registerCommand('quiz-file-support.validateFile', () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (activeEditor && isQuizFile(activeEditor.document)) {
			validateQuizFile(activeEditor.document);
			vscode.window.showInformationMessage('Quiz file validation completed!');
		} else {
			vscode.window.showWarningMessage('Please open a .quiz file to validate.');
		}
	});

	const forceValidateCommand = vscode.commands.registerCommand('quiz-file-support.forceValidate', () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (activeEditor) {
			validateQuizFile(activeEditor.document);
			vscode.window.showInformationMessage('Force validation completed!');
		} else {
			vscode.window.showWarningMessage('No active editor found.');
		}
	});

	const createSampleCommand = vscode.commands.registerCommand('quiz-file-support.createSample', async () => {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found');
			return;
		}

		const sampleQuiz: QuizFile = {
			metadata: {
				title: "Sample Quiz",
				description: "A comprehensive quiz example with all question types",
				version: "1.0.0",
				author: "Quiz Author"
			},
			questions: [
				{
					type: "multiple_choice",
					text: "What is the capital of France?",
					options: ["Madrid", "Paris", "Rome", "Berlin"],
					correct_answers: [1],
					explanation: "Paris is the capital city of France."
				},
				{
					type: "multiple_choice",
					text: "Which of the following are programming languages?",
					options: ["Python", "HTML", "C++", "CSS"],
					correct_answers: [0, 2],
					explanation: "Python and C++ are programming languages, while HTML and CSS are markup/styling languages."
				},
				{
					type: "single_choice",
					text: "What is the most widely used programming language for web development?",
					options: ["Python", "JavaScript", "Java", "C++"],
					correct_answers: [1],
					explanation: "JavaScript is the most widely used programming language for web development."
				},
				{
					type: "true_false",
					text: "The Earth is flat.",
					options: ["True", "False"],
					correct_answers: [1],
					explanation: "The Earth is not flat; it is an oblate spheroid, roughly spherical in shape."
				},
				{
					type: "true_false",
					text: "Python is an interpreted programming language.",
					options: ["Verdadero", "Falso"],
					correct_answers: [0],
					explanation: "Python is indeed an interpreted programming language."
				}
			]
		};

		const filePath = path.join(workspaceFolder.uri.fsPath, 'sample.quiz');
		const content = JSON.stringify(sampleQuiz, null, 2);
		
		try {
			await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(content));
			const document = await vscode.workspace.openTextDocument(filePath);
			await vscode.window.showTextDocument(document);
			vscode.window.showInformationMessage('Sample quiz file created successfully!');
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to create sample quiz: ${error}`);
		}
	});

	const diagnoseCommand = vscode.commands.registerCommand('quiz-file-support.diagnoseDetection', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const document = editor.document;
			const info = `
File: ${document.fileName}
Language ID: ${document.languageId}
Extension: ${document.fileName.split('.').pop()}
Is Quiz File: ${document.fileName.endsWith('.quiz')}
File Size: ${document.getText().length} characters
			`.trim();
			vscode.window.showInformationMessage(info, { modal: true });
		} else {
			vscode.window.showWarningMessage('No active editor found');
		}
	});

	context.subscriptions.push(validateCommand, forceValidateCommand, createSampleCommand, diagnoseCommand);

	// Load JSON schema
	let schema: any;
	let validate: any;
	let schemaLoaded = false;
	
	// Try different possible paths for the schema
	const possibleSchemaPaths = [
		path.join(context.extensionPath, 'schemas', 'quiz-schema.json'),
		path.join(context.extensionPath, 'extension', 'schemas', 'quiz-schema.json'),
		path.join(__dirname, '..', 'schemas', 'quiz-schema.json'),
		path.join(__dirname, '..', '..', 'schemas', 'quiz-schema.json')
	];
	
	for (const schemaPath of possibleSchemaPaths) {
		if (fs.existsSync(schemaPath)) {
			try {
				const schemaContent = fs.readFileSync(schemaPath, 'utf8');
				schema = JSON.parse(schemaContent);
				const ajv = new Ajv({ allErrors: true, strict: false });
				validate = ajv.compile(schema);
				schemaLoaded = true;
				console.log(`Schema loaded successfully from: ${schemaPath}`);
				break;
			} catch (error) {
				console.error(`Failed to load schema from ${schemaPath}:`, error);
				continue;
			}
		}
	}
	
	if (!schemaLoaded) {
		console.error('Failed to load quiz schema from any location');
		console.error('Tried paths:', possibleSchemaPaths);
	}

	// Force language detection for .quiz files
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(document => {
			if (document.fileName.endsWith('.quiz') && document.languageId !== 'quiz') {
				vscode.languages.setTextDocumentLanguage(document, 'quiz');
			}
			if (isQuizFile(document)) {
				validateQuizFile(document);
			}
		})
	);

	// Also check active editor on activation
	if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName.endsWith('.quiz') && vscode.window.activeTextEditor.document.languageId !== 'quiz') {
		vscode.languages.setTextDocumentLanguage(vscode.window.activeTextEditor.document, 'quiz');
	}

	// Validate files when opened or changed
	if (vscode.window.activeTextEditor && isQuizFile(vscode.window.activeTextEditor.document)) {
		validateQuizFile(vscode.window.activeTextEditor.document);
	}

	// Listener for editor changes
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && isQuizFile(editor.document)) {
				validateQuizFile(editor.document);
			}
		})
	);

	// Listener for document changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => {
			if (isQuizFile(event.document)) {
				validateQuizFile(event.document);
			}
		})
	);

	// Function to validate quiz file
	function validateQuizFile(document: vscode.TextDocument) {
		if (!document.fileName.endsWith('.quiz')) {
			return;
		}

		const diagnostics: vscode.Diagnostic[] = [];
		
		try {
			const text = document.getText();
			const quiz: any = JSON.parse(text); // Use any to allow flexible validation
			
			// Basic structure validation
			if (!quiz.metadata) {
				const range = findPropertyRange(document, 'metadata') || new vscode.Range(0, 0, 0, 0);
				const diagnostic = new vscode.Diagnostic(range, 'Missing required property: metadata', vscode.DiagnosticSeverity.Error);
				diagnostic.source = 'quiz-validator';
				diagnostics.push(diagnostic);
			} else {
				// Validate metadata fields
				validateMetadata(quiz.metadata, document, diagnostics);
			}

			if (!quiz.questions) {
				const range = findPropertyRange(document, 'questions') || new vscode.Range(0, 0, 0, 0);
				const diagnostic = new vscode.Diagnostic(range, 'Missing required property: questions', vscode.DiagnosticSeverity.Error);
				diagnostic.source = 'quiz-validator';
				diagnostics.push(diagnostic);
			} else {
				// Validate questions array
				validateQuestions(quiz.questions, document, diagnostics);
			}
			
			// Validate against JSON schema if available
			if (validate) {
				const isValid = validate(quiz);
				
				if (!isValid && validate.errors) {
					for (const error of validate.errors) {
						const range = findErrorRange(document, error) || new vscode.Range(0, 0, 0, 0);
						const message = formatSchemaError(error);
						const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
						diagnostic.source = 'quiz-schema';
						diagnostics.push(diagnostic);
					}
				}
			}

		} catch (error) {
			// JSON parsing error
			const range = new vscode.Range(0, 0, 0, 0);
			const message = `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
			const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
			diagnostic.source = 'quiz-validator';
			diagnostics.push(diagnostic);
		}

		diagnosticCollection.set(document.uri, diagnostics);
	}

	// Helper function to validate metadata
	function validateMetadata(metadata: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
		const requiredFields = ['title', 'description', 'version', 'author'];
		
		for (const field of requiredFields) {
			if (!metadata[field]) {
				const range = findPropertyRange(document, `metadata.${field}`) || new vscode.Range(0, 0, 0, 0);
				const diagnostic = new vscode.Diagnostic(range, `Missing required property: metadata.${field}`, vscode.DiagnosticSeverity.Error);
				diagnostic.source = 'quiz-validator';
				diagnostics.push(diagnostic);
			} else {
				// Type validation - all fields must be strings
				if (typeof metadata[field] !== 'string') {
					const range = findPropertyRange(document, `metadata.${field}`) || new vscode.Range(0, 0, 0, 0);
					const diagnostic = new vscode.Diagnostic(range, `metadata.${field} must be a string`, vscode.DiagnosticSeverity.Error);
					diagnostic.source = 'quiz-validator';
					diagnostics.push(diagnostic);
				}
			}
		}
	}

	// Helper function to validate questions
	function validateQuestions(questions: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
		if (!Array.isArray(questions)) {
			const range = findPropertyRange(document, 'questions') || new vscode.Range(0, 0, 0, 0);
			const diagnostic = new vscode.Diagnostic(range, 'questions must be an array', vscode.DiagnosticSeverity.Error);
			diagnostic.source = 'quiz-validator';
			diagnostics.push(diagnostic);
			return;
		}

		questions.forEach((question: any, index: number) => {
			// Validate question type
			if (!question.type) {
				const range = new vscode.Range(0, 0, 0, 0);
				const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: Missing required property: type`, vscode.DiagnosticSeverity.Error);
				diagnostic.source = 'quiz-validator';
				diagnostics.push(diagnostic);
			} else if (!['multiple_choice', 'single_choice', 'true_false'].includes(question.type)) {
				const range = new vscode.Range(0, 0, 0, 0);
				const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: Invalid question type '${question.type}'. Supported types: multiple_choice, single_choice, true_false`, vscode.DiagnosticSeverity.Error);
				diagnostic.source = 'quiz-validator';
				diagnostics.push(diagnostic);
			}

			// Validate question text
			if (!question.text) {
				const range = new vscode.Range(0, 0, 0, 0);
				const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: Missing required property: text`, vscode.DiagnosticSeverity.Error);
				diagnostic.source = 'quiz-validator';
				diagnostics.push(diagnostic);
			} else if (typeof question.text !== 'string') {
				const range = new vscode.Range(0, 0, 0, 0);
				const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: text must be a string`, vscode.DiagnosticSeverity.Error);
				diagnostic.source = 'quiz-validator';
				diagnostics.push(diagnostic);
			}

			// Validate type-specific fields
			if (['multiple_choice', 'single_choice', 'true_false'].includes(question.type)) {
				// Validate options (required for all question types)
				if (!question.options) {
					const range = new vscode.Range(0, 0, 0, 0);
					const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: Missing required property: options`, vscode.DiagnosticSeverity.Error);
					diagnostic.source = 'quiz-validator';
					diagnostics.push(diagnostic);
				} else if (!Array.isArray(question.options)) {
					const range = new vscode.Range(0, 0, 0, 0);
					const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: options must be an array`, vscode.DiagnosticSeverity.Error);
					diagnostic.source = 'quiz-validator';
					diagnostics.push(diagnostic);
				} else {
					// Type-specific validation for options
					if (question.type === 'true_false') {
						if (question.options.length !== 2) {
							const range = new vscode.Range(0, 0, 0, 0);
							const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: true_false questions must have exactly 2 options`, vscode.DiagnosticSeverity.Error);
							diagnostic.source = 'quiz-validator';
							diagnostics.push(diagnostic);
						}
					} else if (question.options.length < 2) {
						const range = new vscode.Range(0, 0, 0, 0);
						const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: ${question.type} questions must have at least 2 options`, vscode.DiagnosticSeverity.Warning);
						diagnostic.source = 'quiz-validator';
						diagnostics.push(diagnostic);
					}
				}

				// Validate correct_answers (required for all question types)
				if (!question.correct_answers) {
					const range = new vscode.Range(0, 0, 0, 0);
					const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: Missing required property: correct_answers`, vscode.DiagnosticSeverity.Error);
					diagnostic.source = 'quiz-validator';
					diagnostics.push(diagnostic);
				} else if (question.correct_answers === null) {
					const range = new vscode.Range(0, 0, 0, 0);
					const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: correct_answers cannot be null`, vscode.DiagnosticSeverity.Error);
					diagnostic.source = 'quiz-validator';
					diagnostics.push(diagnostic);
				} else if (!Array.isArray(question.correct_answers)) {
					const range = new vscode.Range(0, 0, 0, 0);
					const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: correct_answers must be an array`, vscode.DiagnosticSeverity.Error);
					diagnostic.source = 'quiz-validator';
					diagnostics.push(diagnostic);
				} else if (question.correct_answers.length === 0) {
					const range = new vscode.Range(0, 0, 0, 0);
					const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: correct_answers cannot be empty`, vscode.DiagnosticSeverity.Error);
					diagnostic.source = 'quiz-validator';
					diagnostics.push(diagnostic);
				} else {
					// Type-specific validation for correct_answers
					if (question.type === 'single_choice' || question.type === 'true_false') {
						if (question.correct_answers.length !== 1) {
							const range = new vscode.Range(0, 0, 0, 0);
							const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: ${question.type} questions must have exactly one correct answer`, vscode.DiagnosticSeverity.Error);
							diagnostic.source = 'quiz-validator';
							diagnostics.push(diagnostic);
						}
					}

					// Validate correct_answers indices for all types
					if (question.options && Array.isArray(question.options)) {
						for (const answerIndex of question.correct_answers) {
							if (typeof answerIndex !== 'number' || answerIndex < 0 || answerIndex >= question.options.length) {
								const range = new vscode.Range(0, 0, 0, 0);
								const message = `Question ${index + 1}: correct_answers contains invalid index ${answerIndex}. Valid range: 0-${question.options.length - 1}`;
								const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
								diagnostic.source = 'quiz-validator';
								diagnostics.push(diagnostic);
							}
						}

						// Additional validation for true_false questions
						if (question.type === 'true_false' && question.correct_answers.length === 1) {
							const answerIndex = question.correct_answers[0];
							if (answerIndex !== 0 && answerIndex !== 1) {
								const range = new vscode.Range(0, 0, 0, 0);
								const diagnostic = new vscode.Diagnostic(range, `Question ${index + 1}: true_false questions must have correct_answers index 0 or 1`, vscode.DiagnosticSeverity.Error);
								diagnostic.source = 'quiz-validator';
								diagnostics.push(diagnostic);
							}
						}
					}
				}
			}
		});
	}

	// Helper function to find property range in document
	function findPropertyRange(document: vscode.TextDocument, property: string): vscode.Range | null {
		const text = document.getText();
		const pattern = new RegExp(`"${property.replace('.', '"[\\s\\S]*?"')}"`, 'g');
		const match = pattern.exec(text);
		if (match) {
			const pos = document.positionAt(match.index);
			return new vscode.Range(pos, pos);
		}
		return null;
	}

	// Helper function to find error range for schema errors
	function findErrorRange(document: vscode.TextDocument, error: any): vscode.Range | null {
		// For now, return a default range. Could be improved to find exact locations
		return new vscode.Range(0, 0, 0, 0);
	}

	// Helper function to format schema error messages
	function formatSchemaError(error: any): string {
		const path = error.instancePath || 'Root';
		return `${path}: ${error.message}`;
	}
}

function isQuizFile(document: vscode.TextDocument): boolean {
	return document.fileName.endsWith('.quiz');
}

export function deactivate() {
	if (diagnosticCollection) {
		diagnosticCollection.dispose();
	}
}
