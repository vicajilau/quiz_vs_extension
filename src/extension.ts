import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import Ajv from 'ajv';

interface QuizMetadata {
	title: string;
	description: string;
	version: number;
	author: string;
}

interface MultipleChoiceQuestion {
	type: 'multiple_choice';
	text: string;
	options: string[];
	correct_answers: number[];
}

interface QuizFile {
	metadata: QuizMetadata;
	questions: MultipleChoiceQuestion[];
}

export function activate(context: vscode.ExtensionContext) {
	console.log('QUIZ Validator extension is now active!');

	// Create diagnostic collection for quiz validation errors
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('quiz');
	context.subscriptions.push(diagnosticCollection);

	// Load JSON schema
	const schemaPath = path.join(context.extensionPath, 'schemas', 'quiz-schema.json');
	let schema: any;
	try {
		const schemaContent = fs.readFileSync(schemaPath, 'utf8');
		schema = JSON.parse(schemaContent);
	} catch (error) {
		console.error('Failed to load quiz schema:', error);
		vscode.window.showErrorMessage('Failed to load quiz validation schema');
		return;
	}

	const ajv = new Ajv({ allErrors: true });
	const validate = ajv.compile(schema);

	// Function to validate quiz file
	function validateQuizFile(document: vscode.TextDocument) {
		console.log('Validating document:', document.fileName, 'Language:', document.languageId);
		
		if (!document.fileName.endsWith('.quiz')) {
			console.log('Skipping validation - not a .quiz file');
			return;
		}

		const diagnostics: vscode.Diagnostic[] = [];
		
		try {
			const text = document.getText();
			const quiz: QuizFile = JSON.parse(text);
			
			// Validate against JSON schema
			const isValid = validate(quiz);
			if (!isValid && validate.errors) {
				for (const error of validate.errors) {
					const range = new vscode.Range(0, 0, 0, 0); // Default range
					const message = `${(error as any).instancePath || 'Root'}: ${error.message}`;
					const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
					diagnostic.source = 'quiz-validator';
					diagnostics.push(diagnostic);
				}
			}

			// Custom validation logic
			if (quiz.questions) {
				quiz.questions.forEach((question, index) => {
					if (question.type === 'multiple_choice') {
						// Validate correct_answers indices
						if (question.correct_answers) {
							for (const answerIndex of question.correct_answers) {
								if (answerIndex < 0 || answerIndex >= question.options.length) {
									const range = new vscode.Range(0, 0, 0, 0);
									const message = `Question ${index + 1}: correct_answers contains invalid index ${answerIndex}. Valid range: 0-${question.options.length - 1}`;
									const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
									diagnostic.source = 'quiz-validator';
									diagnostics.push(diagnostic);
								}
							}
						}

						// Validate minimum options
						if (question.options.length < 2) {
							const range = new vscode.Range(0, 0, 0, 0);
							const message = `Question ${index + 1}: multiple_choice questions must have at least 2 options`;
							const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
							diagnostic.source = 'quiz-validator';
							diagnostics.push(diagnostic);
						}
					}
				});
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

	// Register commands
	const validateCommand = vscode.commands.registerCommand('quiz.validate', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			validateQuizFile(editor.document);
			vscode.window.showInformationMessage('Quiz file validation completed');
		} else {
			vscode.window.showWarningMessage('No active editor found');
		}
	});

	const createSampleCommand = vscode.commands.registerCommand('quiz.createSample', async () => {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found');
			return;
		}

		const sampleQuiz: QuizFile = {
			metadata: {
				title: "Sample Quiz",
				description: "A sample quiz with multiple choice questions",
				version: 1.0,
				author: "Quiz Author"
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

	// Register event listeners
	const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(validateQuizFile);
	const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(event => {
		validateQuizFile(event.document);
	});
	const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument(validateQuizFile);

	// Validate all open quiz files
	vscode.workspace.textDocuments.forEach(validateQuizFile);

	// Add subscriptions
	context.subscriptions.push(
		validateCommand,
		createSampleCommand,
		onDidOpenTextDocument,
		onDidChangeTextDocument,
		onDidSaveTextDocument
	);
}

export function deactivate() {}
