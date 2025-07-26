import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('MASO Extension Test Suite', () => {
    vscode.window.showInformationMessage('Starting MASO extension tests.');

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
        await new Promise(resolve => setTimeout(resolve, 500));
        return vscode.languages.getDiagnostics(document.uri);
    }

    test('Valid regular mode file should have no errors', async () => {
        const validContent = `{
  "metadata": {
    "name": "Test Process",
    "version": "1.0.0",
    "description": "A test MASO file for regular mode"
  },
  "processes": {
    "mode": "regular",
    "elements": [
      { "id": "A", "arrival_time": 0, "service_time": 3, "enabled": true },
      { "id": "B", "arrival_time": 1, "service_time": 2, "enabled": true }
    ]
  }
}`;
        
        const document = await createTestDocument(validContent, 'valid-regular.maso');
        const diagnostics = await getDiagnostics(document);
        
        assert.strictEqual(diagnostics.length, 0, 'Valid regular mode file should have no diagnostics');
    });

    test('Invalid enabled type should show error', async () => {
        const invalidContent = `{
  "metadata": {
    "name": "Test Process",
    "version": "1.0.0",
    "description": "A test MASO file for regular mode"
  },
  "processes": {
    "mode": "regular",
    "elements": [
      { "id": "A", "arrival_time": 0, "service_time": 3, "enabled": "true" }
    ]
  }
}`;
        
        const document = await createTestDocument(invalidContent, 'invalid-enabled.maso');
        const diagnostics = await getDiagnostics(document);
        
        assert.ok(diagnostics.length > 0, 'Should have diagnostics for invalid enabled type');
        const enabledError = diagnostics.find(d => d.message.includes('enabled must be a boolean'));
        assert.ok(enabledError, 'Should have specific error for enabled type');
    });

    test('Invalid arrival_time type should show error', async () => {
        const invalidContent = `{
  "metadata": {
    "name": "Test Process",
    "version": "1.0.0",
    "description": "A test MASO file for regular mode"
  },
  "processes": {
    "mode": "regular",
    "elements": [
      { "id": "A", "arrival_time": "0", "service_time": 3, "enabled": true }
    ]
  }
}`;
        
        const document = await createTestDocument(invalidContent, 'invalid-arrival-time.maso');
        const diagnostics = await getDiagnostics(document);
        
        assert.ok(diagnostics.length > 0, 'Should have diagnostics for invalid arrival_time type');
        const arrivalTimeError = diagnostics.find(d => d.message.includes('arrival_time must be an integer'));
        assert.ok(arrivalTimeError, 'Should have specific error for arrival_time type');
    });

    test('Invalid service_time type should show error', async () => {
        const invalidContent = `{
  "metadata": {
    "name": "Test Process",
    "version": "1.0.0",
    "description": "A test MASO file for regular mode"
  },
  "processes": {
    "mode": "regular",
    "elements": [
      { "id": "A", "arrival_time": 0, "service_time": 3.5, "enabled": true }
    ]
  }
}`;
        
        const document = await createTestDocument(invalidContent, 'invalid-service-time.maso');
        const diagnostics = await getDiagnostics(document);
        
        assert.ok(diagnostics.length > 0, 'Should have diagnostics for invalid service_time type');
        const serviceTimeError = diagnostics.find(d => d.message.includes('service_time must be an integer'));
        assert.ok(serviceTimeError, 'Should have specific error for service_time type');
    });

    test('Invalid id type should show error', async () => {
        const invalidContent = `{
  "metadata": {
    "name": "Test Process",
    "version": "1.0.0",
    "description": "A test MASO file for regular mode"
  },
  "processes": {
    "mode": "regular",
    "elements": [
      { "id": 123, "arrival_time": 0, "service_time": 3, "enabled": true }
    ]
  }
}`;
        
        const document = await createTestDocument(invalidContent, 'invalid-id.maso');
        const diagnostics = await getDiagnostics(document);
        
        assert.ok(diagnostics.length > 0, 'Should have diagnostics for invalid id type');
        const idError = diagnostics.find(d => d.message.includes('id must be a string'));
        assert.ok(idError, 'Should have specific error for id type');
    });

    test('Negative values should show error', async () => {
        const invalidContent = `{
  "metadata": {
    "name": "Test Process",
    "version": "1.0.0",
    "description": "A test MASO file for regular mode"
  },
  "processes": {
    "mode": "regular",
    "elements": [
      { "id": "A", "arrival_time": -1, "service_time": -2, "enabled": true }
    ]
  }
}`;
        
        const document = await createTestDocument(invalidContent, 'negative-values.maso');
        const diagnostics = await getDiagnostics(document);
        
        assert.ok(diagnostics.length > 0, 'Should have diagnostics for negative values');
        const arrivalTimeError = diagnostics.find(d => d.message.includes('arrival_time must be non-negative'));
        const serviceTimeError = diagnostics.find(d => d.message.includes('service_time must be non-negative'));
        assert.ok(arrivalTimeError, 'Should have error for negative arrival_time');
        assert.ok(serviceTimeError, 'Should have error for negative service_time');
    });

    test('Duplicate IDs should show error', async () => {
        const invalidContent = `{
  "metadata": {
    "name": "Test Process",
    "version": "1.0.0",
    "description": "A test MASO file for regular mode"
  },
  "processes": {
    "mode": "regular",
    "elements": [
      { "id": "A", "arrival_time": 0, "service_time": 3, "enabled": true },
      { "id": "A", "arrival_time": 1, "service_time": 2, "enabled": true }
    ]
  }
}`;
        
        const document = await createTestDocument(invalidContent, 'duplicate-ids.maso');
        const diagnostics = await getDiagnostics(document);
        
        assert.ok(diagnostics.length > 0, 'Should have diagnostics for duplicate IDs');
        const duplicateError = diagnostics.find(d => d.message.includes('Duplicate process ID'));
        assert.ok(duplicateError, 'Should have error for duplicate IDs');
    });

    test('Valid burst mode file should have no errors', async () => {
        const validBurstContent = `{
  "metadata": {
    "name": "Burst Mode Exercise",
    "version": "1.0.0",
    "description": "Processes with threads and bursts"
  },
  "processes": {
    "mode": "burst",
    "elements": [
      {
        "id": "P1",
        "arrival_time": 0,
        "enabled": true,
        "threads": [
          {
            "id": "T0",
            "enabled": true,
            "bursts": [
              {
                "type": "cpu",
                "duration": 3
              },
              {
                "type": "io",
                "duration": 2
              }
            ]
          }
        ]
      }
    ]
  }
}`;
        
        const document = await createTestDocument(validBurstContent, 'valid-burst.maso');
        const diagnostics = await getDiagnostics(document);
        
        assert.strictEqual(diagnostics.length, 0, 'Valid burst mode file should have no diagnostics');
    });

    test('Invalid burst type should show error', async () => {
        const invalidBurstContent = `{
  "metadata": {
    "name": "Burst Mode Exercise",
    "version": "1.0.0",
    "description": "Processes with threads and bursts"
  },
  "processes": {
    "mode": "burst",
    "elements": [
      {
        "id": "P1",
        "arrival_time": 0,
        "enabled": true,
        "threads": [
          {
            "id": "T0",
            "enabled": true,
            "bursts": [
              {
                "type": "invalid",
                "duration": 3
              }
            ]
          }
        ]
      }
    ]
  }
}`;
        
        const document = await createTestDocument(invalidBurstContent, 'invalid-burst-type.maso');
        const diagnostics = await getDiagnostics(document);
        
        assert.ok(diagnostics.length > 0, 'Should have diagnostics for invalid burst type');
        const burstTypeError = diagnostics.find(d => d.message.includes('Invalid burst type'));
        assert.ok(burstTypeError, 'Should have error for invalid burst type');
    });

    test('Missing required fields should show errors', async () => {
        const incompleteContent = `{
  "metadata": {
    "name": "Test Process"
  },
  "processes": {
    "mode": "regular",
    "elements": [
      { "id": "A", "arrival_time": 0 }
    ]
  }
}`;
        
        const document = await createTestDocument(incompleteContent, 'incomplete.maso');
        const diagnostics = await getDiagnostics(document);
        
        assert.ok(diagnostics.length > 0, 'Should have diagnostics for missing fields');
        
        const missingVersion = diagnostics.find(d => d.message.includes('Missing required field: metadata.version'));
        const missingDescription = diagnostics.find(d => d.message.includes('Missing required field: metadata.description'));
        const missingServiceTime = diagnostics.find(d => d.message.includes('Missing required field: elements[0].service_time'));
        const missingEnabled = diagnostics.find(d => d.message.includes('Missing required field: elements[0].enabled'));
        
        assert.ok(missingVersion, 'Should have error for missing version');
        assert.ok(missingDescription, 'Should have error for missing description');
        assert.ok(missingServiceTime, 'Should have error for missing service_time');
        assert.ok(missingEnabled, 'Should have error for missing enabled');
    });
});
