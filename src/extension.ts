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
	console.log('QUIZ File Support extension is now active!');
	vscode.window.showInformationMessage('QUIZ File Support extension activated!');

	// Force immediate configuration of file associations
	const forceFileAssociations = async () => {
		const config = vscode.workspace.getConfiguration();
		const currentAssociations = config.get<Record<string, string>>('files.associations', {});
		
		if (currentAssociations['*.quiz'] !== 'quiz') {
			console.log('Forcing QUIZ file associations...');
			
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
				
				console.log('File associations updated successfully');
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
				console.log(`Force-setting language for: ${document.fileName} (current: ${document.languageId})`);
				vscode.languages.setTextDocumentLanguage(document, 'quiz').then(() => {
					console.log(`Successfully set language for: ${document.fileName}`);
				}, (error: any) => {
					console.error(`Failed to set language for ${document.fileName}:`, error);
				});
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
	console.log('=== REGISTERING COMMANDS ===');
	
	// Commands
	const validateCommand = vscode.commands.registerCommand('quiz-file-support.validateFile', () => {
		const activeEditor = vscode.window.activeTextEditor;
		console.log('=== Manual Validation Command ===');
		console.log('Active editor:', !!activeEditor);
		if (activeEditor) {
			console.log('File name:', activeEditor.document.fileName);
			console.log('Language ID:', activeEditor.document.languageId);
			console.log('Is quiz file:', isQuizFile(activeEditor.document));
		}
		
		if (activeEditor && isQuizFile(activeEditor.document)) {
			console.log('Starting manual validation...');
			// Only validate if schema is loaded
			validateQuizFile(activeEditor.document);
			vscode.window.showInformationMessage('Quiz file validation completed!');
		} else {
			vscode.window.showWarningMessage('Please open a .quiz file to validate.');
		}
	});

	const forceValidateCommand = vscode.commands.registerCommand('quiz-file-support.forceValidate', () => {
		const activeEditor = vscode.window.activeTextEditor;
		console.log('=== Force Validation Command ===');
		if (activeEditor) {
			console.log('Force validating:', activeEditor.document.fileName);
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

	console.log('=== ADDING COMMANDS TO CONTEXT SUBSCRIPTIONS ===');
	context.subscriptions.push(validateCommand, forceValidateCommand, createSampleCommand, diagnoseCommand);
	console.log('=== COMMANDS REGISTERED SUCCESSFULLY ===');

	// Load JSON schema
	const schemaPath = path.join(context.extensionPath, 'schemas', 'quiz-schema.json');
	let schema: any;
	let validate: any;
	try {
		const schemaContent = fs.readFileSync(schemaPath, 'utf8');
		schema = JSON.parse(schemaContent);
		const ajv = new Ajv({ allErrors: true });
		validate = ajv.compile(schema);
		console.log('Schema loaded successfully');
	} catch (error) {
		console.error('Failed to load quiz schema:', error);
		vscode.window.showErrorMessage('Failed to load quiz validation schema - validation disabled');
		// Don't return - continue without validation
	}

	// Force language detection for .quiz files
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(document => {
			console.log('=== Document opened ===');
			console.log('File:', document.fileName);
			console.log('Language:', document.languageId);
			console.log('Ends with .quiz:', document.fileName.endsWith('.quiz'));
			
			if (document.fileName.endsWith('.quiz') && document.languageId !== 'quiz') {
				console.log('Setting language to quiz...');
				vscode.languages.setTextDocumentLanguage(document, 'quiz');
			}
			if (isQuizFile(document)) {
				console.log('Starting validation for opened document...');
				validateQuizFile(document);
			}
		})
	);

	// Also check active editor on activation
	if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName.endsWith('.quiz') && vscode.window.activeTextEditor.document.languageId !== 'quiz') {
		console.log('Setting language for active editor...');
		vscode.languages.setTextDocumentLanguage(vscode.window.activeTextEditor.document, 'quiz');
	}

	// Validate files when opened or changed
	if (vscode.window.activeTextEditor && isQuizFile(vscode.window.activeTextEditor.document)) {
		console.log('Validating active editor on activation...');
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
		console.log('=== STARTING VALIDATION ===');
		console.log('Validating document:', document.fileName, 'Language:', document.languageId);
		
		if (!document.fileName.endsWith('.quiz')) {
			console.log('Skipping validation - not a .quiz file');
			return;
		}

		console.log('Starting validation for:', document.fileName);
		const diagnostics: vscode.Diagnostic[] = [];
		
		try {
			const text = document.getText();
			console.log('File content length:', text.length);
			console.log('File content preview:', text.substring(0, 100) + '...');
			
			const quiz: QuizFile = JSON.parse(text);
			console.log('JSON parsed successfully');
			console.log('Quiz object:', JSON.stringify(quiz, null, 2));
			
			// Validate against JSON schema only if validate function is available
			if (validate) {
				console.log('Starting schema validation...');
				const isValid = validate(quiz);
				console.log('Schema validation result:', isValid);
				console.log('Validation errors:', validate.errors);
				
				if (!isValid && validate.errors) {
					console.log('Found', validate.errors.length, 'schema errors');
					for (const error of validate.errors) {
						const range = new vscode.Range(0, 0, 0, 0); // Default range
						const message = `${(error as any).instancePath || 'Root'}: ${error.message}`;
						console.log('Adding diagnostic:', message);
						const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
						diagnostic.source = 'quiz-validator';
						diagnostics.push(diagnostic);
					}
				}
			} else {
				console.log('Schema validation skipped - validate function not available');
			}

			// Custom validation logic
			console.log('Starting custom validation...');
			if (quiz.questions) {
				console.log('Found', quiz.questions.length, 'questions');
				quiz.questions.forEach((question, index) => {
					console.log(`Validating question ${index + 1}:`, question);
					if (question.type === 'multiple_choice') {
						// Validate correct_answers indices
						if (question.correct_answers) {
							console.log('Checking correct_answers:', question.correct_answers);
							for (const answerIndex of question.correct_answers) {
								if (answerIndex < 0 || answerIndex >= question.options.length) {
									const range = new vscode.Range(0, 0, 0, 0);
									const message = `Question ${index + 1}: correct_answers contains invalid index ${answerIndex}. Valid range: 0-${question.options.length - 1}`;
									console.log('Adding custom diagnostic:', message);
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
							console.log('Adding warning diagnostic:', message);
							const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
							diagnostic.source = 'quiz-validator';
							diagnostics.push(diagnostic);
						}
					}
				});
			} else {
				console.log('No questions found in quiz object');
			}

		} catch (error) {
			// JSON parsing error
			console.log('JSON parsing error:', error);
			const range = new vscode.Range(0, 0, 0, 0);
			const message = `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
			const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
			diagnostic.source = 'quiz-validator';
			diagnostics.push(diagnostic);
		}

		console.log('Total diagnostics found:', diagnostics.length);
		console.log('Setting diagnostics:', diagnostics.length, 'errors found');
		diagnosticCollection.set(document.uri, diagnostics);
		console.log('=== VALIDATION COMPLETE ===');
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
