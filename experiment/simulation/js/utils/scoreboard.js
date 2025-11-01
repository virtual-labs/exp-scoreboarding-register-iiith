// js/utils/scoreboard.js

class RenamingScoreboard {
    constructor() {
        this.currentCycle = 0;
        this.instructions = [];
        this.functionalUnits = JSON.parse(JSON.stringify(DEFAULT_FUNCTIONAL_UNITS));
        this.registerStatus = createDefaultRegisterStatus(); // Now tracks physical registers
        this.executionCycles = { ...DEFAULT_EXECUTION_CYCLES };
        this.simulationStarted = false;
        this.pendingActions = new Set(); // Track actions that must be performed in this cycle
        
        // Register renaming specific properties
        this.renameTable = createDefaultRenameTable();
        this.physicalRegisters = createInitialPhysicalRegisterFile();
        this.nextPhysicalRegister = 64; // Start allocating new registers from P64
        this.freeList = []; // Will be populated with P32-P63 initially
    }

    // Reset the scoreboard to initial state
    reset() {
        this.currentCycle = 0;
        this.instructions = [];
        this.functionalUnits = JSON.parse(JSON.stringify(DEFAULT_FUNCTIONAL_UNITS));
        this.registerStatus = createDefaultRegisterStatus();
        this.simulationStarted = false;
        this.pendingActions = new Set();
        
        // Reset register renaming structures
        this.renameTable = createDefaultRenameTable();
        this.physicalRegisters = createInitialPhysicalRegisterFile();
        this.nextPhysicalRegister = 64;
        this.freeList = [];
    }

    // Initialize free list with P32-P63 at startup
    startSimulation() {
        this.simulationStarted = true;
        this.currentCycle = 1; // Start at cycle 1
        
        // Initialize free list with the initially free registers (P32-P63)
        this.freeList = [];
        for (let i = 32; i < 64; i++) {
            this.freeList.push(`P${i}`);
        }
        
        // Initialize pending actions for cycle 1
        this.updatePendingActions();
    }

    // Restart the simulation - reset pipeline state but keep instructions
    restartSimulation() {
        if (!this.simulationStarted) {
            throw new Error("Cannot restart simulation that hasn't been started");
        }
        
        // Reset cycle and pipeline state
        this.currentCycle = 1; // Start at cycle 1
        this.pendingActions.clear();
        
    // Reset all instruction statuses but keep the instructions themselves
        this.instructions.forEach(instruction => {
            instruction.status = {
                [INSTRUCTION_STAGES.ISSUE]: null,
                [INSTRUCTION_STAGES.READ_OPERANDS]: null,
                [INSTRUCTION_STAGES.EXECUTION_COMPLETE]: null,
                [INSTRUCTION_STAGES.WRITE_RESULT]: null
            };
            
            // Clear the physical register allocations
            instruction.physDest = null;
            instruction.physSrc1 = null;
            instruction.physSrc2 = null;
        });
        
        // Reset functional units
        this.functionalUnits = JSON.parse(JSON.stringify(DEFAULT_FUNCTIONAL_UNITS));
        
        // Reset register renaming structures to initial state
        this.renameTable = createDefaultRenameTable();
        this.physicalRegisters = createInitialPhysicalRegisterFile();
        this.registerStatus = createDefaultRegisterStatus();
        this.nextPhysicalRegister = 32;
        this.freeList = [];
        
        // Update pending actions for the new cycle
        this.updatePendingActions();
    }
    stopSimulation() {
        this.simulationStarted = false;
        this.currentCycle = 0;
        this.pendingActions.clear();
        
        // Reset all instruction statuses
        this.instructions.forEach(instruction => {
            instruction.status = {
                [INSTRUCTION_STAGES.ISSUE]: null,
                [INSTRUCTION_STAGES.READ_OPERANDS]: null,
                [INSTRUCTION_STAGES.EXECUTION_COMPLETE]: null,
                [INSTRUCTION_STAGES.WRITE_RESULT]: null
            };
            
            // Clear the physical register allocations
            instruction.physDest = null;
            instruction.physSrc1 = null;
            instruction.physSrc2 = null;
        });
        
        // Reset functional units, register status, and rename structures
        this.functionalUnits = JSON.parse(JSON.stringify(DEFAULT_FUNCTIONAL_UNITS));
        this.registerStatus = createDefaultRegisterStatus();
        this.renameTable = createDefaultRenameTable();
        this.physicalRegisters = createInitialPhysicalRegisterFile();
        this.nextPhysicalRegister = 64;
        this.freeList = [];
    }
    
