// js/utils/feedbackGenerator.js

class RenamingFeedbackGenerator {
    constructor(scoreboard, validator) {
        this.scoreboard = scoreboard;
        this.validator = validator;
    }

    // Generate feedback for the current state
    generateCurrentStateFeedback() {
        const feedback = {
            message: "",
            type: "info" // info, error, success
        };
        
        // Basic information about the current cycle
        feedback.message = `Currently at cycle ${this.scoreboard.currentCycle}. `;
        
        // Check for possible actions
        const possibleActions = this.getPossibleActions();
        if (possibleActions.length > 0) {
            feedback.message += "Possible actions: " + possibleActions.join(", ");
            feedback.type = "info";
        } else {
            feedback.message += "No valid actions available. Consider advancing to the next cycle.";
            feedback.type = "info";
        }
        
        return feedback;
    }

    // Generate feedback for a specific instruction and stage with register renaming context
    generateActionFeedback(instructionIndex, stage) {
        const instruction = this.scoreboard.instructions[instructionIndex];
        const formattedInstruction = this.formatInstruction(instruction);
        
        switch (stage) {
            case INSTRUCTION_STAGES.ISSUE:
                let issueMessage = `Successfully issued ${formattedInstruction} in cycle ${this.scoreboard.currentCycle}.`;
                
                // Add register renaming information
                const renamingInfo = this.getRenamingInfo(instruction);
                if (renamingInfo) {
                    issueMessage += ` ${renamingInfo}`;
                }
                
                return {
                    message: issueMessage,
                    type: "success"
                };
                
            case INSTRUCTION_STAGES.READ_OPERANDS:
                let readMessage = `Successfully read operands for ${formattedInstruction} in cycle ${this.scoreboard.currentCycle}.`;
                
                // Add physical register information
                const operandInfo = this.getOperandInfo(instruction);
                if (operandInfo) {
                    readMessage += ` ${operandInfo}`;
                }
                
                return {
                    message: readMessage,
                    type: "success"
                };
                
            case INSTRUCTION_STAGES.EXECUTION_COMPLETE:
                return {
                    message: `Execution completed for ${formattedInstruction} in cycle ${this.scoreboard.currentCycle}.`,
                    type: "success"
                };
                
            case INSTRUCTION_STAGES.WRITE_RESULT:
                let writeMessage = `Result written for ${formattedInstruction} in cycle ${this.scoreboard.currentCycle}.`;
                
                // Add information about register freeing
                if (instruction.oldPhysDest) {
                    writeMessage += ` Physical register ${instruction.oldPhysDest} has been freed and returned to the free list.`;
                }
                
                return {
                    message: writeMessage,
                    type: "success"
                };
                
            default:
                return {
                    message: `Successfully updated ${instruction.type} instruction to ${stage} at cycle ${this.scoreboard.currentCycle}.`,
                    type: "success"
                };
        }
    }

    // Get register renaming information for an instruction
    getRenamingInfo(instruction) {
        let info = "";
        
        if (instruction.physDest) {
            info += `Destination ${instruction.dest} renamed to ${instruction.physDest}.`;
        }
        
        if (instruction.physSrc1) {
            info += ` Source ${instruction.src1} maps to ${instruction.physSrc1}.`;
        }
        
        if (instruction.physSrc2) {
            info += ` Source ${instruction.src2} maps to ${instruction.physSrc2}.`;
        }
        
        if (instruction.oldPhysDest) {
            info += ` Previous mapping ${instruction.dest}→${instruction.oldPhysDest} will be freed when instruction completes.`;
        }
        
        return info.trim();
    }

    // Get operand information for read operands stage
    getOperandInfo(instruction) {
        const operands = [];
        
        if (instruction.physSrc1) {
            operands.push(`${instruction.src1}(${instruction.physSrc1})`);
        }
        
        if (instruction.physSrc2) {
            operands.push(`${instruction.src2}(${instruction.physSrc2})`);
        }
        
        if (operands.length > 0) {
            return `Reading from physical registers: ${operands.join(", ")}.`;
        }
        
        return "";
    }

    // Helper method to format instruction for display in messages
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

    // Get list of all possible actions
    getPossibleActions() {
        const actions = [];
        
        for (let i = 0; i < this.scoreboard.instructions.length; i++) {
            const validActions = this.validator.getNextValidActions(i);
            for (const action of validActions) {
                actions.push(`${this.scoreboard.instructions[i].type} - ${action}`);
            }
        }
        
        return actions;
    }

    // Generate a hint for the user with register renaming context
    generateHint() {
        // Check for instructions that can advance to the next stage
        for (let i = 0; i < this.scoreboard.instructions.length; i++) {
            const instruction = this.scoreboard.instructions[i];
            const validActions = this.validator.getNextValidActions(i);
            
            if (validActions.length > 0) {
                const action = validActions[0];
                let hintMessage = `Hint: You can advance the ${instruction.type} instruction to the ${action} stage.`;
                
                // Add specific hints based on the action
                if (action === INSTRUCTION_STAGES.ISSUE) {
                    hintMessage += " This will perform register renaming and allocate new physical registers.";
                } else if (action === INSTRUCTION_STAGES.READ_OPERANDS) {
                    hintMessage += " This will read the mapped physical registers.";
                } else if (action === INSTRUCTION_STAGES.WRITE_RESULT) {
                    hintMessage += " This will write the result and free old physical registers.";
                }
                
                return {
                    message: hintMessage,
                    type: "info"
                };
            }
        }
        
        // Check for functional units with cycles remaining
        const busyUnits = this.scoreboard.functionalUnits.filter(fu => fu.busy && fu.cyclesRemaining > 0);
        if (busyUnits.length > 0) {
            return {
                message: "Hint: There are instructions still executing. Advance to the next cycle to decrease remaining execution cycles.",
                type: "info"
            };
        }
        
        // Check register renaming status
        const freeRegisters = this.scoreboard.freeList.length;
        const totalAllocated = this.scoreboard.nextPhysicalRegister;
        
        if (this.scoreboard.instructions.length === 0) {
            return {
                message: "Hint: Add some instructions to get started with register renaming simulation.",
                type: "info"
            };
        } else {
            let message = "Hint: Consider advancing to the next cycle.";
            
            if (freeRegisters > 0) {
                message += ` There are ${freeRegisters} freed physical registers available for reuse.`;
            }
            
            if (totalAllocated > 32) {
                message += ` ${totalAllocated - 32} additional physical registers have been allocated beyond the initial 32.`;
            }
            
            return {
                message: message,
                type: "info"
            };
        }
    }

    // Generate feedback about the current state of register renaming
    generateRenamingStatus() {
        const activeInstructions = this.scoreboard.instructions.filter(instr => 
            instr.status[INSTRUCTION_STAGES.ISSUE] !== null && 
            instr.status[INSTRUCTION_STAGES.WRITE_RESULT] === null
        );
        
        const allocatedRegs = activeInstructions.length;
        const freeRegs = this.scoreboard.freeList.length;
        const totalAllocated = this.scoreboard.nextPhysicalRegister;
        
        let message = `Register Renaming Status: ${allocatedRegs} physical registers currently allocated for active instructions. `;
        message += `${freeRegs} freed registers available for reuse. `;
        message += `Total physical registers allocated: ${totalAllocated}.`;
        
        if (allocatedRegs === 0) {
            message += " No WAR or WAW hazards possible with register renaming!";
        }
        
        return {
            message: message,
            type: "info"
        };
    }
}