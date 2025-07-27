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
				const ajv = new Ajv({ allErrors: true });
				validate = ajv.compile(schema);
				schemaLoaded = true;
				break;
			} catch (error) {
				continue;
			}
		}
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
			const quiz: QuizFile = JSON.parse(text);
			
			// Validate against JSON schema only if validate function is available
			if (validate) {
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
}

function isQuizFile(document: vscode.TextDocument): boolean {
	return document.fileName.endsWith('.quiz');
}

export function deactivate() {
	if (diagnosticCollection) {
		diagnosticCollection.dispose();
	}
}