    // Allocate a new physical register
    allocatePhysicalRegister() {
        let newPhysReg;
        
        // First try to get a register from the free list (pick the smallest available)
        if (this.freeList.length > 0) {
            // Sort to ensure we get the smallest available register
            this.freeList.sort((a, b) => {
                const numA = parseInt(a.substring(1));
                const numB = parseInt(b.substring(1));
                return numA - numB;
            });
            newPhysReg = this.freeList.shift(); // Take from the beginning (smallest)
        } else {
            // If no free registers, allocate a new one beyond P63
            newPhysReg = `P${this.nextPhysicalRegister++}`;
            this.physicalRegisters[newPhysReg] = {
                status: PHYS_REG_STATUS.BUSY,
                value: null,
                instructionIndex: null,
                architecturalReg: null,
                readerCount: 0,
                writerCompleted: false
            };
        }
        
        // Mark the register as busy and reset its state
        this.physicalRegisters[newPhysReg].status = PHYS_REG_STATUS.BUSY;
        this.physicalRegisters[newPhysReg].readerCount = 0;
        this.physicalRegisters[newPhysReg].writerCompleted = false;
        this.physicalRegisters[newPhysReg].orphaned = false;
        return newPhysReg;
    }
    
    // Check if a register can be freed (only when it has no readers and is not mapped)
    tryFreePhysicalRegister(physReg) {
        if (this.physicalRegisters[physReg]) {
            const regInfo = this.physicalRegisters[physReg];
            regInfo.orphaned = true;
            
            // Can only free if no readers AND not currently mapped to any architectural register
            if (regInfo.readerCount === 0) {
                regInfo.status = PHYS_REG_STATUS.FREE;
                regInfo.instructionIndex = null;
                regInfo.architecturalReg = null;
                regInfo.writerCompleted = false;
                this.freeList.push(physReg);
                return true;
            }
        }
        return false;
    }
    
    // Increment reader count for a physical register
    addReaderToPhysicalRegister(physReg) {
        if (this.physicalRegisters[physReg]) {
            this.physicalRegisters[physReg].readerCount++;
        }
    }
    
    // Decrement reader count and try to free if it becomes orphaned
    removeReaderFromPhysicalRegister(physReg) {
        if (this.physicalRegisters[physReg]) {
            this.physicalRegisters[physReg].readerCount--;
            // Try to free if this was the last reader and the register is orphaned
            if (this.physicalRegisters[physReg].orphaned) this.tryFreePhysicalRegister(physReg);
        }
    }
    
    // Mark that the writer for this register has completed (just marks as READY)
    markWriterCompleted(physReg) {
        if (this.physicalRegisters[physReg]) {
            this.physicalRegisters[physReg].status = PHYS_REG_STATUS.READY;
            this.physicalRegisters[physReg].writerCompleted = true;
            // Note: We don't free the register here - it stays READY
        }
    }
    
    // Add a new instruction to the scoreboard
    addInstruction(instruction) {
        if (this.simulationStarted) {
            throw new Error("Cannot add instructions while simulation is running");
        }
        
        // Create a new instruction with empty status and no physical register allocations yet
        const newInstruction = {
            ...instruction,
            status: {
                [INSTRUCTION_STAGES.ISSUE]: null,
                [INSTRUCTION_STAGES.READ_OPERANDS]: null,
                [INSTRUCTION_STAGES.EXECUTION_COMPLETE]: null,
                [INSTRUCTION_STAGES.WRITE_RESULT]: null
            },
            // Physical register allocations (filled during issue)
            physDest: null,    // Physical register for destination
            physSrc1: null,    // Physical register for source 1
            physSrc2: null     // Physical register for source 2
        };
        this.instructions.push(newInstruction);
        return this.instructions.length - 1; // Return the index of the new instruction
    }
    
