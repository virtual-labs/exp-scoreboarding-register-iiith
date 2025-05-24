// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the register renaming scoreboard
    const scoreboard = new RenamingScoreboard();
    const validator = new RenamingScoreboardValidator(scoreboard);
    const feedbackGenerator = new RenamingFeedbackGenerator(scoreboard, validator);
    
    // Get DOM elements
    const currentCycleElement = document.getElementById('current-cycle');
    const startButton = document.getElementById('start-btn');
    const restartButton = document.getElementById('restart-btn');
    const stopButton = document.getElementById('stop-btn');
    const resetButton = document.getElementById('reset-btn');
    const hintButton = document.getElementById('hint-btn');
    const nextCycleButton = document.getElementById('next-cycle-btn');
    const feedbackArea = document.getElementById('feedback-area');
    const modeIndicator = document.getElementById('mode-indicator');
    const editModePanel = document.getElementById('edit-mode-panel');
    const simulationModePanel = document.getElementById('simulation-mode-panel');
    
    // Initialize components
    let instructionBuilder, instructionList, instructionStatus, functionalUnitStatus, renameTable, physicalRegisterStatus;
    
    function initializeComponents() {
        instructionBuilder = new InstructionBuilder(
            'instruction-builder',
            scoreboard,
            onInstructionAdded
        );
        
        instructionList = new InstructionList(
            'instruction-list',
            scoreboard,
            onInstructionRemoved,
            onInstructionsReordered
        );
        
        instructionStatus = new InstructionStatus(
            'instruction-status',
            scoreboard,
            validator,
            feedbackGenerator,
            onInstructionCellClick
        );
        
        functionalUnitStatus = new FunctionalUnitStatus(
            'functional-unit-status',
            scoreboard
        );
        
        // New components for register renaming
        renameTable = new RenameTable(
            'rename-table',
            scoreboard
        );
        
        physicalRegisterStatus = new PhysicalRegisterStatus(
            'physical-register-status',
            scoreboard
        );
    }
    
    // Update the UI
    function updateUI() {
        // Update mode indicator
        modeIndicator.textContent = scoreboard.simulationStarted ? 'Simulation Mode' : 'Edit Mode';
        
        // Show/hide appropriate panels
        editModePanel.classList.toggle('hidden', scoreboard.simulationStarted);
        simulationModePanel.classList.toggle('hidden', !scoreboard.simulationStarted);
        
        // Show/hide buttons
        startButton.classList.toggle('hidden', scoreboard.simulationStarted);
        restartButton.classList.toggle('hidden', !scoreboard.simulationStarted);
        stopButton.classList.toggle('hidden', !scoreboard.simulationStarted);
        
        // Update cycle counter
        currentCycleElement.textContent = scoreboard.currentCycle;
        
        // Update component views
        if (scoreboard.simulationStarted) {
            instructionStatus.render();
            functionalUnitStatus.render();
            renameTable.render();
            physicalRegisterStatus.render();
        } else {
            instructionList.render();
        }
        
        // Update next cycle button state
        const cycleValidation = validator.canAdvanceCycle();
        nextCycleButton.disabled = !cycleValidation.valid;
        nextCycleButton.classList.toggle('opacity-50', !cycleValidation.valid);
    }
    
    // Show feedback
    function showFeedback(message, type = 'info') {
        feedbackArea.innerHTML = `
            <div class="feedback feedback-${type}">
                ${message}
            </div>
        `;
        feedbackArea.classList.remove('hidden');
    } 

    // Handle instruction cell click
    function onInstructionCellClick(instructionIndex, stage) {
        const instruction = scoreboard.instructions[instructionIndex];
        
        // First check if the cell already has a value
        if (instruction.status[stage] !== null) {
            showFeedback(`This operation was already completed in cycle ${instruction.status[stage]}.`, 'info');
            return;
        }
        
        // Always get the validation result directly first for detailed feedback
        let validationResult;
        switch (stage) {
            case INSTRUCTION_STAGES.ISSUE:
                validationResult = validator.canIssue(instructionIndex);
                break;
            case INSTRUCTION_STAGES.READ_OPERANDS:
                validationResult = validator.canReadOperands(instructionIndex);
                break;
            case INSTRUCTION_STAGES.EXECUTION_COMPLETE:
                validationResult = validator.canCompleteExecution(instructionIndex);
                break;
            case INSTRUCTION_STAGES.WRITE_RESULT:
                validationResult = validator.canWriteResult(instructionIndex);
                break;
        }

        console.log(validationResult);
        
        // If validation fails, show the specific error message
        if (!validationResult.valid) {
            showFeedback(validationResult.message, 'error');
            return;
        }
        
        // Check if this action is in the pending actions list
        const actionKey = getActionKey(instructionIndex, stage);
        if (!scoreboard.pendingActions.has(actionKey)) {
            showFeedback(`This action cannot be performed in the current cycle ${scoreboard.currentCycle}.`, 'error');
            return;
        }
        
        // Perform the action
        let actionSuccessful = false;
        
        switch (stage) {
            case INSTRUCTION_STAGES.ISSUE:
                actionSuccessful = scoreboard.issueInstruction(instructionIndex);
                break;
            case INSTRUCTION_STAGES.READ_OPERANDS:
                actionSuccessful = scoreboard.readOperands(instructionIndex);
                break;
            case INSTRUCTION_STAGES.EXECUTION_COMPLETE:
                actionSuccessful = scoreboard.completeExecution(instructionIndex);
                break;
            case INSTRUCTION_STAGES.WRITE_RESULT:
                actionSuccessful = scoreboard.writeResult(instructionIndex);
                break;
        }
        
        // Show appropriate feedback
        if (actionSuccessful) {
            const feedback = feedbackGenerator.generateActionFeedback(instructionIndex, stage);
            showFeedback(feedback.message, 'success');
            updateUI();
        } else {
            showFeedback("Action failed for an unknown reason.", 'error');
        }
    }

    // Helper function to get the action key
    function getActionKey(instructionIndex, stage) {
        switch (stage) {
            case INSTRUCTION_STAGES.ISSUE:
                return `issue-${instructionIndex}`;
            case INSTRUCTION_STAGES.READ_OPERANDS:
                return `read-${instructionIndex}`;
            case INSTRUCTION_STAGES.EXECUTION_COMPLETE:
                return `exec-${instructionIndex}`;
            case INSTRUCTION_STAGES.WRITE_RESULT:
                return `write-${instructionIndex}`;
            default:
                return '';
        }
    }

    // Handle new instruction added
    function onInstructionAdded(instructionIndex) {
        instructionList.render();
        showFeedback(`Added new instruction: ${scoreboard.instructions[instructionIndex].type}`, 'success');
    }
    
    // Handle instruction removed
    function onInstructionRemoved(index) {
        scoreboard.removeInstruction(index);
        instructionList.render();
        showFeedback("Instruction removed.", 'success');
    }
    
    // Handle instructions reordered
    function onInstructionsReordered(fromIndex, toIndex) {
        scoreboard.reorderInstructions(fromIndex, toIndex);
        instructionList.render();
        showFeedback("Instructions reordered.", 'success');
    }
    
    // Event listeners
    startButton.addEventListener('click', () => {
        if (scoreboard.instructions.length === 0) {
            showFeedback("Please add at least one instruction before starting the simulation.", 'error');
            return;
        }
        
        scoreboard.startSimulation();
        updateUI();
        showFeedback("Simulation started. Register renaming will eliminate WAR and WAW hazards!", 'success');
    });
    
    restartButton.addEventListener('click', () => {
        scoreboard.restartSimulation();
        updateUI();
        showFeedback("Simulation restarted with the same instructions. All pipeline state has been reset!", 'success');
    });
    
    stopButton.addEventListener('click', () => {
        scoreboard.stopSimulation();
        updateUI();
        showFeedback("Simulation stopped. You can now edit instructions.", 'success');
    });
    
    resetButton.addEventListener('click', () => {
        scoreboard.reset();
        updateUI();
        showFeedback("Simulation reset. Add instructions to get started with register renaming.", 'info');
    });
    
    hintButton.addEventListener('click', () => {
        const hint = feedbackGenerator.generateHint();
        showFeedback(hint.message, hint.type);
    });
    
    nextCycleButton.addEventListener('click', () => {
        const result = scoreboard.advanceCycle();
        if (result.success) {
            updateUI();
            showFeedback(result.message, 'success');
        } else {
            showFeedback(result.message, 'error');
        }
    });
    
    // Initialize and render
    initializeComponents();
    updateUI();
    showFeedback("Welcome to the Register Renaming Pipeline Simulator. Add instructions and then click 'Start Simulation' to begin exploring how register renaming eliminates WAR and WAW hazards!", 'info');
});