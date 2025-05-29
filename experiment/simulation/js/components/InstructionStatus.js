// js/components/InstructionStatus.js

class InstructionStatus {
    constructor(containerId, scoreboard, validator, feedbackGenerator, onCellClick) {
        this.container = document.getElementById(containerId);
        this.scoreboard = scoreboard;
        this.validator = validator;
        this.feedbackGenerator = feedbackGenerator;
        this.onCellClick = onCellClick;
        this.render();
    }

    render() {
        if (this.scoreboard.instructions.length === 0) {
            this.container.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    No instructions added yet. Use the form above to add instructions.
                </div>
            `;
            return;
        }

        let tableHTML = `
            <table class="w-full">
                <thead>
                    <tr>
                        <th>Instruction</th>
                        <th>Physical Registers</th>
                        <th>${INSTRUCTION_STAGES.ISSUE}</th>
                        <th>${INSTRUCTION_STAGES.READ_OPERANDS}</th>
                        <th>${INSTRUCTION_STAGES.EXECUTION_COMPLETE}</th>
                        <th>${INSTRUCTION_STAGES.WRITE_RESULT}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.scoreboard.instructions.forEach((instruction, index) => {
            tableHTML += `
                <tr>
                    <td>${this.formatInstruction(instruction)}</td>
                    <td>${this.formatPhysicalRegisters(instruction)}</td>
                    ${this.renderStageCell(index, INSTRUCTION_STAGES.ISSUE)}
                    ${this.renderStageCell(index, INSTRUCTION_STAGES.READ_OPERANDS)}
                    ${this.renderStageCell(index, INSTRUCTION_STAGES.EXECUTION_COMPLETE)}
                    ${this.renderStageCell(index, INSTRUCTION_STAGES.WRITE_RESULT)}
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        this.container.innerHTML = tableHTML;
        this.setupCellEventListeners();
    }

    renderStageCell(instructionIndex, stage) {
        const instruction = this.scoreboard.instructions[instructionIndex];
        const cycleValue = instruction.status[stage];
        
        // Check if this cell already has a value (completed)
        if (cycleValue !== null) {
            return `
                <td class="text-center bg-green-100" data-instruction="${instructionIndex}" data-stage="${stage}">
                    ${cycleValue}
                </td>
            `;
        }
        
        // Check if this cell is part of pending actions (clickable)
        const actionKey = this.getActionKey(instructionIndex, stage);
        const isPending = this.scoreboard.pendingActions.has(actionKey);
        
        if (isPending) {
            return `
                <td class="text-center interactive-cell hover:bg-blue-100 cursor-pointer" 
                    data-instruction="${instructionIndex}" 
                    data-stage="${stage}">
                </td>
            `;
        }
        
        // For issue stage, check if blocked by in-order constraint or structural hazard
        let isBlocked = false;
        let blockReason = '';
        
        if (stage === INSTRUCTION_STAGES.ISSUE) {
            for (let i = 0; i < instructionIndex; i++) {
                if (this.scoreboard.instructions[i].status[INSTRUCTION_STAGES.ISSUE] === null) {
                    isBlocked = true;
                    blockReason = `Waiting for instruction ${i+1} to issue first`;
                    break;
                }
            }
            
            // Check if instruction issue is blocked by a structural hazard
            if (!isBlocked) {
                const availableFU = this.scoreboard.getAvailableFunctionalUnit(instruction.type);
                if (!availableFU) {
                    isBlocked = true;
                    blockReason = `No available functional unit (Structural hazard)`;
                }
            }
            
            // Check if we already issued another instruction this cycle
            if (!isBlocked) {
                const issuedThisCycle = this.scoreboard.instructions.some(instr => 
                    instr.status[INSTRUCTION_STAGES.ISSUE] === this.scoreboard.currentCycle
                );
                if (issuedThisCycle) {
                    isBlocked = true;
                    blockReason = `Cannot issue multiple instructions in cycle ${this.scoreboard.currentCycle}`;
                }
            }
        }
        
        if (isBlocked) {
            return `
                <td class="text-center bg-gray-100 cursor-not-allowed" 
                    data-instruction="${instructionIndex}" 
                    data-stage="${stage}"
                    title="${blockReason}">
                    <span class="text-xs text-gray-500">Blocked</span>
                </td>
            `;
        }
        
        // Default case - not clickable, not completed
        return `
            <td class="text-center" 
                data-instruction="${instructionIndex}" 
                data-stage="${stage}">
            </td>
        `;
    }

    // Format physical registers for display
    formatPhysicalRegisters(instruction) {
        if (!instruction.physDest && !instruction.physSrc1 && !instruction.physSrc2) {
            return '<span class="text-gray-400">Not issued</span>';
        }

        const parts = [];
        
        if (instruction.physDest) {
            parts.push(`${instruction.dest}→<span class="font-semibold text-blue-600">${instruction.physDest}</span>`);
        }
        
        if (instruction.physSrc1) {
            parts.push(`${instruction.src1}→<span class="font-semibold text-green-600">${instruction.physSrc1}</span>`);
        }
        
        if (instruction.physSrc2) {
            parts.push(`${instruction.src2}→<span class="font-semibold text-green-600">${instruction.physSrc2}</span>`);
        }
        
        return parts.join('<br>');
    }
    
    // Helper method to get the action key for pending actions
    getActionKey(instructionIndex, stage) {
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

    setupCellEventListeners() {
        const cells = this.container.querySelectorAll('td[data-instruction]');
        cells.forEach(cell => {
            cell.addEventListener('click', () => {
                const instructionIndex = parseInt(cell.getAttribute('data-instruction'));
                const stage = cell.getAttribute('data-stage');
                
                if (this.onCellClick) {
                    this.onCellClick(instructionIndex, stage);
                }
            });
        });
    }

    formatInstruction(instruction) {
        if (instruction.type === INSTRUCTION_TYPES.LOAD) {
            return `${instruction.type} ${instruction.dest}, ${instruction.offset}(${instruction.src1})`;
        } else if (instruction.type === INSTRUCTION_TYPES.STORE) {
            return `${instruction.type} ${instruction.src2}, ${instruction.offset}(${instruction.src1})`;
        } else {
            // ALU instructions
            return `${instruction.type} ${instruction.dest}, ${instruction.src1}, ${instruction.src2 || ''}`;
        }
    }
}