    // Update instruction order
    reorderInstructions(fromIndex, toIndex) {
        if (this.simulationStarted) {
            throw new Error("Cannot reorder instructions while simulation is running");
        }
        
        const [instruction] = this.instructions.splice(fromIndex, 1);
        this.instructions.splice(toIndex, 0, instruction);
    }
    
    // Remove an instruction
    removeInstruction(index) {
        if (this.simulationStarted) {
            throw new Error("Cannot remove instructions while simulation is running");
        }
        
        this.instructions.splice(index, 1);
    }

    // Get an available functional unit for the given instruction type
    getAvailableFunctionalUnit(instructionType) {
        const requiredUnitTypes = INSTRUCTION_TO_FUNCTIONAL_UNIT[instructionType];
        // Try to find any available unit that can handle this instruction type
        for (const unitType of requiredUnitTypes) {
            const unit = this.functionalUnits.find(u => u.name === unitType && !u.busy);
            if (unit) {
                return unit;
            }
        }
        return null;
    }

    // Check if a physical register is being written by any active functional unit
    isPhysicalRegisterBeingWritten(physReg) {
        return this.registerStatus[physReg] !== null;
    }

    // Update the instruction status to issue (with register renaming)
    issueInstruction(instructionIndex) {
        const instruction = this.instructions[instructionIndex];
        
        // Remove this action from pending actions
        this.pendingActions.delete(`issue-${instructionIndex}`);
        
        // Perform register renaming
        this.performRegisterRenaming(instructionIndex);
        
        // Update instruction status
        instruction.status[INSTRUCTION_STAGES.ISSUE] = this.currentCycle;
        
        // Get the appropriate functional unit
        const fuIndex = this.functionalUnits.findIndex(fu => {
            const requiredUnitTypes = INSTRUCTION_TO_FUNCTIONAL_UNIT[instruction.type];
            return requiredUnitTypes.includes(fu.name) && !fu.busy;
        });
        
        if (fuIndex === -1) {
            throw new Error("No available functional unit for instruction");
        }
        
        const fu = this.functionalUnits[fuIndex];
        
        // Update functional unit status with physical registers
        fu.busy = true;
        fu.op = instruction.type;
        fu.fi = instruction.physDest;
        fu.fj = instruction.physSrc1;
        fu.fk = instruction.physSrc2;
        
        // Update Qj, Qk based on physical register status
        fu.qj = instruction.physSrc1 ? this.registerStatus[instruction.physSrc1] : null;
        fu.qk = instruction.physSrc2 ? this.registerStatus[instruction.physSrc2] : null;
        
        // Update Rj, Rk flags (true if ready, false if waiting)
        fu.rj = instruction.physSrc1 ? (this.registerStatus[instruction.physSrc1] === null) : true;
        fu.rk = instruction.physSrc2 ? (this.registerStatus[instruction.physSrc2] === null) : true;
        
        // Set cycles remaining for execution
        fu.cyclesRemaining = this.executionCycles[instruction.type];
        
        // Update register result status for destination register
        if (instruction.physDest) {
            this.registerStatus[instruction.physDest] = fu.name;
            this.physicalRegisters[instruction.physDest].instructionIndex = instructionIndex;
        }
        
        return true;
    }
    
    // Perform register renaming for an instruction
    performRegisterRenaming(instructionIndex) {
        const instruction = this.instructions[instructionIndex];
        
        // FIRST: Handle destination register - check if old mapping can be freed
        let oldPhysReg = null;
        if (instruction.dest) {
            oldPhysReg = this.renameTable[instruction.dest];
            // This orphans the old physical register - try to free it immediately
            this.tryFreePhysicalRegister(oldPhysReg);
        }
        
        // SECOND: Map source registers through rename table and increment reader counts
        if (instruction.src1) {
            instruction.physSrc1 = this.renameTable[instruction.src1];
            this.addReaderToPhysicalRegister(instruction.physSrc1);
        } else {
            instruction.physSrc1 = null;
        }
        
        if (instruction.src2) {
            instruction.physSrc2 = this.renameTable[instruction.src2];
            this.addReaderToPhysicalRegister(instruction.physSrc2);
        } else {
            instruction.physSrc2 = null;
        }
        
        // THIRD: Allocate new physical register for destination
        if (instruction.dest) {
            // Allocate a new physical register (could be the same one we just freed!)
            instruction.physDest = this.allocatePhysicalRegister();
            
            // Update the rename table
            this.renameTable[instruction.dest] = instruction.physDest;
            
            // Update the physical register info
            this.physicalRegisters[instruction.physDest].architecturalReg = instruction.dest;
            this.physicalRegisters[instruction.physDest].instructionIndex = instructionIndex;
        }
    }

    // Update the instruction status to read operands
    readOperands(instructionIndex) {
        const instruction = this.instructions[instructionIndex];
        
        // Remove this action from pending actions
        this.pendingActions.delete(`read-${instructionIndex}`);
        
        // Find the functional unit for this instruction
        const fu = this.functionalUnits.find(unit => 
            unit.busy && unit.op === instruction.type && unit.fi === instruction.physDest
        );
        
        if (!fu) {
            throw new Error("Functional unit not found for instruction");
        }
        
        // Check if operands are ready (should be, since this is a pending action)
        if (!fu.rj || !fu.rk) {
            return false;
        }
        
        // Update instruction status
        instruction.status[INSTRUCTION_STAGES.READ_OPERANDS] = this.currentCycle;
        
        // Mark operands as read in the functional unit
        fu.rj = false; // Operands have been read
        fu.rk = false;
        
        // Decrement reader counts for source registers (we've read them, so no longer need them)
        if (instruction.physSrc1) {
            this.removeReaderFromPhysicalRegister(instruction.physSrc1);
        }
        if (instruction.physSrc2) {
            this.removeReaderFromPhysicalRegister(instruction.physSrc2);
        }
        
        return true;
    }

    // Update the instruction status to execution complete
    completeExecution(instructionIndex) {
        const instruction = this.instructions[instructionIndex];
        
        // Remove this action from pending actions
        this.pendingActions.delete(`exec-${instructionIndex}`);
        
        // Find the functional unit for this instruction
        const fu = this.functionalUnits.find(unit => 
            unit.busy && unit.op === instruction.type && unit.fi === instruction.physDest
        );
        
        if (!fu) {
            throw new Error("Functional unit not found for instruction");
        }
        
        // Check if execution cycles are complete
        if (fu.cyclesRemaining > 0) {
            return false;
        }
        
        // Update instruction status
        instruction.status[INSTRUCTION_STAGES.EXECUTION_COMPLETE] = this.currentCycle;
        
        return true;
    }

    // Update the instruction status to write result (with proper reference counting)
    writeResult(instructionIndex) {
        const instruction = this.instructions[instructionIndex];
        
        // Remove this action from pending actions
        this.pendingActions.delete(`write-${instructionIndex}`);
        
        // Find the functional unit for this instruction
        const fu = this.functionalUnits.find(unit => 
            unit.busy && unit.op === instruction.type && unit.fi === instruction.physDest
        );
        
        if (!fu) {
            throw new Error("Functional unit not found for instruction");
        }
        
        // Update instruction status
        instruction.status[INSTRUCTION_STAGES.WRITE_RESULT] = this.currentCycle;
        
        // Mark the destination physical register as ready and writer completed
        if (instruction.physDest) {
            this.physicalRegisters[instruction.physDest].status = PHYS_REG_STATUS.READY;
            this.markWriterCompleted(instruction.physDest);
        }
        
        // Clear the functional unit
        fu.busy = false;
        fu.op = null;
        fu.fi = null;
        fu.fj = null;
        fu.fk = null;
        fu.qj = null;
        fu.qk = null;
        fu.rj = true;
        fu.rk = true;
        fu.cyclesRemaining = 0;
        
        // Clear the register status entry for this destination
        if (instruction.physDest) {
            this.registerStatus[instruction.physDest] = null;
        }
        
        // Update Qj and Qk for all functional units that were waiting for this unit
        for (const unit of this.functionalUnits) {
            if (unit.busy) {
                if (unit.qj === fu.name) {
                    unit.qj = null;
                    unit.rj = true;
                }
                if (unit.qk === fu.name) {
                    unit.qk = null;
                    unit.rk = true;
                }
            }
        }
        
        return true;
    }

    // Advance to the next cycle
    advanceCycle() {
        // Check if there are any pending actions for the current cycle
        if (this.pendingActions.size > 0) {
            return {
                success: false,
                message: "Cannot advance to next cycle. There are pending actions that must be completed first."
            };
        }
        
        this.currentCycle++;
        
        // Decrement remaining execution cycles for all active functional units
        for (const fu of this.functionalUnits) {
            if (fu.busy && fu.cyclesRemaining > 0 && 
                this.getInstructionByFunctionalUnit(fu)?.status[INSTRUCTION_STAGES.READ_OPERANDS] !== null) {
                fu.cyclesRemaining--;
            }
        }
        
        // Update pending actions for the new cycle
        this.updatePendingActions();
        
        return {
            success: true,
            message: `Advanced to cycle ${this.currentCycle}`
        };
    }
    
    // Update the set of actions that must be performed in the current cycle
    updatePendingActions() {
        this.pendingActions.clear();
        
        // Check if any instruction was issued in this cycle
        const issuedThisCycle = this.instructions.some(instr => 
            instr.status[INSTRUCTION_STAGES.ISSUE] === this.currentCycle
        );
        
        // For issue actions, ensure in-order issue and only one issue per cycle
        if (!issuedThisCycle) {
            // Find the first non-issued instruction
            for (let i = 0; i < this.instructions.length; i++) {
                const instruction = this.instructions[i];
                
                if (instruction.status[INSTRUCTION_STAGES.ISSUE] === null) {
                    // Check if all previous instructions have been issued
                    let allPreviousIssued = true;
                    for (let j = 0; j < i; j++) {
                        if (this.instructions[j].status[INSTRUCTION_STAGES.ISSUE] === null) {
                            allPreviousIssued = false;
                            break;
                        }
                    }
                    
                    if (allPreviousIssued) {
                        // Check if this instruction can be issued (only structural hazards matter now)
                        const availableFU = this.getAvailableFunctionalUnit(instruction.type);
                        
                        if (availableFU) {
                            this.pendingActions.add(`issue-${i}`);
                            break; // Only add one issue action
                        }
                    }
                    
                    break; // Stop after finding first non-issued instruction
                }
            }
        }
        
        // Handle other action types
        for (let i = 0; i < this.instructions.length; i++) {
            const instruction = this.instructions[i];
            
            // Skip instructions that haven't been issued yet
            if (instruction.status[INSTRUCTION_STAGES.ISSUE] === null) {
                continue;
            }
            
            // Check for Read Operands (only RAW hazards matter now)
            if (instruction.status[INSTRUCTION_STAGES.READ_OPERANDS] === null && 
                instruction.status[INSTRUCTION_STAGES.ISSUE] < this.currentCycle) {
                
                const fu = this.getFunctionalUnitForInstruction(i);
                if (fu && fu.rj && fu.rk) {
                    this.pendingActions.add(`read-${i}`);
                }
            }
            
            // Check for Execution Complete
            if (instruction.status[INSTRUCTION_STAGES.EXECUTION_COMPLETE] === null && 
                instruction.status[INSTRUCTION_STAGES.READ_OPERANDS] !== null && 
                instruction.status[INSTRUCTION_STAGES.READ_OPERANDS] < this.currentCycle) {
                
                const fu = this.getFunctionalUnitForInstruction(i);
                if (fu && fu.cyclesRemaining === 0) {
                    this.pendingActions.add(`exec-${i}`);
                }
            }
            
            // Check for Write Result (no WAR hazards with renaming)
            if (instruction.status[INSTRUCTION_STAGES.WRITE_RESULT] === null && 
                instruction.status[INSTRUCTION_STAGES.EXECUTION_COMPLETE] !== null && 
                instruction.status[INSTRUCTION_STAGES.EXECUTION_COMPLETE] < this.currentCycle) {
                
                this.pendingActions.add(`write-${i}`);
            }
        }
    }

    // Get valid actions for an instruction (simplified due to eliminated hazards)
    getValidActionsForInstruction(instructionIndex) {
        const instruction = this.instructions[instructionIndex];
        const validActions = [];
        
        // Check each stage in order
        if (instruction.status[INSTRUCTION_STAGES.ISSUE] === null) {
            // Check if there is an available functional unit (no WAW hazards with renaming)
            const fu = this.getAvailableFunctionalUnit(instruction.type);
            
            // Check if all previous instructions have been issued (in-order issue)
            let allPreviousIssued = true;
            for (let i = 0; i < instructionIndex; i++) {
                if (this.instructions[i].status[INSTRUCTION_STAGES.ISSUE] === null) {
                    allPreviousIssued = false;
                    break;
                }
            }
            
            if (allPreviousIssued && fu) {
                validActions.push(INSTRUCTION_STAGES.ISSUE);
            }
        } else if (instruction.status[INSTRUCTION_STAGES.READ_OPERANDS] === null) {
            // Check if it's been at least one cycle since issue
            if (instruction.status[INSTRUCTION_STAGES.ISSUE] < this.currentCycle) {
                // Check if all source operands are available (RAW hazards)
                const fu = this.getFunctionalUnitForInstruction(instructionIndex);
                if (fu && fu.rj && fu.rk) {
                    validActions.push(INSTRUCTION_STAGES.READ_OPERANDS);
                }
            }
        } else if (instruction.status[INSTRUCTION_STAGES.EXECUTION_COMPLETE] === null) {
            // Check if execution has completed
            const fu = this.getFunctionalUnitForInstruction(instructionIndex);
            if (fu && fu.cyclesRemaining === 0 && 
                instruction.status[INSTRUCTION_STAGES.READ_OPERANDS] < this.currentCycle) {
                validActions.push(INSTRUCTION_STAGES.EXECUTION_COMPLETE);
            }
        } else if (instruction.status[INSTRUCTION_STAGES.WRITE_RESULT] === null) {
            // With register renaming, no WAR hazards exist
            if (instruction.status[INSTRUCTION_STAGES.EXECUTION_COMPLETE] < this.currentCycle) {
                validActions.push(INSTRUCTION_STAGES.WRITE_RESULT);
            }
        }
        
        return validActions;
    }

    // Helper method to get instruction by functional unit
    getInstructionByFunctionalUnit(fu) {
        return this.instructions.find(instr => 
            instr.physDest === fu.fi && 
            instr.type === fu.op
        );
    }
    
    // Helper method to get functional unit for instruction
    getFunctionalUnitForInstruction(instructionIndex) {
        const instruction = this.instructions[instructionIndex];
        return this.functionalUnits.find(unit =>
            unit.busy && unit.op === instruction.type && unit.fi === instruction.physDest
        );
    }

    // Update execution latency for an instruction type (only in edit mode)
    updateLatency(instructionType, newLatency) {
        if (this.simulationStarted) {
            return {
                success: false,
                message: "Cannot update latency during simulation. Stop the simulation to edit latencies.",
                oldLatency: this.executionCycles[instructionType]
            };
        }

        // Validate the instruction type
        if (!(instructionType in this.executionCycles)) {
            return {
                success: false,
                message: `Invalid instruction type: ${instructionType}`,
                oldLatency: null
            };
        }

        // Validate the new latency value
        if (typeof newLatency !== 'number' || newLatency < 1 || newLatency > 100) {
            return {
                success: false,
                message: "Latency must be a number between 1 and 100.",
                oldLatency: this.executionCycles[instructionType]
            };
        }

        const oldLatency = this.executionCycles[instructionType];

        // Update the execution cycles configuration
        this.executionCycles[instructionType] = newLatency;

        return {
            success: true,
            message: `Updated ${instructionType} latency from ${oldLatency} to ${newLatency} cycles.`,
            oldLatency: oldLatency
        };
    }
}